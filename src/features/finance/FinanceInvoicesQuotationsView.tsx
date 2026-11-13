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
  Plus,
  RefreshCw,
  HelpCircle,
  FileSpreadsheet,
  CornerDownRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Invoice, Quotation, CreditNote, InvoiceStatus, InvoicePaymentStatus } from '../../types';
import { formatINR, numberToIndianWords, maskAccountNumber } from '../../services/formatters';
import { calculateGstTaxes } from '../../services/gstService';

export const FinanceInvoicesQuotationsView: React.FC = () => {
  const {
    invoices,
    quotations,
    creditNotes,
    customers,
    companyProfiles,
    activeCompanyProfileId,
    setActiveCompanyProfile,
    documentTemplates,
    convertQuotationToInvoice,
    createCreditNote,
    recordCustomerPaymentReceipt,
    sendInvoiceEmail,
    sendInvoiceWhatsApp,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'invoices' | 'quotations' | 'credit_notes'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNote | null>(null);

  // Modals
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('neft_rtgs');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Convert Quotation Modal
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [quotationToConvert, setQuotationToConvert] = useState<Quotation | null>(null);
  const [selectedEntityForConversion, setSelectedEntityForConversion] = useState(activeCompanyProfileId || 'comp-delhi-01');

  // Credit Note Modal
  const [creditNoteModalOpen, setCreditNoteModalOpen] = useState(false);
  const [targetInvoiceForCreditNote, setTargetInvoiceForCreditNote] = useState<Invoice | null>(null);
  const [creditNoteType, setCreditNoteType] = useState<'credit_note' | 'debit_note'>('credit_note');
  const [creditNoteReason, setCreditNoteReason] = useState<CreditNote['reason']>('sales_return');
  const [creditTaxableAmount, setCreditTaxableAmount] = useState('');
  const [creditNoteRemarks, setCreditNoteRemarks] = useState('');

  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination
  const [invPage, setInvPage] = useState(1);
  const [invPageSize, setInvPageSize] = useState(8);
  const [quotPage, setQuotPage] = useState(1);
  const [quotPageSize, setQuotPageSize] = useState(8);
  const [cnPage, setCnPage] = useState(1);
  const [cnPageSize, setCnPageSize] = useState(8);

  const activeCompany = useMemo(() => {
    return (companyProfiles || []).find((c) => c.id === activeCompanyProfileId) || companyProfiles?.[0];
  }, [companyProfiles, activeCompanyProfileId]);

  // ─── Filtered Invoices ───
  const filteredInvoices = useMemo(() => {
    return (invoices || []).filter((inv) => {
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
    return (quotations || []).filter((q) => {
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

  // ─── Filtered Credit Notes ───
  const filteredCreditNotes = useMemo(() => {
    return (creditNotes || []).filter((cn) => {
      if (statusFilter !== 'all') {
        if (cn.status !== statusFilter) return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          cn.noteNumber.toLowerCase().includes(term) ||
          cn.originalInvoiceNumber.toLowerCase().includes(term) ||
          cn.customerName.toLowerCase().includes(term) ||
          cn.reason.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [creditNotes, statusFilter, searchTerm]);

  const paginatedInvoices = useMemo(() => {
    return filteredInvoices.slice((invPage - 1) * invPageSize, invPage * invPageSize);
  }, [filteredInvoices, invPage, invPageSize]);

  const paginatedQuotations = useMemo(() => {
    return filteredQuotations.slice((quotPage - 1) * quotPageSize, quotPage * quotPageSize);
  }, [filteredQuotations, quotPage, quotPageSize]);

  const paginatedCreditNotes = useMemo(() => {
    return filteredCreditNotes.slice((cnPage - 1) * cnPageSize, cnPage * cnPageSize);
  }, [filteredCreditNotes, cnPage, cnPageSize]);

  // Summary Metrics
  const invoiceMetrics = useMemo(() => {
    const list = invoices || [];
    const totalInvoiced = list.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalCollected = list.reduce((sum, i) => sum + i.paidAmount, 0);
    const totalOutstanding = list.reduce((sum, i) => sum + i.outstandingBalance, 0);
    const overdueCount = list.filter((i) => i.paymentStatus !== 'paid' && new Date(i.dueDate) < new Date()).length;
    return { totalInvoiced, totalCollected, totalOutstanding, overdueCount };
  }, [invoices]);

  const quotationMetrics = useMemo(() => {
    const list = quotations || [];
    const totalQuotes = list.length;
    const totalQuotedValue = list.reduce((sum, q) => sum + q.grandTotal, 0);
    const convertedCount = list.filter((q) => q.status === 'Converted' || q.status === 'Accepted').length;
    return { totalQuotes, totalQuotedValue, convertedCount };
  }, [quotations]);

  const creditNoteMetrics = useMemo(() => {
    const list = creditNotes || [];
    const totalCreditNotes = list.length;
    const totalCreditAmount = list.reduce((sum, c) => sum + c.totalAmount, 0);
    return { totalCreditNotes, totalCreditAmount };
  }, [creditNotes]);

  // Payment Recording
  const handleOpenRecordPayment = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPaymentAmount(inv.outstandingBalance.toString());
    setPaymentRef(`UTR-${Date.now().toString().slice(-6)}`);
    setRecordPaymentModalOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedInvoice || !paymentAmount || isSubmitting) return;
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) return;

    setIsSubmitting(true);
    try {
      recordCustomerPaymentReceipt(
        selectedInvoice.customerId,
        amt,
        paymentMode,
        paymentRef,
        selectedInvoice.orderId,
        selectedInvoice.id,
        paymentNotes || 'Direct customer collection recorded by Finance'
      );

      setNoticeMessage(`Receipt of ${formatINR(amt)} recorded successfully against ${selectedInvoice.invoiceNumber}.`);
      setTimeout(() => setNoticeMessage(null), 4000);
      setRecordPaymentModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert Quotation Handlers
  const handleOpenConvertModal = (q: Quotation) => {
    setQuotationToConvert(q);
    setSelectedEntityForConversion(activeCompanyProfileId || companyProfiles?.[0]?.id || 'comp-delhi-01');
    setConvertModalOpen(true);
  };

  const handleConfirmConversion = () => {
    if (!quotationToConvert || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const createdInvoice = convertQuotationToInvoice(
        quotationToConvert.id,
        selectedEntityForConversion
      );

      setNoticeMessage(`Sales Quotation ${quotationToConvert.quotationNo} successfully converted into Tax Invoice ${createdInvoice.invoiceNumber}!`);
      setTimeout(() => setNoticeMessage(null), 5000);
      setConvertModalOpen(false);
      setQuotationToConvert(null);
      setActiveTab('invoices');
    } catch (err: any) {
      alert(`Error converting quotation: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Credit Note Handlers
  const handleOpenCreditNoteModal = (inv: Invoice) => {
    setTargetInvoiceForCreditNote(inv);
    setCreditNoteType('credit_note');
    setCreditTaxableAmount((inv.subtotal * 0.2).toFixed(2)); // default suggestion: 20%
    setCreditNoteRemarks('');
    setCreditNoteModalOpen(true);
  };

  const handleConfirmCreditNote = () => {
    if (!targetInvoiceForCreditNote || !creditTaxableAmount || isSubmitting) return;
    const taxable = Number(creditTaxableAmount);
    if (isNaN(taxable) || taxable <= 0) {
      alert('Please enter a valid taxable credit amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate GST split
      const isInterstate = targetInvoiceForCreditNote.isInterstate || false;
      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isInterstate) {
        igst = Math.round(taxable * 0.18 * 100) / 100;
      } else {
        cgst = Math.round(taxable * 0.09 * 100) / 100;
        sgst = Math.round(taxable * 0.09 * 100) / 100;
      }
      const totalAmount = Math.round((taxable + cgst + sgst + igst) * 100) / 100;

      createCreditNote({
        noteNumber: '',
        noteType: creditNoteType,
        companyProfileId: targetInvoiceForCreditNote.companyProfileId || activeCompanyProfileId,
        originalInvoiceId: targetInvoiceForCreditNote.id,
        originalInvoiceNumber: targetInvoiceForCreditNote.invoiceNumber,
        customerId: targetInvoiceForCreditNote.customerId,
        customerName: targetInvoiceForCreditNote.customerName,
        customerGstin: targetInvoiceForCreditNote.customerGstin,
        issueDate: new Date().toISOString().split('T')[0],
        reason: creditNoteReason,
        taxableAmount: taxable,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalAmount,
        amountInWords: numberToIndianWords(totalAmount),
        status: 'applied',
        notes: creditNoteRemarks || `Credit note issued against ${targetInvoiceForCreditNote.invoiceNumber}`,
        idempotencyKey: `idemp-cn-${Date.now()}`,
        createdByUserId: 'usr-fin-01',
        createdByUserName: 'Suresh Singhania (CFO)',
      });

      setNoticeMessage(`${creditNoteType === 'credit_note' ? 'Credit Note' : 'Debit Note'} of ${formatINR(totalAmount)} generated and adjusted against ${targetInvoiceForCreditNote.invoiceNumber}.`);
      setTimeout(() => setNoticeMessage(null), 5000);
      setCreditNoteModalOpen(false);
      setTargetInvoiceForCreditNote(null);
    } catch (err: any) {
      alert(`Error creating note: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
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

      {/* ─── HEADER / BANNER & MULTI-COMPANY ENTITY SELECTOR ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-3xl backdrop-blur-xl bg-white/70 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Invoices, Quotations &amp; Credit Notes Register
            </h1>
            <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
              GST Sec 31 &amp; 34
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Commercial billing engine with multi-company issuance, GST place-of-supply auto-split, and 1-click quotation conversion.
          </p>
        </div>

        {/* Company Entity Switcher + Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Legal Entity Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl text-xs">
            <Building2 className="w-3.5 h-3.5 text-indigo-700" />
            <span className="text-[10px] uppercase font-bold text-indigo-900">Entity:</span>
            <select
              value={activeCompanyProfileId}
              onChange={(e) => setActiveCompanyProfile(e.target.value)}
              className="bg-transparent font-bold text-indigo-950 focus:outline-none cursor-pointer text-xs"
            >
              {(companyProfiles || []).map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.legalName} ({cp.stateCode})
                </option>
              ))}
            </select>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-slate-100/80 rounded-2xl border border-slate-200 text-xs shrink-0">
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
              Tax Invoices ({invoices.length})
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
              Quotations ({quotations.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('credit_notes');
                setStatusFilter('all');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'credit_notes' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Credit / Debit Notes ({creditNotes?.length || 0})
            </button>
          </div>
        </div>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      {activeTab === 'invoices' && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="backdrop-blur-md bg-white/80 p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Invoiced</span>
            <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
              {formatINR(invoiceMetrics.totalInvoiced)}
            </div>
            <span className="text-[10px] text-slate-400">{invoices.length} total tax invoices</span>
          </div>
          <div className="backdrop-blur-md bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-emerald-800 block">Collections Realized</span>
            <div className="text-xl font-bold text-emerald-900 font-mono mt-0.5">
              {formatINR(invoiceMetrics.totalCollected)}
            </div>
            <span className="text-[10px] text-emerald-700">Verified bank receipts</span>
          </div>
          <div className="backdrop-blur-md bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-amber-800 block">Outstanding Receivables</span>
            <div className="text-xl font-bold text-amber-950 font-mono mt-0.5">
              {formatINR(invoiceMetrics.totalOutstanding)}
            </div>
            <span className="text-[10px] text-amber-700">Pending customer balance</span>
          </div>
          <div className="backdrop-blur-md bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-rose-800 block">Overdue Invoices</span>
            <div className="text-xl font-bold text-rose-950 font-mono mt-0.5">
              {invoiceMetrics.overdueCount} Invoices
            </div>
            <span className="text-[10px] text-rose-700">Exceeded payment terms</span>
          </div>
        </div>
      )}

      {activeTab === 'quotations' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="backdrop-blur-md bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-indigo-800 block">Total Quotations</span>
            <div className="text-xl font-bold text-indigo-950 font-mono mt-0.5">
              {quotationMetrics.totalQuotes} Proposals
            </div>
            <span className="text-[10px] text-indigo-600">Pending client confirmation</span>
          </div>
          <div className="backdrop-blur-md bg-white/80 p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Quotation Pipeline Value</span>
            <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
              {formatINR(quotationMetrics.totalQuotedValue)}
            </div>
            <span className="text-[10px] text-slate-400">Off-balance sheet; not revenue</span>
          </div>
          <div className="backdrop-blur-md bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-emerald-800 block">Converted to Invoices</span>
            <div className="text-xl font-bold text-emerald-900 font-mono mt-0.5">
              {quotationMetrics.convertedCount} Converted
            </div>
            <span className="text-[10px] text-emerald-700">Converted into formal tax billing</span>
          </div>
        </div>
      )}

      {activeTab === 'credit_notes' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="backdrop-blur-md bg-purple-50/60 p-3.5 rounded-2xl border border-purple-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-purple-800 block">Total Notes Issued</span>
            <div className="text-xl font-bold text-purple-950 font-mono mt-0.5">
              {creditNoteMetrics.totalCreditNotes} Credit / Debit Notes
            </div>
            <span className="text-[10px] text-purple-600">Under GST Section 34</span>
          </div>
          <div className="backdrop-blur-md bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-rose-800 block">Total Credit Value</span>
            <div className="text-xl font-bold text-rose-950 font-mono mt-0.5">
              {formatINR(creditNoteMetrics.totalCreditAmount)}
            </div>
            <span className="text-[10px] text-rose-600">Reversed from sales revenue &amp; GST output</span>
          </div>
          <div className="backdrop-blur-md bg-white/80 p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">GST Compliance Mode</span>
              <span className="text-xs font-bold text-slate-900 block mt-0.5">GSTR-1 Table 9B Ready</span>
              <span className="text-[10px] text-slate-400">Original invoice reference preserved</span>
            </div>
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
      )}

      {/* ─── FILTERS & SEARCH ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 backdrop-blur-md bg-white/80 p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex-1 max-w-sm">
          <SearchInput
            value={searchTerm}
            onChange={(val) => setSearchTerm(val)}
            placeholder={
              activeTab === 'invoices'
                ? "Search invoice #, customer, order ref, user..."
                : activeTab === 'quotations'
                ? "Search quotation #, dealer, rep..."
                : "Search credit note #, customer, reason..."
            }
            className="text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'invoices' && (
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
          )}

          {activeTab === 'quotations' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Quotation Statuses</option>
              <option value="sent">Sent to Customer</option>
              <option value="awaiting approval">Awaiting Approval</option>
              <option value="accepted">Accepted / Won</option>
              <option value="converted">Converted to Invoice</option>
              <option value="draft">Draft RFQ</option>
            </select>
          )}

          {activeTab === 'credit_notes' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Credit Note Statuses</option>
              <option value="applied">Applied to Invoice</option>
              <option value="issued">Issued / Unadjusted</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}
        </div>
      </div>

      {/* ─── INVOICES TAB TABLE ─── */}
      {activeTab === 'invoices' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/70">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Legal Entity / GST</th>
                  <th className="py-3 px-4 text-right">Invoice Value</th>
                  <th className="py-3 px-4 text-right">Paid Amount</th>
                  <th className="py-3 px-4 text-right">Outstanding</th>
                  <th className="py-3 px-4 text-center">Payment Status</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 italic">
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
                          <span className="text-[10px] text-slate-400 font-normal block font-sans">
                            {inv.invoiceDate}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{inv.customerName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {inv.customerGstin ? `GSTIN: ${inv.customerGstin}` : 'Unregistered'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block text-[11px]">
                            {inv.companySnapshot?.legalName || 'Delhi HQ Entity'}
                          </span>
                          <span className="text-[10px] text-indigo-600 font-mono block">
                            {inv.isInterstate ? 'Interstate (IGST)' : 'Intrastate (CGST+SGST)'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatINR(inv.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {formatINR(inv.paidAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {inv.outstandingBalance > 0 ? (
                            <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-amber-700'}>
                              {formatINR(inv.outstandingBalance)}
                            </span>
                          ) : (
                            <span className="text-slate-400">₹0.00</span>
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenCreditNoteModal(inv)}
                              className="h-7 text-xs px-2 text-purple-700 hover:text-purple-800 border-purple-200 hover:bg-purple-50"
                              title="Issue Credit or Debit Note"
                            >
                              Credit Note
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
      )}

      {/* ─── QUOTATIONS TAB TABLE ─── */}
      {activeTab === 'quotations' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/70">
                  <th className="py-3 px-4">Quotation #</th>
                  <th className="py-3 px-4">Customer / Inquiry</th>
                  <th className="py-3 px-4">Assigned Sales Rep</th>
                  <th className="py-3 px-4 text-center">Items Qty</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-right">Estimated Tax</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                      No quotations found matching criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedQuotations.map((q) => {
                    const isConverted = q.status === 'Converted';
                    return (
                      <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                          {q.quotationNo}
                          <span className="text-[10px] text-slate-400 block font-normal font-sans">
                            {q.createdDate}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{q.customerName}</span>
                          <span className="text-[10px] text-slate-400">{q.senderCompany}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block text-[11px]">
                            {q.assignedSalesUserName || 'Direct Office Inquiry'}
                          </span>
                          <span className="text-[10px] text-slate-400">Valid: {q.validUntil}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {q.items.reduce((s, it) => s + it.qty, 0)} units ({q.items.length} SKUs)
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                          {formatINR(q.subtotal)}
                        </td>
                        <td className="py-3 px-4 text-right text-[11px] font-mono text-slate-500">
                          +{formatINR(q.taxTotal)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-indigo-950">
                          {formatINR(q.grandTotal)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            size="sm"
                            variant={
                              isConverted
                                ? 'success'
                                : q.status === 'Accepted'
                                ? 'success'
                                : q.status === 'Sent'
                                ? 'primary'
                                : 'neutral'
                            }
                          >
                            {q.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedQuotation(q)}
                              className="h-7 text-xs px-2"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View
                            </Button>
                            {!isConverted && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleOpenConvertModal(q)}
                                className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                title="Convert into official Tax Invoice"
                              >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Convert to Invoice
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

      {/* ─── CREDIT / DEBIT NOTES TAB TABLE ─── */}
      {activeTab === 'credit_notes' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/70">
                  <th className="py-3 px-4">Note # &amp; Type</th>
                  <th className="py-3 px-4">Original Invoice Ref</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Reason Category</th>
                  <th className="py-3 px-4 text-right">Taxable Val</th>
                  <th className="py-3 px-4 text-right">GST Reversal</th>
                  <th className="py-3 px-4 text-right">Total Credit</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredCreditNotes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                      No credit or debit notes found.
                    </td>
                  </tr>
                ) : (
                  paginatedCreditNotes.map((cn) => (
                    <tr key={cn.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-purple-700">
                        {cn.noteNumber}
                        <Badge size="sm" variant={cn.noteType === 'credit_note' ? 'purple' : 'warning'} className="ml-1.5 text-[9px]">
                          {cn.noteType === 'credit_note' ? 'Credit Note' : 'Debit Note'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block font-mono">{cn.originalInvoiceNumber}</span>
                        <span className="text-[10px] text-slate-400">Date: {cn.issueDate}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{cn.customerName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{cn.customerGstin || 'Unregistered'}</span>
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-700">
                        {cn.reason.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatINR(cn.taxableAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-purple-700">
                        {formatINR(cn.cgstAmount + cn.sgstAmount + cn.igstAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-purple-900">
                        {formatINR(cn.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge size="sm" variant={cn.status === 'applied' ? 'success' : 'neutral'}>
                          {cn.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedCreditNote(cn)}
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

          {filteredCreditNotes.length > cnPageSize && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/40">
              <Pagination
                currentPage={cnPage}
                totalPages={Math.ceil(filteredCreditNotes.length / cnPageSize)}
                totalItems={filteredCreditNotes.length}
                itemsPerPage={cnPageSize}
                onPageChange={setCnPage}
                onItemsPerPageChange={(size) => {
                  setCnPageSize(size);
                  setCnPage(1);
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
          title={`Legal Tax Invoice: ${selectedInvoice.invoiceNumber}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs text-slate-800">
            {/* Top Company & Invoice Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-indigo-700 tracking-wider">
                  {selectedInvoice.companySnapshot?.tradeName || 'ApexFlow ERP & Tzmicha Chemicals'}
                </span>
                <h3 className="text-base font-bold text-slate-900 font-mono mt-0.5">
                  {selectedInvoice.invoiceNumber}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  GSTIN: {selectedInvoice.companySnapshot?.gstin || '07AAACT1122D1Z0'} • State: {selectedInvoice.companySnapshot?.state || 'Delhi'}
                </p>
                <p className="text-[10px] text-indigo-600 font-mono mt-0.5">
                  Order Ref: {selectedInvoice.orderNumber || 'Direct Sale'} • Place of Supply: {selectedInvoice.placeOfSupplyState || 'Delhi'}
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

            {/* Billed To / Shipped To Grid */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-[11px]">
              <div>
                <span className="font-bold text-slate-400 uppercase text-[9px] block">Billed To Customer</span>
                <span className="font-bold text-slate-900 block text-xs mt-0.5">{selectedInvoice.customerName}</span>
                <span className="text-slate-500 block">ID: {selectedInvoice.customerId}</span>
                <span className="text-slate-500 block">GSTIN: {selectedInvoice.customerGstin || 'Unregistered'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 uppercase text-[9px] block">Invoice Dates &amp; Tax Regimes</span>
                <span className="text-slate-700 block mt-0.5">Invoice Date: {selectedInvoice.invoiceDate}</span>
                <span className="text-slate-700 block">Tax Scheme: {selectedInvoice.isInterstate ? 'Interstate (IGST)' : 'Intrastate (CGST+SGST)'}</span>
                {selectedInvoice.paymentReference && (
                  <span className="text-emerald-700 font-semibold block font-mono">
                    Payment Ref: {selectedInvoice.paymentReference}
                  </span>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-semibold text-[10px]">
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Rate</th>
                    <th className="py-2 px-3 text-right">Tax Rate</th>
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
                      <td className="py-2 px-3 text-center font-bold">{it.quantity} {it.unit}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatINR(it.unitPrice)}</td>
                      <td className="py-2 px-3 text-right font-mono text-[11px] text-slate-500">
                        {it.taxRatePercent}% ({formatINR(it.taxAmount)})
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatINR(it.netAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Calculations & Amount in Words */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Amount in Words</span>
                <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                  {selectedInvoice.amountInWords || numberToIndianWords(selectedInvoice.totalAmount)}
                </span>
                <div className="mt-2 text-[10px] text-slate-500">
                  Bank: {selectedInvoice.companySnapshot?.bankAccounts?.[0]?.bankName || 'HDFC Bank Ltd'} • A/C: {maskAccountNumber(selectedInvoice.companySnapshot?.bankAccounts?.[0]?.accountNumber || '992188440011')}
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatINR(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.isInterstate ? (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST (18%):</span>
                    <span className="font-mono">{formatINR(selectedInvoice.totalTax)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST (9%):</span>
                      <span className="font-mono">{formatINR(selectedInvoice.cgstAmount || selectedInvoice.totalTax / 2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST (9%):</span>
                      <span className="font-mono">{formatINR(selectedInvoice.sgstAmount || selectedInvoice.totalTax / 2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-slate-900 font-bold text-sm border-t border-slate-200 pt-1">
                  <span>Total Payable:</span>
                  <span className="font-mono">{formatINR(selectedInvoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold border-b border-slate-200 pb-1">
                  <span>Paid to Date:</span>
                  <span className="font-mono">{formatINR(selectedInvoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-bold text-sm pt-0.5">
                  <span>Balance Due:</span>
                  <span className="font-mono">{formatINR(selectedInvoice.outstandingBalance)}</span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print PDF
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const inv = selectedInvoice;
                    setSelectedInvoice(null);
                    handleOpenCreditNoteModal(inv);
                  }}
                  className="text-purple-700 border-purple-200"
                >
                  Issue Credit Note
                </Button>
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
                  Assigned Sales Rep: {selectedQuotation.assignedSalesUserName || 'Direct Office Inquiry'}
                </p>
              </div>
              <Badge variant="primary" size="md">
                {selectedQuotation.status}
              </Badge>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200 text-amber-900 rounded-2xl text-[11px] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Accounting Rule:</strong> Quotations are preliminary price commitments and do not impact accounts receivable or inventory ledgers until officially converted into a Tax Invoice.
              </span>
            </div>

            {/* Quotation Items */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
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
                      <td className="py-2 px-3 text-right font-mono">{formatINR(it.unitPrice)}</td>
                      <td className="py-2 px-3 text-right text-emerald-700 font-semibold">{it.discountPercent}%</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{formatINR(it.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 text-xs">
              <div className="w-64 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatINR(selectedQuotation.subtotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount:</span>
                  <span className="font-mono">-{formatINR(selectedQuotation.discountTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Estimated Tax:</span>
                  <span className="font-mono">+{formatINR(selectedQuotation.taxTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold text-sm border-t border-slate-200 pt-1">
                  <span>Quoted Total:</span>
                  <span className="font-mono">{formatINR(selectedQuotation.grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedQuotation(null)}>
                Close
              </Button>
              {selectedQuotation.status !== 'Converted' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const q = selectedQuotation;
                    setSelectedQuotation(null);
                    handleOpenConvertModal(q);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Convert to Tax Invoice
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ─── CONVERT QUOTATION TO INVOICE CONFIRMATION MODAL ─── */}
      {convertModalOpen && quotationToConvert && (
        <Modal
          isOpen={convertModalOpen}
          onClose={() => setConvertModalOpen(false)}
          title={`Convert Quotation ${quotationToConvert.quotationNo} to Tax Invoice`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{quotationToConvert.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quoted Total:</span>
                <span className="font-bold font-mono text-indigo-900">{formatINR(quotationToConvert.grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Items:</span>
                <span>{quotationToConvert.items.length} SKUs ({quotationToConvert.items.reduce((s, i) => s + i.qty, 0)} units)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Select Legal Entity for Tax Invoice</label>
              <select
                value={selectedEntityForConversion}
                onChange={(e) => setSelectedEntityForConversion(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {(companyProfiles || []).map((cp) => (
                  <option key={cp.id} value={cp.id}>
                    {cp.legalName} ({cp.tradeName}) - GSTIN: {cp.gstin}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">
                Determines sequential tax invoice numbering prefix and place of supply CGST/SGST vs IGST split.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>GST Rule 46(b) Check:</span>
                <span className="text-emerald-700 font-bold">Compliant (&le; 16 Chars)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Default Credit Terms:</span>
                <span>Net 30 Days</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setConvertModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmConversion}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                {isSubmitting ? 'Generating Invoice...' : 'Generate & Issue Tax Invoice'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── ISSUE CREDIT / DEBIT NOTE MODAL ─── */}
      {creditNoteModalOpen && targetInvoiceForCreditNote && (
        <Modal
          isOpen={creditNoteModalOpen}
          onClose={() => setCreditNoteModalOpen(false)}
          title={`Issue Note for ${targetInvoiceForCreditNote.invoiceNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200">
              <div className="flex justify-between">
                <span className="text-purple-700 font-medium">Original Invoice:</span>
                <span className="font-bold text-purple-950 font-mono">{targetInvoiceForCreditNote.invoiceNumber}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-purple-700 font-medium">Customer:</span>
                <span className="font-bold text-slate-900">{targetInvoiceForCreditNote.customerName}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-purple-700 font-medium">Invoice Value:</span>
                <span className="font-mono font-bold">{formatINR(targetInvoiceForCreditNote.totalAmount)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block">Note Type</label>
                <select
                  value={creditNoteType}
                  onChange={(e) => setCreditNoteType(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="credit_note">Credit Note (Reduce Dues)</option>
                  <option value="debit_note">Debit Note (Increase Dues)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block">Statutory Reason</label>
                <select
                  value={creditNoteReason}
                  onChange={(e) => setCreditNoteReason(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="sales_return">Sales Return</option>
                  <option value="post_sale_discount">Post-Sale Discount / Rebate</option>
                  <option value="deficiency_in_service">Deficiency / Transit Leakage</option>
                  <option value="correction_in_invoice">Correction in Invoice</option>
                  <option value="rate_difference">Rate Difference</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Taxable Amount to Adjust (₹)</label>
              <input
                type="number"
                value={creditTaxableAmount}
                onChange={(e) => setCreditTaxableAmount(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none"
                placeholder="Enter taxable amount"
              />
              <p className="text-[10px] text-slate-400">
                GST (18%) will be auto-calculated and reversed proportionally.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Reason &amp; Inspection Remarks</label>
              <textarea
                value={creditNoteRemarks}
                onChange={(e) => setCreditNoteRemarks(e.target.value)}
                rows={2}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none"
                placeholder="Mention LR number, QC report or management rebate approval details..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setCreditNoteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmCreditNote}
                disabled={isSubmitting}
                className="bg-purple-700 hover:bg-purple-800 text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                {isSubmitting ? 'Issuing Note...' : 'Issue GST Note'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── CREDIT NOTE PREVIEW MODAL ─── */}
      {selectedCreditNote && (
        <Modal
          isOpen={!!selectedCreditNote}
          onClose={() => setSelectedCreditNote(null)}
          title={`${selectedCreditNote.noteType === 'credit_note' ? 'Credit Note' : 'Debit Note'}: ${selectedCreditNote.noteNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-purple-900 text-sm">{selectedCreditNote.noteNumber}</span>
                <Badge variant="purple" size="sm">{selectedCreditNote.status.toUpperCase()}</Badge>
              </div>
              <p className="text-[11px] text-purple-800 mt-1">
                Issued Under GST Law Section 34 • Date: {selectedCreditNote.issueDate}
              </p>
            </div>

            <div className="space-y-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{selectedCreditNote.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Linked Invoice:</span>
                <span className="font-mono font-bold text-indigo-700">{selectedCreditNote.originalInvoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reason:</span>
                <span className="capitalize">{selectedCreditNote.reason.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Taxable Value:</span>
                <span className="font-mono">{formatINR(selectedCreditNote.taxableAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GST Reversal:</span>
                <span className="font-mono text-purple-700">+{formatINR(selectedCreditNote.cgstAmount + selectedCreditNote.sgstAmount + selectedCreditNote.igstAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
                <span>Total Note Amount:</span>
                <span className="font-mono text-purple-900">{formatINR(selectedCreditNote.totalAmount)}</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
              <span className="font-bold text-slate-500 uppercase text-[9px] block">Amount in Words:</span>
              <span className="italic text-slate-800">{selectedCreditNote.amountInWords}</span>
            </div>

            <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="font-bold block text-slate-500 text-[9px] uppercase">Notes:</span>
              <span>{selectedCreditNote.notes || 'None recorded'}</span>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedCreditNote(null)}>
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
          title={`Record Customer Payment for ${selectedInvoice.invoiceNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{selectedInvoice.customerName}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-500">Total Invoice:</span>
                <span className="font-mono font-bold">{formatINR(selectedInvoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between mt-1 text-rose-600 font-semibold">
                <span>Outstanding Dues:</span>
                <span className="font-mono font-bold">{formatINR(selectedInvoice.outstandingBalance)}</span>
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
                placeholder="Bank transaction remarks or branch details"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setRecordPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmPayment}
                disabled={isSubmitting}
              >
                <Check className="w-4 h-4 mr-1" />
                {isSubmitting ? 'Recording...' : 'Confirm Receipt'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
