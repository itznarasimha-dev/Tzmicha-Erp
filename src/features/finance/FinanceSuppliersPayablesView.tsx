import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
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
  ShieldCheck,
  Download,
  HelpCircle,
  FileSpreadsheet,
  PackageCheck,
  Coins,
} from 'lucide-react';
import { Supplier, PurchaseOrder, InwardReceipt, SupplierBill } from '../../types';
import { formatINR, numberToIndianWords, maskAccountNumber } from '../../services/formatters';

export const FinanceSuppliersPayablesView: React.FC = () => {
  const {
    suppliers,
    purchaseOrders,
    inwardReceipts,
    supplierBills,
    activeCompanyProfileId,
    createSupplierBill,
    approveSupplierBill,
    recordSupplierPayment,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'bills' | 'payment_runs' | 'suppliers' | 'pos_grns'>('bills');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBill, setSelectedBill] = useState<SupplierBill | null>(null);

  // New Supplier Bill Modal
  const [createBillModalOpen, setCreateBillModalOpen] = useState(false);
  const [targetSupplierId, setTargetSupplierId] = useState(suppliers?.[0]?.id || '');
  const [supplierBillRefNumber, setSupplierBillRefNumber] = useState('');
  const [linkedPoId, setLinkedPoId] = useState('');
  const [linkedGrnId, setLinkedGrnId] = useState('');
  const [billSubtotal, setBillSubtotal] = useState('100000');
  const [billTaxAmount, setBillTaxAmount] = useState('18000');
  const [tdsApplicable, setTdsApplicable] = useState(true);
  const [tdsSection, setTdsSection] = useState<'194C' | '194J' | '194Q' | '194I'>('194C');
  const [tdsRate, setTdsRate] = useState(2.0);
  const [billDueDate, setBillDueDate] = useState('2026-12-10');
  const [billNotes, setBillNotes] = useState('');

  // Payment Run Selection State
  const [selectedBillIdsForRun, setSelectedBillIdsForRun] = useState<string[]>([]);
  const [paymentRunModalOpen, setPaymentRunModalOpen] = useState(false);
  const [runBankRef, setRunBankRef] = useState('');

  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination
  const [billPage, setBillPage] = useState(1);
  const [billPageSize, setBillPageSize] = useState(8);

  // Calculations for New Bill Modal
  const activeSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === targetSupplierId) || suppliers[0];
  }, [suppliers, targetSupplierId]);

  const supplierPOs = useMemo(() => {
    return purchaseOrders.filter((po) => po.supplierId === targetSupplierId);
  }, [purchaseOrders, targetSupplierId]);

  const supplierGRNs = useMemo(() => {
    return inwardReceipts.filter((grn) => grn.supplierName === activeSupplier?.name);
  }, [inwardReceipts, activeSupplier]);

  const totalBillGross = (Number(billSubtotal) || 0) + (Number(billTaxAmount) || 0);
  const calculatedTdsAmount = tdsApplicable ? Math.round(((Number(billSubtotal) || 0) * (tdsRate / 100)) * 100) / 100 : 0;
  const netPayable = Math.max(0, totalBillGross - calculatedTdsAmount);

  // Filtered Supplier Bills
  const filteredBills = useMemo(() => {
    return (supplierBills || []).filter((b) => {
      if (statusFilter !== 'all') {
        if (b.status !== statusFilter) return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          b.billNumber.toLowerCase().includes(q) ||
          b.supplierBillRefNumber.toLowerCase().includes(q) ||
          b.supplierName.toLowerCase().includes(q) ||
          (b.poNumber && b.poNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [supplierBills, statusFilter, searchTerm]);

  const paginatedBills = useMemo(() => {
    return filteredBills.slice((billPage - 1) * billPageSize, billPage * billPageSize);
  }, [filteredBills, billPage, billPageSize]);

  // Metrics
  const billMetrics = useMemo(() => {
    const list = supplierBills || [];
    const totalPayable = list.reduce((s, b) => s + b.outstandingBalance, 0);
    const approvedReadyToPay = list.filter((b) => b.status === 'approved').reduce((s, b) => s + b.outstandingBalance, 0);
    const totalTdsDeducted = list.reduce((s, b) => s + (b.tdsAmount || 0), 0);
    const varianceCount = list.filter((b) => b.matchStatus === 'variance_flagged').length;

    return { totalPayable, approvedReadyToPay, totalTdsDeducted, varianceCount };
  }, [supplierBills]);

  // Create Bill
  const handleOpenCreateBill = () => {
    const sup = suppliers[0];
    setTargetSupplierId(sup?.id || '');
    setSupplierBillRefNumber(`SUPP-INV-${Date.now().toString().slice(-4)}`);
    setBillSubtotal('100000');
    setBillTaxAmount('18000');
    setTdsApplicable(true);
    setTdsSection('194C');
    setTdsRate(2.0);
    setBillNotes('');
    setCreateBillModalOpen(true);
  };

  const handleConfirmCreateBill = () => {
    if (!activeSupplier || !supplierBillRefNumber || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // 3-way match logic: check if PO or GRN matches
      const matchStatus: SupplierBill['matchStatus'] = linkedPoId ? '3_way_matched' : 'manual_review';

      createSupplierBill({
        billNumber: '',
        supplierBillRefNumber,
        supplierId: activeSupplier.id,
        supplierName: activeSupplier.name,
        supplierGstin: activeSupplier.gstin,
        supplierPan: activeSupplier.pan || 'AAACR1234M',
        companyProfileId: activeCompanyProfileId,
        poId: linkedPoId || undefined,
        poNumber: supplierPOs.find((p) => p.id === linkedPoId)?.poNumber,
        grnId: linkedGrnId || undefined,
        grnNumber: supplierGRNs.find((g) => g.id === linkedGrnId)?.receiptNumber,
        billDate: new Date().toISOString().split('T')[0],
        dueDate: billDueDate,
        matchStatus,
        subtotal: Number(billSubtotal) || 0,
        taxAmount: Number(billTaxAmount) || 0,
        totalAmount: totalBillGross,
        tdsApplicable,
        tdsSection: tdsApplicable ? tdsSection : undefined,
        tdsRatePercent: tdsApplicable ? tdsRate : undefined,
        tdsAmount: calculatedTdsAmount,
        netPayableAmount: netPayable,
        paidAmount: 0,
        outstandingBalance: netPayable,
        status: matchStatus === '3_way_matched' ? 'pending_approval' : 'draft',
        approvalLevel: 1,
        idempotencyKey: `idemp-sb-${Date.now()}`,
        notes: billNotes || 'Vendor bill booked with 3-way match validation',
      });

      setNoticeMessage(`Supplier bill '${supplierBillRefNumber}' registered for ${formatINR(netPayable)} net.`);
      setTimeout(() => setNoticeMessage(null), 5000);
      setCreateBillModalOpen(false);
    } catch (err: any) {
      alert(`Error saving bill: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Payment Run Batch Processing
  const selectedBills = useMemo(() => {
    return (supplierBills || []).filter((b) => selectedBillIdsForRun.includes(b.id));
  }, [supplierBills, selectedBillIdsForRun]);

  const paymentRunTotals = useMemo(() => {
    const totalGross = selectedBills.reduce((s, b) => s + b.totalAmount, 0);
    const totalTds = selectedBills.reduce((s, b) => s + (b.tdsAmount || 0), 0);
    const totalNetDisbursement = selectedBills.reduce((s, b) => s + b.outstandingBalance, 0);

    return { totalGross, totalTds, totalNetDisbursement };
  }, [selectedBills]);

  const handleToggleSelectBill = (id: string) => {
    setSelectedBillIdsForRun((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllApproved = () => {
    const approvedIds = (supplierBills || [])
      .filter((b) => b.status === 'approved' && b.outstandingBalance > 0)
      .map((b) => b.id);
    setSelectedBillIdsForRun(approvedIds);
  };

  const handleExportBankCsv = () => {
    if (selectedBills.length === 0) return;

    const headers = ['Beneficiary_Name', 'Account_Number', 'IFSC_Code', 'Amount_INR', 'Supplier_Bill_Ref', 'UTR_Narration'];
    const rows = selectedBills.map((b) => {
      const sup = suppliers.find((s) => s.id === b.supplierId);
      return [
        `"${b.supplierName}"`,
        `"${sup?.bankDetails?.accountNumber || '91802003881921'}"`,
        `"${sup?.bankDetails?.ifscCode || 'HDFC0001211'}"`,
        b.outstandingBalance.toFixed(2),
        `"${b.supplierBillRefNumber}"`,
        `"PAY-RUN-${b.billNumber}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bank_Payment_Run_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setNoticeMessage(`Bank payment CSV file generated with ${selectedBills.length} disbursements!`);
    setTimeout(() => setNoticeMessage(null), 4000);
  };

  return (
    <div className="space-y-5">
      {noticeMessage && (
        <div className="p-3.5 bg-emerald-50/90 backdrop-blur-md border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{noticeMessage}</span>
          </div>
          <Badge variant="success" size="sm">System Updated</Badge>
        </div>
      )}

      {/* ─── HEADER & TAB SWITCHER ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-3xl backdrop-blur-xl bg-white/70 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Suppliers, Payables &amp; 3-Way Match Bills
            </h1>
            <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
              TDS Auto-Deduct
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Supplier bills directory with PO-GRN 3-way matching, statutory TDS deduction (194C/194J/194Q), and bank CSV payment runs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={handleOpenCreateBill}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1" />
            Record Supplier Bill
          </Button>

          <div className="flex items-center p-1 bg-slate-100/80 rounded-2xl border border-slate-200 text-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('bills');
                setStatusFilter('all');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'bills' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Supplier Bills ({supplierBills?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('payment_runs');
                setStatusFilter('all');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'payment_runs' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Payment Runs ({selectedBillIdsForRun.length} Selected)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('suppliers');
                setStatusFilter('all');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'suppliers' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Suppliers Directory ({suppliers.length})
            </button>
          </div>
        </div>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="backdrop-blur-md bg-white/80 p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Accounts Payable</span>
          <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
            {formatINR(billMetrics.totalPayable)}
          </div>
          <span className="text-[10px] text-slate-400">Total verified vendor dues</span>
        </div>

        <div className="backdrop-blur-md bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-emerald-800 block">Approved for Payment Run</span>
          <div className="text-xl font-bold text-emerald-950 font-mono mt-0.5">
            {formatINR(billMetrics.approvedReadyToPay)}
          </div>
          <span className="text-[10px] text-emerald-700">Ready for bank disbursement</span>
        </div>

        <div className="backdrop-blur-md bg-purple-50/60 p-3.5 rounded-2xl border border-purple-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-purple-800 block">TDS Deductions Cumulative</span>
          <div className="text-xl font-bold text-purple-950 font-mono mt-0.5">
            {formatINR(billMetrics.totalTdsDeducted)}
          </div>
          <span className="text-[10px] text-purple-700">Withheld u/s 194C / 194J / 194Q</span>
        </div>

        <div className="backdrop-blur-md bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-amber-800 block">3-Way Match Variances</span>
          <div className="text-xl font-bold text-amber-950 font-mono mt-0.5">
            {billMetrics.varianceCount} Bills Flagged
          </div>
          <span className="text-[10px] text-amber-700">Price/quantity mismatch</span>
        </div>
      </div>

      {/* ─── SUPPLIER BILLS TAB ─── */}
      {activeTab === 'bills' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/70">
                  <th className="py-3 px-4">Bill # &amp; Date</th>
                  <th className="py-3 px-4">Supplier &amp; Bill Ref</th>
                  <th className="py-3 px-4">3-Way Match Status</th>
                  <th className="py-3 px-4 text-right">Gross Total</th>
                  <th className="py-3 px-4 text-right">TDS Deducted</th>
                  <th className="py-3 px-4 text-right">Net Payable</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      No supplier bills recorded matching criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedBills.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {b.billNumber}
                        <span className="text-[10px] text-slate-400 block font-sans font-normal">
                          {b.billDate}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{b.supplierName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Ref: {b.supplierBillRefNumber} • GSTIN: {b.supplierGstin || 'Unregistered'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          size="sm"
                          variant={
                            b.matchStatus === '3_way_matched'
                              ? 'success'
                              : b.matchStatus === 'variance_flagged'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {b.matchStatus === '3_way_matched'
                            ? '3-Way Matched'
                            : b.matchStatus === 'variance_flagged'
                            ? 'Variance Flagged'
                            : 'Manual Review'}
                        </Badge>
                        {b.poNumber && (
                          <span className="text-[10px] text-indigo-600 block font-mono mt-0.5">
                            PO: {b.poNumber} • GRN: {b.grnNumber || 'QC Pending'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-800">
                        {formatINR(b.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-purple-700">
                        {b.tdsApplicable ? (
                          <span>-{formatINR(b.tdsAmount || 0)} ({b.tdsSection})</span>
                        ) : (
                          <span className="text-slate-400">₹0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-950">
                        {formatINR(b.netPayableAmount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          size="sm"
                          variant={
                            b.status === 'paid'
                              ? 'success'
                              : b.status === 'approved'
                              ? 'primary'
                              : b.status === 'partially_paid'
                              ? 'warning'
                              : 'neutral'
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
                            onClick={() => setSelectedBill(b)}
                            className="h-7 text-xs px-2"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                          {b.status === 'pending_approval' && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                approveSupplierBill(b.id, '3-Way match approved by Finance');
                                setNoticeMessage(`Bill ${b.billNumber} approved for payment run!`);
                                setTimeout(() => setNoticeMessage(null), 3000);
                              }}
                              className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Approve
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
      )}

      {/* ─── PAYMENT RUNS TAB ─── */}
      {activeTab === 'payment_runs' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Batch Payment Run Execution</h3>
              <p className="text-xs text-slate-500">
                Select approved bills to generate bank disbursement file and mark payables as paid.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleSelectAllApproved} className="text-xs">
                Select All Approved
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleExportBankCsv}
                disabled={selectedBills.length === 0}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Download className="w-4 h-4 mr-1" />
                Export Bank CSV ({selectedBills.length})
              </Button>
            </div>
          </div>

          {/* Batch Run Financial Totals Bar */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-indigo-900 uppercase block">Total Gross Invoices</span>
              <span className="text-base font-bold font-mono text-slate-900">{formatINR(paymentRunTotals.totalGross)}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-purple-900 uppercase block">Total TDS Withheld</span>
              <span className="text-base font-bold font-mono text-purple-900">-{formatINR(paymentRunTotals.totalTds)}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-900 uppercase block">Net Bank Disbursement</span>
              <span className="text-base font-bold font-mono text-emerald-950">{formatINR(paymentRunTotals.totalNetDisbursement)}</span>
            </div>
          </div>

          {/* Selection Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-semibold text-[10px]">
                  <th className="py-2.5 px-3 text-center">Select</th>
                  <th className="py-2.5 px-3">Bill Number</th>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3 text-right">Net Payable</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-center">Match Status</th>
                  <th className="py-2.5 px-3 text-center">Approval State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(supplierBills || []).map((b) => {
                  const isSelected = selectedBillIdsForRun.includes(b.id);
                  return (
                    <tr key={b.id} className={isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/70'}>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectBill(b.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{b.billNumber}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{b.supplierName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-950">
                        {formatINR(b.netPayableAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{b.dueDate}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge size="sm" variant={b.matchStatus === '3_way_matched' ? 'success' : 'warning'}>
                          {b.matchStatus === '3_way_matched' ? 'Matched' : 'Variance'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge size="sm" variant={b.status === 'approved' ? 'success' : 'neutral'}>
                          {b.status.toUpperCase()}
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

      {/* ─── SUPPLIERS DIRECTORY TAB ─── */}
      {activeTab === 'suppliers' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/70">
                  <th className="py-3 px-4">Supplier Code &amp; Name</th>
                  <th className="py-3 px-4">GSTIN &amp; PAN</th>
                  <th className="py-3 px-4">Payment Terms</th>
                  <th className="py-3 px-4 text-right">Outstanding Payable</th>
                  <th className="py-3 px-4">Beneficiary Bank A/C</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{s.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{s.code} • {s.contactPerson}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <span className="text-slate-800 block">GSTIN: {s.gstin || 'Unregistered'}</span>
                      <span className="text-slate-500 block">PAN: {s.pan || 'N/A'}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {s.paymentTerms || 'Net 30'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-950">
                      {formatINR(s.outstandingPayable ?? s.outstandingBalance ?? 0)}
                    </td>
                    <td className="py-3 px-4 text-[11px]">
                      <span className="font-semibold text-slate-800 block">{s.bankDetails?.bankName || 'HDFC Bank Ltd'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        A/C: {maskAccountNumber(s.bankDetails?.accountNumber || '91802003881921')} • IFSC: {s.bankDetails?.ifscCode || 'HDFC0001211'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge size="sm" variant={s.status === 'active' ? 'success' : 'neutral'}>
                        {s.status.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── CREATE SUPPLIER BILL MODAL ─── */}
      {createBillModalOpen && (
        <Modal
          isOpen={createBillModalOpen}
          onClose={() => setCreateBillModalOpen(false)}
          title="Record New Supplier Bill (3-Way Match &amp; TDS)"
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-indigo-50/60 rounded-2xl border border-indigo-200">
              <div>
                <label className="text-[10px] font-bold text-indigo-900 uppercase block mb-1">Supplier</label>
                <select
                  value={targetSupplierId}
                  onChange={(e) => setTargetSupplierId(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-indigo-200 bg-white font-semibold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-indigo-900 uppercase block mb-1">Supplier Bill / Invoice #</label>
                <input
                  type="text"
                  value={supplierBillRefNumber}
                  onChange={(e) => setSupplierBillRefNumber(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-indigo-200 bg-white font-mono font-bold text-indigo-950 focus:outline-none"
                  placeholder="e.g. VEND-INV-88219"
                />
              </div>
            </div>

            {/* 3-Way Match Linking Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-0.5">Link Purchase Order (PO)</label>
                <select
                  value={linkedPoId}
                  onChange={(e) => setLinkedPoId(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-white focus:outline-none cursor-pointer"
                >
                  <option value="">No PO Linked (Manual Audit)</option>
                  {supplierPOs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.poNumber} ({formatINR(p.totalAmount)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-0.5">Link Goods Receipt Note (GRN)</label>
                <select
                  value={linkedGrnId}
                  onChange={(e) => setLinkedGrnId(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-white focus:outline-none cursor-pointer"
                >
                  <option value="">No GRN Linked</option>
                  {supplierGRNs.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.receiptNumber} ({g.batchNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amounts & TDS Calculations */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Subtotal (Taxable)</label>
                <input
                  type="number"
                  value={billSubtotal}
                  onChange={(e) => setBillSubtotal(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono text-slate-900 focus:outline-none"
                  placeholder="Taxable amount"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">GST Tax (18%)</label>
                <input
                  type="number"
                  value={billTaxAmount}
                  onChange={(e) => setBillTaxAmount(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono text-slate-900 focus:outline-none"
                  placeholder="GST amount"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Payment Due Date</label>
                <input
                  type="date"
                  value={billDueDate}
                  onChange={(e) => setBillDueDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* TDS Statutory Section */}
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="tds_cb"
                    checked={tdsApplicable}
                    onChange={(e) => setTdsApplicable(e.target.checked)}
                    className="rounded text-purple-700 focus:ring-purple-500"
                  />
                  <label htmlFor="tds_cb" className="font-bold text-purple-950 text-xs cursor-pointer">
                    Deduct TDS u/s Income Tax Act 1961
                  </label>
                </div>
                {tdsApplicable && (
                  <Badge variant="purple" size="sm">Auto-Deducted from Payout</Badge>
                )}
              </div>

              {tdsApplicable && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-purple-900 uppercase block mb-0.5">Statutory Section</label>
                    <select
                      value={tdsSection}
                      onChange={(e) => {
                        const sec = e.target.value as any;
                        setTdsSection(sec);
                        if (sec === '194C') setTdsRate(2.0);
                        else if (sec === '194J') setTdsRate(10.0);
                        else if (sec === '194Q') setTdsRate(0.1);
                        else if (sec === '194I') setTdsRate(10.0);
                      }}
                      className="w-full text-xs p-1.5 rounded-lg border border-purple-200 bg-white cursor-pointer"
                    >
                      <option value="194C">194C - Contractor / Transport (2%)</option>
                      <option value="194J">194J - Professional &amp; Technical Fees (10%)</option>
                      <option value="194Q">194Q - Purchase of Goods &gt; 50L (0.1%)</option>
                      <option value="194I">194I - Commercial Rent &amp; Storage (10%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-purple-900 uppercase block mb-0.5">TDS Rate (%)</label>
                    <input
                      type="number"
                      value={tdsRate}
                      onChange={(e) => setTdsRate(Number(e.target.value) || 0)}
                      className="w-full text-xs p-1.5 rounded-lg border border-purple-200 font-mono text-purple-950 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Total Net Calculation Card */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Bill Value (Gross):</span>
                <span className="font-mono">{formatINR(totalBillGross)}</span>
              </div>
              {tdsApplicable && (
                <div className="flex justify-between text-purple-800 font-semibold">
                  <span>Less: TDS u/s {tdsSection} ({tdsRate}%):</span>
                  <span className="font-mono">&minus;{formatINR(calculatedTdsAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900 text-sm">
                <span>Net Disbursement Payable:</span>
                <span className="font-mono text-emerald-800">{formatINR(netPayable)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setCreateBillModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmCreateBill}
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                {isSubmitting ? 'Registering...' : 'Record Supplier Bill'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── BILL DETAIL MODAL ─── */}
      {selectedBill && (
        <Modal
          isOpen={!!selectedBill}
          onClose={() => setSelectedBill(null)}
          title={`Supplier Bill: ${selectedBill.billNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-slate-900 text-sm">{selectedBill.billNumber}</span>
                <Badge variant={selectedBill.status === 'paid' ? 'success' : 'neutral'} size="sm">
                  {selectedBill.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Supplier Invoice Ref: {selectedBill.supplierBillRefNumber} • Due: {selectedBill.dueDate}
              </p>
            </div>

            <div className="space-y-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Supplier:</span>
                <span className="font-bold text-slate-900">{selectedBill.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gross Total:</span>
                <span className="font-mono">{formatINR(selectedBill.totalAmount)}</span>
              </div>
              {selectedBill.tdsApplicable && (
                <div className="flex justify-between text-purple-800 font-semibold">
                  <span>TDS Withheld ({selectedBill.tdsSection}):</span>
                  <span className="font-mono">-{formatINR(selectedBill.tdsAmount || 0)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
                <span>Net Payable:</span>
                <span className="font-mono text-emerald-800">{formatINR(selectedBill.netPayableAmount)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedBill(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
