import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import {
  FileText,
  Eye,
  Receipt,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Mail,
  Send,
  Printer,
  Calendar,
  Building2,
  ArrowUpRight,
  TrendingUp,
  FileCheck,
  Check,
  Percent,
} from 'lucide-react';
import { Invoice, Quotation, InvoiceStatus, InvoicePaymentStatus } from '../../types';

export const FinanceInvoicesQuotationsView: React.FC = () => {
  const {
    invoices,
    quotations,
    customers,
    salesOrders,
    recordCustomerPaymentReceipt,
    sendInvoiceEmail,
    sendInvoiceWhatsApp,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'invoices' | 'quotations'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('neft_rtgs');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [invPage, setInvPage] = useState(1);
  const [invPageSize, setInvPageSize] = useState(8);
  const [quotPage, setQuotPage] = useState(1);
  const [quotPageSize, setQuotPageSize] = useState(8);

  // ─── Filtered Invoices ───
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'unpaid' && inv.paymentStatus !== 'unpaid') return false;
        if (statusFilter === 'partially_paid' && inv.paymentStatus !== 'partially_paid') return false;
        if (statusFilter === 'paid' && inv.paymentStatus !== 'paid') return false;
        if (statusFilter === 'overdue') {
          const isOverdue = inv.paymentStatus !== 'paid' && new Date(inv.dueDate) < new Date();
          if (!isOverdue) return false;
        }
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          (inv.orderNumber && inv.orderNumber.toLowerCase().includes(q)) ||
          inv.createdByUserName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [invoices, statusFilter, searchTerm]);

  // ─── Filtered Quotations ───
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      if (statusFilter !== 'all') {
        if (q.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          q.quotationNo.toLowerCase().includes(term) ||
          q.customerName.toLowerCase().includes(term) ||
          q.senderCompany.toLowerCase().includes(term) ||
          (q.assignedSalesUserName && q.assignedSalesUserName.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [quotations, statusFilter, searchTerm]);

  const paginatedInvoices = useMemo(() => {
    return filteredInvoices.slice((invPage - 1) * invPageSize, invPage * invPageSize);
  }, [filteredInvoices, invPage, invPageSize]);

  const paginatedQuotations = useMemo(() => {
    return filteredQuotations.slice((quotPage - 1) * quotPageSize, quotPage * quotPageSize);
  }, [filteredQuotations, quotPage, quotPageSize]);

  // Summary Metrics
  const invoiceMetrics = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalCollected = invoices.reduce((sum, i) => sum + i.paidAmount, 0);
    const totalOutstanding = invoices.reduce((sum, i) => sum + i.outstandingBalance, 0);
    const overdueCount = invoices.filter((i) => i.paymentStatus !== 'paid' && new Date(i.dueDate) < new Date()).length;
    return { totalInvoiced, totalCollected, totalOutstanding, overdueCount };
  }, [invoices]);

  const quotationMetrics = useMemo(() => {
    const totalQuotes = quotations.length;
    const totalQuotedValue = quotations.reduce((sum, q) => sum + q.grandTotal, 0);
    const convertedCount = quotations.filter((q) => q.status === 'Converted' || q.status === 'Accepted').length;
    return { totalQuotes, totalQuotedValue, convertedCount };
  }, [quotations]);

  const handleOpenRecordPayment = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPaymentAmount(inv.outstandingBalance.toString());
    setPaymentRef(`UTR-${Date.now().toString().slice(-6)}`);
    setRecordPaymentModalOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedInvoice || !paymentAmount) return;
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) return;

    recordCustomerPaymentReceipt(
      selectedInvoice.customerId,
      amt,
      paymentMode,
      paymentRef,
      selectedInvoice.orderId,
      selectedInvoice.id,
      paymentNotes || 'Direct customer collection recorded by Finance'
    );

    setNoticeMessage(`Receipt of ₹${amt.toLocaleString('en-IN')} recorded successfully against ${selectedInvoice.invoiceNumber}.`);
    setTimeout(() => setNoticeMessage(null), 4000);
    setRecordPaymentModalOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {noticeMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{noticeMessage}</span>
          </div>
          <Badge variant="success" size="sm">Updated</Badge>
        </div>
      )}

      {/* ─── HEADER / BANNER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Commercial Invoices &amp; Quotations Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Finance verification of customer tax invoices and sales quotation pipeline. (Quotations do not constitute revenue).
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('invoices');
              setStatusFilter('all');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'invoices' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Invoices Register ({invoices.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('quotations');
              setStatusFilter('all');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'quotations' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sales Quotations ({quotations.length})
          </button>
        </div>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      {activeTab === 'invoices' ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="glass-card p-3.5 rounded-2xl border border-slate-200 bg-white">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Invoiced</span>
            <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
              ₹{invoiceMetrics.totalInvoiced.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-400">{invoices.length} total tax invoices</span>
          </div>
          <div className="glass-card p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40">
            <span className="text-[10px] font-bold uppercase text-emerald-800 block">Payments Collected</span>
            <div className="text-xl font-bold text-emerald-900 font-mono mt-0.5">
              ₹{invoiceMetrics.totalCollected.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-emerald-700">Verified receipts</span>
          </div>
          <div className="glass-card p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40">
            <span className="text-[10px] font-bold uppercase text-amber-800 block">Outstanding Receivables</span>
            <div className="text-xl font-bold text-amber-950 font-mono mt-0.5">
              ₹{invoiceMetrics.totalOutstanding.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-amber-700">Unpaid invoice dues</span>
          </div>
          <div className="glass-card p-3.5 rounded-2xl border border-rose-200 bg-rose-50/40">
            <span className="text-[10px] font-bold uppercase text-rose-800 block">Overdue Invoices</span>
            <div className="text-xl font-bold text-rose-950 font-mono mt-0.5">
              {invoiceMetrics.overdueCount} Invoices
            </div>
            <span className="text-[10px] text-rose-700">Exceeded credit payment terms</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="glass-card p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/40">
            <span className="text-[10px] font-bold uppercase text-indigo-800 block">Total Active Quotations</span>
            <div className="text-xl font-bold text-indigo-950 font-mono mt-0.5">
              {quotationMetrics.totalQuotes} Quotations
            </div>
            <span className="text-[10px] text-indigo-600">Pending customer purchase orders</span>
          </div>
          <div className="glass-card p-3.5 rounded-2xl border border-slate-200 bg-white">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Estimated Quotation Pipeline</span>
            <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
              ₹{quotationMetrics.totalQuotedValue.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-400">Not recognized as accounting revenue</span>
          </div>
          <div className="glass-card p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40">
            <span className="text-[10px] font-bold uppercase text-emerald-800 block">Successfully Converted</span>
            <div className="text-xl font-bold text-emerald-900 font-mono mt-0.5">
              {quotationMetrics.convertedCount} Converted
            </div>
            <span className="text-[10px] text-emerald-700">Converted into confirmed sales orders</span>
          </div>
        </div>
      )}

      {/* ─── FILTERS & SEARCH ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="flex-1 max-w-sm">
          <SearchInput
            value={searchTerm}
            onChange={(val) => setSearchTerm(val)}
            placeholder={activeTab === 'invoices' ? "Search invoice #, customer, order, creator..." : "Search quotation #, dealer, sales rep..."}
            className="text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'invoices' ? (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Payment Statuses</option>
              <option value="unpaid">Unpaid Only</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid in Full</option>
              <option value="overdue">Overdue Invoices</option>
            </select>
          ) : (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Quotation Statuses</option>
              <option value="sent">Sent to Customer</option>
              <option value="awaiting approval">Awaiting Approval</option>
              <option value="accepted">Accepted / Won</option>
              <option value="converted">Converted to Order</option>
              <option value="draft">Draft RFQ</option>
            </select>
          )}
        </div>
      </div>

      {/* ─── INVOICES TAB TABLE ─── */}
      {activeTab === 'invoices' ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Order / Batch Ref</th>
                  <th className="py-3 px-4 text-right">Invoice Value</th>
                  <th className="py-3 px-4 text-right">Paid Amount</th>
                  <th className="py-3 px-4 text-right">Outstanding</th>
                  <th className="py-3 px-4 text-center">Payment Status</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Created By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                      No invoices found matching criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((inv) => {
                    const isOverdue = inv.paymentStatus !== 'paid' && new Date(inv.dueDate) < new Date();
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{inv.customerName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{inv.customerId}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800 block font-mono">{inv.orderNumber || 'Direct Invoice'}</span>
                          {inv.items?.[0]?.batchNumber && (
                            <span className="text-[10px] text-indigo-600 font-mono block">
                              Batch: {inv.items[0].batchNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{inv.totalAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          ₹{inv.paidAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {inv.outstandingBalance > 0 ? (
                            <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-amber-700'}>
                              ₹{inv.outstandingBalance.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-slate-400">₹0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            size="sm"
                            variant={
                              inv.paymentStatus === 'paid'
                                ? 'success'
                                : isOverdue
                                ? 'danger'
                                : inv.paymentStatus === 'partially_paid'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {isOverdue && inv.paymentStatus !== 'paid' ? 'Overdue' : inv.paymentStatus.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-[11px]">
                          <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                            {inv.dueDate}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block text-[11px]">{inv.createdByUserName}</span>
                          <span className="text-[10px] text-slate-400 capitalize">{inv.createdByUserRole} ({inv.source.replace('_', ' ')})</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedInvoice(inv)}
                              className="h-7 text-xs px-2"
                              title="Inspect Invoice Details & Print Preview"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View
                            </Button>
                            {inv.outstandingBalance > 0 && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleOpenRecordPayment(inv)}
                                className="h-7 text-xs px-2"
                                title="Record verified customer collection"
                              >
                                Record Pay
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

          {filteredInvoices.length > invPageSize && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/40">
              <Pagination
                currentPage={invPage}
                totalPages={Math.ceil(filteredInvoices.length / invPageSize)}
                totalItems={filteredInvoices.length}
                itemsPerPage={invPageSize}
                onPageChange={setInvPage}
                onItemsPerPageChange={(size) => {
                  setInvPageSize(size);
                  setInvPage(1);
                }}
              />
            </div>
          )}
        </Card>
      ) : (
        /* ─── QUOTATIONS TAB TABLE ─── */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">Quotation #</th>
                  <th className="py-3 px-4">Customer / Inquiry</th>
                  <th className="py-3 px-4">Assigned Sales Rep</th>
                  <th className="py-3 px-4 text-center">Items Qty</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-right">Taxes &amp; Discounts</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4">Valid Until</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                      No quotations found matching criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedQuotations.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {q.quotationNo}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{q.customerName}</span>
                        <span className="text-[10px] text-slate-400">{q.senderCompany}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block text-[11px]">
                          {q.assignedSalesUserName || 'Unassigned'}
                        </span>
                        <span className="text-[10px] text-slate-400">Created: {q.createdDate}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {q.items.reduce((s, it) => s + it.qty, 0)} units ({q.items.length} SKUs)
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                        ₹{q.subtotal.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right text-[11px] font-mono">
                        <span className="text-emerald-700 font-semibold block">-₹{q.discountTotal.toLocaleString('en-IN')} Disc</span>
                        <span className="text-slate-400 block">+₹{q.taxTotal.toLocaleString('en-IN')} GST</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-indigo-950">
                        ₹{q.grandTotal.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        {q.validUntil}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          size="sm"
                          variant={
                            q.status === 'Converted' || q.status === 'Accepted'
                              ? 'success'
                              : q.status === 'Sent'
                              ? 'primary'
                              : q.status === 'Awaiting Approval'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {q.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedQuotation(q)}
                          className="h-7 text-xs px-2"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredQuotations.length > quotPageSize && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/40">
              <Pagination
                currentPage={quotPage}
                totalPages={Math.ceil(filteredQuotations.length / quotPageSize)}
                totalItems={filteredQuotations.length}
                itemsPerPage={quotPageSize}
                onPageChange={setQuotPage}
                onItemsPerPageChange={(size) => {
                  setQuotPageSize(size);
                  setQuotPage(1);
                }}
              />
            </div>
          )}
        </Card>
      )}

      {/* ─── INVOICE DETAIL & PRINT PREVIEW MODAL ─── */}
      {selectedInvoice && (
        <Modal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={`Tax Invoice: ${selectedInvoice.invoiceNumber}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs text-slate-800">
            {/* Invoice Top Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-mono">
                  {selectedInvoice.invoiceNumber}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  ApexFlow ERP &amp; Tzmicha Chemicals Ltd • GSTIN: 07AAACT1122D1Z0
                </p>
                <p className="text-[10px] text-indigo-600 font-mono mt-0.5">
                  Order Ref: {selectedInvoice.orderNumber || 'N/A'} • Source: {selectedInvoice.source.replace('_', ' ')}
                </p>
              </div>
              <div className="text-right">
                <Badge
                  variant={
                    selectedInvoice.paymentStatus === 'paid'
                      ? 'success'
                      : selectedInvoice.paymentStatus === 'partially_paid'
                      ? 'warning'
                      : 'danger'
                  }
                  size="md"
                >
                  {selectedInvoice.paymentStatus.toUpperCase()}
                </Badge>
                <div className="text-[10px] text-slate-500 mt-1">Due: {selectedInvoice.dueDate}</div>
              </div>
            </div>

            {/* Billed To / Shipped To */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
              <div>
                <span className="font-bold text-slate-400 uppercase text-[9px] block">Billed To Customer</span>
                <span className="font-bold text-slate-900 block text-xs mt-0.5">{selectedInvoice.customerName}</span>
                <span className="text-slate-500 block">ID: {selectedInvoice.customerId}</span>
                <span className="text-slate-500 block">GSTIN: {selectedInvoice.customerGstin || 'Unregistered'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 uppercase text-[9px] block">Invoice Dates &amp; Creator</span>
                <span className="text-slate-700 block mt-0.5">Invoice Date: {selectedInvoice.invoiceDate}</span>
                <span className="text-slate-700 block">Created By: {selectedInvoice.createdByUserName} ({selectedInvoice.createdByUserRole})</span>
                {selectedInvoice.paymentReference && (
                  <span className="text-emerald-700 font-semibold block font-mono">
                    Payment Ref: {selectedInvoice.paymentReference}
                  </span>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-semibold text-[10px]">
                    <th className="py-2 px-3">Item SKU &amp; Product</th>
                    <th className="py-2 px-3">Batch #</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Rate</th>
                    <th className="py-2 px-3 text-right">Tax</th>
                    <th className="py-2 px-3 text-right">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {selectedInvoice.items?.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2 px-3">
                        <span className="font-bold text-slate-900 block">{it.productName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{it.productSku}</span>
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-indigo-700">
                        {it.batchNumber || 'Batch-Gen'}
                      </td>
                      <td className="py-2 px-3 text-center font-bold">{it.quantity} {it.unit}</td>
                      <td className="py-2 px-3 text-right font-mono">₹{it.unitPrice.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3 text-right font-mono text-[11px] text-slate-500">
                        {it.taxRatePercent}% (₹{it.taxAmount.toLocaleString('en-IN')})
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{it.netAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Calculations */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{selectedInvoice.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST Taxes:</span>
                  <span className="font-mono">₹{selectedInvoice.totalTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold text-sm border-t border-slate-200 pt-1">
                  <span>Total Payable:</span>
                  <span className="font-mono">₹{selectedInvoice.totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold border-b border-slate-200 pb-1">
                  <span>Paid to Date:</span>
                  <span className="font-mono">₹{selectedInvoice.paidAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-bold text-sm pt-0.5">
                  <span>Balance Due:</span>
                  <span className="font-mono">₹{selectedInvoice.outstandingBalance.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Tax Invoice
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    sendInvoiceEmail(selectedInvoice.id);
                    setNoticeMessage(`Simulated Tax Invoice email sent to ${selectedInvoice.customerEmail || 'client@firm.com'}`);
                    setTimeout(() => setNoticeMessage(null), 3000);
                  }}
                >
                  <Mail className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                  Email Copy
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(null)}>
                  Close
                </Button>
                {selectedInvoice.outstandingBalance > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedInvoice(null);
                      handleOpenRecordPayment(selectedInvoice);
                    }}
                  >
                    Record Payment
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── QUOTATION DETAIL MODAL ─── */}
      {selectedQuotation && (
        <Modal
          isOpen={!!selectedQuotation}
          onClose={() => setSelectedQuotation(null)}
          title={`Sales Quotation: ${selectedQuotation.quotationNo}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-mono">
                  {selectedQuotation.quotationNo}
                </h3>
                <p className="text-xs text-slate-500">
                  Client: {selectedQuotation.customerName} ({selectedQuotation.senderCompany})
                </p>
                <p className="text-[10px] text-indigo-600 font-mono mt-0.5">
                  Assigned Sales Rep: {selectedQuotation.assignedSalesUserName || 'Unassigned'}
                </p>
              </div>
              <Badge variant="primary" size="md">
                {selectedQuotation.status}
              </Badge>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px]">
              <strong>Notice:</strong> Quotations represent formal customer price inquiries and proposed commercial terms. Quotations do not constitute recognized revenue or accounts receivable until an official order is verified and dispatched.
            </div>

            {/* Quotation Items */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-semibold text-[10px]">
                    <th className="py-2 px-3">Product Name</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Discount</th>
                    <th className="py-2 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {selectedQuotation.items.map((it) => (
                    <tr key={it.productId}>
                      <td className="py-2 px-3 font-semibold text-slate-900">{it.productName}</td>
                      <td className="py-2 px-3 text-center font-bold">{it.qty}</td>
                      <td className="py-2 px-3 text-right font-mono">₹{it.unitPrice.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3 text-right text-emerald-700 font-semibold">{it.discountPercent}%</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">₹{it.lineTotal.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 text-xs">
              <div className="w-64 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{selectedQuotation.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount:</span>
                  <span className="font-mono">-₹{selectedQuotation.discountTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Estimated Tax:</span>
                  <span className="font-mono">+₹{selectedQuotation.taxTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold text-sm border-t border-slate-200 pt-1">
                  <span>Quoted Total:</span>
                  <span className="font-mono">₹{selectedQuotation.grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedQuotation(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── RECORD PAYMENT REMITTANCE MODAL ─── */}
      {recordPaymentModalOpen && selectedInvoice && (
        <Modal
          isOpen={recordPaymentModalOpen}
          onClose={() => setRecordPaymentModalOpen(false)}
          title={`Record Payment for ${selectedInvoice.invoiceNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{selectedInvoice.customerName}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-500">Total Invoice:</span>
                <span className="font-mono font-bold">₹{selectedInvoice.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between mt-1 text-rose-600 font-semibold">
                <span>Outstanding Dues:</span>
                <span className="font-mono font-bold">₹{selectedInvoice.outstandingBalance.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Payment Amount (₹)</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Enter collected amount"
                max={selectedInvoice.outstandingBalance}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="neft_rtgs">NEFT / RTGS Wire</option>
                  <option value="upi">Company UPI / QR</option>
                  <option value="cheque">Account Payee Cheque</option>
                  <option value="cash">Petty Cash Counterfoil</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block">Bank Ref / UTR #</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono text-slate-900 focus:outline-none"
                  placeholder="e.g. UTR-998822"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Finance Verification Notes</label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none"
                placeholder="Optional notes or remarks"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setRecordPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmPayment}>
                <Check className="w-4 h-4 mr-1" />
                Confirm Payment Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
