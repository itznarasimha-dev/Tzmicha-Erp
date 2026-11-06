import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import {
  DollarSign,
  Receipt,
  CreditCard,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Check,
  X,
  FileCheck,
  Eye,
  Calendar,
  Send,
  Download,
} from 'lucide-react';
import { Customer, SalesRemittanceEntry, Invoice } from '../../types';

export const FinanceReceivablesPaymentsView: React.FC = () => {
  const {
    customers,
    salesRemittances,
    invoices,
    salesOrders,
    recordCustomerPaymentReceipt,
    verifyCustomerRemittance,
  } = useErpStore();

  const [activeSubTab, setActiveSubTab] = useState<'receivables' | 'remittances'>('receivables');
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedRemittance, setSelectedRemittance] = useState<SalesRemittanceEntry | null>(null);
  const [discrepancyNote, setDiscrepancyNote] = useState('');

  // Form State
  const [targetCustomerId, setTargetCustomerId] = useState('');
  const [collectionAmount, setCollectionAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('neft_rtgs');
  const [transactionRef, setTransactionRef] = useState('');
  const [linkedOrderId, setLinkedOrderId] = useState('');
  const [linkedInvoiceId, setLinkedInvoiceId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [custPage, setCustPage] = useState(1);
  const [custPageSize, setCustPageSize] = useState(8);
  const [remPage, setRemPage] = useState(1);
  const [remPageSize, setRemPageSize] = useState(8);

  // ─── Filtered Customers ───
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (riskFilter === 'overdue' && c.currentOutstanding <= 0) return false;
      if (riskFilter === 'exceeded_limit' && c.currentOutstanding <= c.creditLimit) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.businessName.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [customers, riskFilter, searchTerm]);

  // ─── Filtered Remittances ───
  const filteredRemittances = useMemo(() => {
    return salesRemittances.filter((r) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          r.entryNumber.toLowerCase().includes(q) ||
          (r.customerName && r.customerName.toLowerCase().includes(q)) ||
          r.referenceNumber.toLowerCase().includes(q) ||
          r.salesUserName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [salesRemittances, searchTerm]);

  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice((custPage - 1) * custPageSize, custPage * custPageSize);
  }, [filteredCustomers, custPage, custPageSize]);

  const paginatedRemittances = useMemo(() => {
    return filteredRemittances.slice((remPage - 1) * remPageSize, remPage * remPageSize);
  }, [filteredRemittances, remPage, remPageSize]);

  // Metrics
  const receivablesSummary = useMemo(() => {
    const totalOutstanding = customers.reduce((s, c) => s + (c.currentOutstanding || 0), 0);
    const totalCreditLimit = customers.reduce((s, c) => s + (c.creditLimit || 0), 0);
    const totalCollectionsMonth = salesRemittances
      .filter((r) => r.type === 'collection_from_customer' && r.status === 'verified')
      .reduce((s, r) => s + r.amount, 0);
    const pendingVerificationCount = salesRemittances.filter((r) => r.status === 'pending_verification').length;
    return { totalOutstanding, totalCreditLimit, totalCollectionsMonth, pendingVerificationCount };
  }, [customers, salesRemittances]);

  const handleOpenRecordModal = (cust?: Customer) => {
    if (cust) {
      setTargetCustomerId(cust.id);
      setCollectionAmount(cust.currentOutstanding.toString());
    } else {
      setTargetCustomerId(customers[0]?.id || '');
      setCollectionAmount('50000');
    }
    setTransactionRef(`NEFT-${Date.now().toString().slice(-6)}`);
    setLinkedOrderId('');
    setLinkedInvoiceId('');
    setPaymentNotes('');
    setRecordModalOpen(true);
  };

  const handleSavePayment = () => {
    if (!targetCustomerId || !collectionAmount) return;
    const amt = Number(collectionAmount);
    if (isNaN(amt) || amt <= 0) return;

    recordCustomerPaymentReceipt(
      targetCustomerId,
      amt,
      paymentMode,
      transactionRef,
      linkedOrderId || undefined,
      linkedInvoiceId || undefined,
      paymentNotes || 'Direct customer collection recorded by Finance'
    );

    const cust = customers.find((c) => c.id === targetCustomerId);
    setSuccessToast(`Collection of ₹${amt.toLocaleString('en-IN')} successfully booked for ${cust?.name || 'Customer'}.`);
    setTimeout(() => setSuccessToast(null), 4000);
    setRecordModalOpen(false);
  };

  const handleVerifyRemittance = (rem: SalesRemittanceEntry, isApproved: boolean) => {
    verifyCustomerRemittance(rem.id, isApproved, isApproved ? undefined : (discrepancyNote || 'Amount discrepancy noted'));
    setSuccessToast(isApproved ? `Remittance ${rem.entryNumber} marked as Verified.` : `Remittance ${rem.entryNumber} marked as Discrepancy.`);
    setTimeout(() => setSuccessToast(null), 3500);
    setVerifyModalOpen(false);
    setSelectedRemittance(null);
  };

  return (
    <div className="space-y-5">
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <Badge variant="success" size="sm">Receipt Cleared</Badge>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Customer Payments &amp; Accounts Receivable
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Credit limits, trade aging, customer payment receipts, and sales field remittances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveSubTab('receivables')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeSubTab === 'receivables' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customer Dues ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('remittances')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeSubTab === 'remittances' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Collections &amp; Remittances ({salesRemittances.length})
            </button>
          </div>

          <Button variant="primary" size="sm" onClick={() => handleOpenRecordModal()}>
            <Plus className="w-4 h-4 mr-1" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="glass-card p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40">
          <span className="text-[10px] font-bold uppercase text-amber-800 block">Total Receivables Outstanding</span>
          <div className="text-xl font-black text-amber-950 font-mono mt-0.5">
            ₹{receivablesSummary.totalOutstanding.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-amber-700">Across {customers.length} business accounts</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40">
          <span className="text-[10px] font-bold uppercase text-emerald-800 block">Verified Collections (This Period)</span>
          <div className="text-xl font-black text-emerald-950 font-mono mt-0.5">
            ₹{receivablesSummary.totalCollectionsMonth.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-700">Bank advice verified</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-slate-200 bg-white">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Credit Limits Authorized</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
            ₹{receivablesSummary.totalCreditLimit.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">Total exposure cap</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-purple-200 bg-purple-50/40">
          <span className="text-[10px] font-bold uppercase text-purple-800 block">Remittances Awaiting Check</span>
          <div className="text-xl font-black text-purple-950 font-mono mt-0.5">
            {receivablesSummary.pendingVerificationCount} Pending
          </div>
          <span className="text-[10px] text-purple-700">Field agent deposit slips</span>
        </div>
      </div>

      {/* ─── SEARCH & FILTER ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="flex-1 max-w-sm">
          <SearchInput
            value={searchTerm}
            onChange={(val) => setSearchTerm(val)}
            placeholder={activeSubTab === 'receivables' ? "Search customer name, code, contact..." : "Search remittance #, customer, UTR..."}
            className="text-xs"
          />
        </div>

        {activeSubTab === 'receivables' && (
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="all">All Accounts</option>
            <option value="overdue">With Outstanding Dues (&gt;0)</option>
            <option value="exceeded_limit">Credit Limit Exceeded</option>
          </select>
        )}
      </div>

      {/* ─── SUB-TAB 1: CUSTOMER RECEIVABLES ─── */}
      {activeSubTab === 'receivables' ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">Customer ID &amp; Name</th>
                  <th className="py-3 px-4">Business &amp; GSTIN</th>
                  <th className="py-3 px-4">Payment Terms</th>
                  <th className="py-3 px-4 text-right">Credit Limit</th>
                  <th className="py-3 px-4 text-right">Outstanding Balance</th>
                  <th className="py-3 px-4" style={{ minWidth: '130px' }}>Credit Utilization</th>
                  <th className="py-3 px-4 text-center">Risk Tier</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      No customer accounts matching filter.
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((c) => {
                    const utilPercent = c.creditLimit > 0 ? (c.currentOutstanding / c.creditLimit) * 100 : 0;
                    const isExceeded = c.currentOutstanding > c.creditLimit;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{c.name}</span>
                          <span className="text-[10px] text-indigo-600 font-mono block">{c.id}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-800 font-medium block">{c.businessName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{c.gstin || 'Unregistered'}</span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-600">
                          {c.paymentTerms || 'Net 30 Days'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700 font-semibold">
                          ₹{c.creditLimit.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black">
                          {c.currentOutstanding > 0 ? (
                            <span className={isExceeded ? 'text-rose-600' : 'text-amber-900'}>
                              ₹{c.currentOutstanding.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-slate-400">₹0</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span>{utilPercent.toFixed(0)}%</span>
                              <span className={isExceeded ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                                {isExceeded ? 'Exceeded' : 'Safe'}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isExceeded ? 'bg-rose-500' : utilPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, utilPercent)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            size="sm"
                            variant={isExceeded ? 'danger' : c.currentOutstanding > 0 ? 'warning' : 'success'}
                          >
                            {isExceeded ? 'High Risk' : c.currentOutstanding > 0 ? 'Normal' : 'Cleared'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedCustomer(c)}
                              className="h-7 text-xs px-2"
                              title="View Customer Ledgers"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Ledger
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleOpenRecordModal(c)}
                              className="h-7 text-xs px-2"
                            >
                              Collect
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

          {filteredCustomers.length > custPageSize && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/40">
              <Pagination
                currentPage={custPage}
                totalPages={Math.ceil(filteredCustomers.length / custPageSize)}
                totalItems={filteredCustomers.length}
                itemsPerPage={custPageSize}
                onPageChange={setCustPage}
                onItemsPerPageChange={(size) => {
                  setCustPageSize(size);
                  setCustPage(1);
                }}
              />
            </div>
          )}
        </Card>
      ) : (
        /* ─── SUB-TAB 2: REMITTANCES LEDGER ─── */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">Remittance #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Sales Collector</th>
                  <th className="py-3 px-4">Payment Mode &amp; Ref</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-center">Verification Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredRemittances.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      No remittances recorded.
                    </td>
                  </tr>
                ) : (
                  paginatedRemittances.map((rem) => (
                    <tr key={rem.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {rem.entryNumber}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        {rem.date}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{rem.customerName || 'Direct Deposit'}</span>
                        <span className="text-[10px] text-slate-400">{rem.companyBankAccount || 'HDFC Central Escrow'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block text-[11px]">{rem.salesUserName}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{rem.userRole}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 block uppercase text-[11px]">{rem.paymentMode.replace('_', ' ')}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{rem.referenceNumber}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 text-sm">
                        ₹{rem.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          size="sm"
                          variant={
                            rem.status === 'verified'
                              ? 'success'
                              : rem.status === 'discrepancy'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {rem.status === 'verified' ? 'Verified' : rem.status === 'discrepancy' ? 'Discrepancy' : 'Pending Check'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {rem.status === 'pending_verification' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRemittance(rem);
                                setVerifyModalOpen(true);
                              }}
                              className="h-7 text-xs px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                            >
                              <X className="w-3.5 h-3.5 mr-0.5" />
                              Dispute
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleVerifyRemittance(rem, true)}
                              className="h-7 text-xs px-2"
                            >
                              <Check className="w-3.5 h-3.5 mr-0.5" />
                              Verify
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            {rem.verifiedByUserName ? `By ${rem.verifiedByUserName}` : 'Completed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredRemittances.length > remPageSize && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/40">
              <Pagination
                currentPage={remPage}
                totalPages={Math.ceil(filteredRemittances.length / remPageSize)}
                totalItems={filteredRemittances.length}
                itemsPerPage={remPageSize}
                onPageChange={setRemPage}
                onItemsPerPageChange={(size) => {
                  setRemPageSize(size);
                  setRemPage(1);
                }}
              />
            </div>
          )}
        </Card>
      )}

      {/* ─── RECORD PAYMENT COLLECTION MODAL ─── */}
      {recordModalOpen && (
        <Modal
          isOpen={recordModalOpen}
          onClose={() => setRecordModalOpen(false)}
          title="Record Customer Payment Receipt"
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block">Select Customer</label>
                <select
                  value={targetCustomerId}
                  onChange={(e) => setTargetCustomerId(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none cursor-pointer"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Due: ₹{c.currentOutstanding.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="NEFT / RTGS Wire">NEFT / RTGS Wire Transfer</option>
                  <option value="Company UPI">Company UPI / QR</option>
                  <option value="Cheque">Account Payee Cheque</option>
                  <option value="Cash Receipt">Cash Counterfoil Receipt</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block">Collection Amount (₹)</label>
                <input
                  type="number"
                  value={collectionAmount}
                  onChange={(e) => setCollectionAmount(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. 50000"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block">Bank Transaction Ref / UTR #</label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono text-slate-900 focus:outline-none"
                  placeholder="e.g. UTR-HDFC-99120"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block">Link to Sales Order (Optional)</label>
                <select
                  value={linkedOrderId}
                  onChange={(e) => setLinkedOrderId(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="">None / General Advance Payment</option>
                  {salesOrders
                    .filter((o) => o.customerId === targetCustomerId)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} (₹{o.totalAmount.toLocaleString('en-IN')})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block">Link to Invoice (Optional)</label>
                <select
                  value={linkedInvoiceId}
                  onChange={(e) => setLinkedInvoiceId(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="">None / Allocate by FIFO</option>
                  {invoices
                    .filter((i) => i.customerId === targetCustomerId && i.outstandingBalance > 0)
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.invoiceNumber} (Due: ₹{i.outstandingBalance.toLocaleString('en-IN')})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Finance Collection Remarks</label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none"
                placeholder="e.g. Direct bank credit verified on HDFC portal"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setRecordModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSavePayment}>
                <Check className="w-4 h-4 mr-1" />
                Book Payment Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── DISPUTE REMITTANCE MODAL ─── */}
      {verifyModalOpen && selectedRemittance && (
        <Modal
          isOpen={verifyModalOpen}
          onClose={() => setVerifyModalOpen(false)}
          title={`Flag Discrepancy for ${selectedRemittance.entryNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <p className="text-slate-600">
              Please enter the discrepancy rationale or reason why this payment remittance cannot be verified against the corporate bank statement.
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
              <div className="flex justify-between font-medium">
                <span>Remittance Amount:</span>
                <span className="font-mono font-bold">₹{selectedRemittance.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Claimed Reference:</span>
                <span className="font-mono">{selectedRemittance.referenceNumber}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Discrepancy Note (Mandatory)</label>
              <textarea
                value={discrepancyNote}
                onChange={(e) => setDiscrepancyNote(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                rows={3}
                placeholder="e.g. UTR not reflected on bank statement. Counterfoil image illegible."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setVerifyModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleVerifyRemittance(selectedRemittance, false)}
                disabled={!discrepancyNote.trim()}
              >
                Flag Discrepancy
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── CUSTOMER LEDGER MODAL ─── */}
      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title={`Customer Ledger: ${selectedCustomer.name}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Outstanding Dues</span>
                <span className="text-base font-black text-rose-600 font-mono">
                  ₹{selectedCustomer.currentOutstanding.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Credit Limit</span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  ₹{selectedCustomer.creditLimit.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Payment Terms</span>
                <span className="text-sm font-semibold text-indigo-700">
                  {selectedCustomer.paymentTerms || 'Net 30 Days'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-900 block mb-2">Linked Invoices &amp; Receipts</span>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 font-semibold text-[10px]">
                      <th className="py-2 px-3">Invoice #</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-right">Invoiced</th>
                      <th className="py-2 px-3 text-right">Paid</th>
                      <th className="py-2 px-3 text-right">Balance</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices
                      .filter((i) => i.customerId === selectedCustomer.id)
                      .map((inv) => (
                        <tr key={inv.id}>
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">{inv.invoiceNumber}</td>
                          <td className="py-2 px-3 text-slate-500">{inv.invoiceDate}</td>
                          <td className="py-2 px-3 text-right font-mono">₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-700">₹{inv.paidAmount.toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">₹{inv.outstandingBalance.toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3 text-center">
                            <Badge size="sm" variant={inv.paymentStatus === 'paid' ? 'success' : 'warning'}>
                              {inv.paymentStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>
                Close Ledger
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
