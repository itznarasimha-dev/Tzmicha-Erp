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
  Plus,
  Eye,
  Receipt,
  Download,
  Lock,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  Send,
  Printer,
  CreditCard,
  Building2,
  Users,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Landmark,
  Check,
  Calendar,
  X,
  FileCheck,
} from 'lucide-react';
import { Invoice, InvoiceItem, InvoiceStatus, InvoicePaymentStatus, InvoiceSource, UserRole } from '../../types';

export const AdminInvoicesView: React.FC = () => {
  const {
    invoices,
    customers,
    products,
    batches,
    salesOrders,
    users,
    regions,
    currentUser,
    currentRole,
    createInvoice,
    recordInvoicePayment,
    updateInvoiceStatus,
    sendInvoiceEmail,
    sendInvoiceWhatsApp,
    addNotification,
  } = useErpStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partially_paid' | 'paid' | 'overdue'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'sales_order_payment' | 'admin_manual'>('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState<Invoice | null>(null);

  // Payment Recording State
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState('Bank Transfer / NEFT');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // Simulated Email & WhatsApp Send in modal
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  // Manual Creation Form State
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formOrderId, setFormOrderId] = useState('');
  const [formInvoiceDate, setFormInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [formRegionId, setFormRegionId] = useState('reg-north');
  const [formNotes, setFormNotes] = useState('');
  const [formRecordInitialPayment, setFormRecordInitialPayment] = useState(false);
  const [formInitialPaidAmount, setFormInitialPaidAmount] = useState<number>(0);
  const [formInitialPayMode, setFormInitialPayMode] = useState('Bank Transfer / NEFT');
  const [formInitialPayRef, setFormInitialPayRef] = useState('');

  // Form Line items
  const [formItems, setFormItems] = useState<
    Array<{
      productId: string;
      batchId: string;
      quantity: number;
      unitPrice: number;
      discountPercent: number;
      taxRatePercent: number;
    }>
  >([
    {
      productId: 'prod-001',
      batchId: 'batch-no-01',
      quantity: 10,
      unitPrice: 18000,
      discountPercent: 5,
      taxRatePercent: 18,
    },
  ]);

  const formatINR = (val: number) => {
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const totalCollected = invoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
    const totalOutstanding = invoices.reduce((sum, i) => sum + (i.outstandingBalance || 0), 0);
    const overdueInvoices = invoices.filter((i) => i.status === 'overdue' || (i.outstandingBalance > 0 && new Date(i.dueDate) < new Date()));
    const overdueAmount = overdueInvoices.reduce((sum, i) => sum + (i.outstandingBalance || 0), 0);
    const paidCount = invoices.filter((i) => i.paymentStatus === 'paid').length;
    const pendingCount = invoices.filter((i) => i.paymentStatus !== 'paid').length;

    return {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      overdueAmount,
      overdueCount: overdueInvoices.length,
      paidCount,
      pendingCount,
    };
  }, [invoices]);

  // Filtered Invoices List
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        inv.invoiceNumber.toLowerCase().includes(search) ||
        inv.customerName.toLowerCase().includes(search) ||
        (inv.customerCode && inv.customerCode.toLowerCase().includes(search)) ||
        (inv.orderNumber && inv.orderNumber.toLowerCase().includes(search)) ||
        (inv.createdByUserName && inv.createdByUserName.toLowerCase().includes(search));

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'unpaid'
          ? inv.paymentStatus === 'unpaid' && inv.status !== 'overdue'
          : statusFilter === 'partially_paid'
          ? inv.paymentStatus === 'partially_paid'
          : statusFilter === 'paid'
          ? inv.paymentStatus === 'paid'
          : statusFilter === 'overdue'
          ? inv.status === 'overdue' || (inv.outstandingBalance > 0 && new Date(inv.dueDate) < new Date())
          : true;

      const matchesSource = sourceFilter === 'all' || inv.source === sourceFilter;
      const matchesRegion = regionFilter === 'all' || inv.regionId === regionFilter;

      return matchesSearch && matchesStatus && matchesSource && matchesRegion;
    });
  }, [invoices, searchTerm, statusFilter, sourceFilter, regionFilter]);

  const paginatedInvoices = useMemo(() => {
    return filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  // Open Payment Recording modal
  const handleOpenRecordPayment = (inv: Invoice) => {
    setPaymentTargetInvoice(inv);
    setPaymentAmount(inv.outstandingBalance);
    setPaymentMode('Bank Transfer / NEFT');
    setPaymentRef(`UTR-${Math.floor(100000 + Math.random() * 900000)}`);
    setPaymentNotes('');
    setPaymentError('');
    setIsPaymentModalOpen(true);
  };

  // Submit payment
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetInvoice) return;

    if (paymentAmount <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }
    if (paymentAmount > paymentTargetInvoice.outstandingBalance) {
      setPaymentError(`Payment amount cannot exceed remaining balance (${formatINR(paymentTargetInvoice.outstandingBalance)})`);
      return;
    }

    const res = recordInvoicePayment(paymentTargetInvoice.id, {
      amount: paymentAmount,
      paymentMode,
      referenceNumber: paymentRef,
      notes: paymentNotes,
    });

    if (res.success) {
      setIsPaymentModalOpen(false);
      setPaymentTargetInvoice(null);
      // update selected invoice if open
      if (selectedInvoice && selectedInvoice.id === paymentTargetInvoice.id) {
        const updated = invoices.find((i) => i.id === selectedInvoice.id);
        if (updated) setSelectedInvoice(updated);
      }
    } else {
      setPaymentError(res.message);
    }
  };

  // Simulated Email Dispatch
  const handleTriggerEmail = (inv: Invoice) => {
    setIsSendingEmail(true);
    setTimeout(() => {
      sendInvoiceEmail(inv.id, inv.customerEmail);
      setIsSendingEmail(false);
      setActionFeedback(`✓ Tax Invoice ${inv.invoiceNumber} PDF dispatched to ${inv.customerEmail || 'customer'}`);
      setTimeout(() => setActionFeedback(null), 4000);
    }, 600);
  };

  // Simulated WhatsApp Dispatch
  const handleTriggerWhatsApp = (inv: Invoice) => {
    setIsSendingWhatsApp(true);
    setTimeout(() => {
      sendInvoiceWhatsApp(inv.id, inv.customerPhone);
      setIsSendingWhatsApp(false);
      setActionFeedback(`✓ Digital invoice link sent to WhatsApp (${inv.customerPhone || 'registered phone'})`);
      setTimeout(() => setActionFeedback(null), 4000);
    }, 600);
  };

  // Calculate Form Totals
  const formTotals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    formItems.forEach((it) => {
      const base = it.quantity * it.unitPrice;
      const disc = (base * (it.discountPercent || 0)) / 100;
      const taxable = base - disc;
      const tax = (taxable * (it.taxRatePercent || 18)) / 100;

      subtotal += base;
      totalDiscount += disc;
      totalTax += tax;
    });

    const totalAmount = subtotal - totalDiscount + totalTax;
    return {
      subtotal,
      totalDiscount,
      totalTax,
      totalAmount,
    };
  }, [formItems]);

  // Handle Form Item Change
  const handleFormItemChange = (index: number, field: string, value: any) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'productId') {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          updated[index].unitPrice = prod.standardSellingPrice || 2500;
          updated[index].taxRatePercent = prod.taxRatePercent || 18;
          // default batch
          const availBatch = batches.find((b) => b.productId === prod.id && b.availableQuantity > 0);
          if (availBatch) {
            updated[index].batchId = availBatch.id;
          }
        }
      }
      return updated;
    });
  };

  // Add line item
  const handleAddLineItem = () => {
    const prod = products[0] || { id: 'prod-001', standardSellingPrice: 2500, taxRatePercent: 18 };
    const availBatch = batches.find((b) => b.productId === prod.id);
    setFormItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        batchId: availBatch?.id || 'batch-no-01',
        quantity: 5,
        unitPrice: prod.standardSellingPrice || 2500,
        discountPercent: 0,
        taxRatePercent: prod.taxRatePercent || 18,
      },
    ]);
  };

  // Remove line item
  const handleRemoveLineItem = (index: number) => {
    if (formItems.length <= 1) return;
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Pre-fill from order if selected
  const handleSelectOrder = (orderId: string) => {
    setFormOrderId(orderId);
    if (!orderId) return;
    const ord = salesOrders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (ord) {
      setFormCustomerId(ord.customerId);
      setFormRegionId(ord.regionId);
      if (ord.items && ord.items.length > 0) {
        setFormItems(
          ord.items.map((it) => ({
            productId: it.productId,
            batchId: it.allocations?.[0]?.batchId || batches.find((b) => b.productId === it.productId)?.id || 'batch-no-01',
            quantity: it.quantity,
            unitPrice: it.standardPrice || it.quotedUnitPrice,
            discountPercent: it.discountPercent || 0,
            taxRatePercent: 18,
          }))
        );
      }
    }
  };

  // Submit Manual Invoice Creation
  const handleCreateManualInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === formCustomerId);
    if (!cust) {
      alert('Please select a valid customer.');
      return;
    }

    const reg = regions.find((r) => r.id === formRegionId);
    const ord = salesOrders.find((o) => o.id === formOrderId);

    const invoiceItems: InvoiceItem[] = formItems.map((it, idx) => {
      const prod = products.find((p) => p.id === it.productId);
      const batch = batches.find((b) => b.id === it.batchId);
      const base = it.quantity * it.unitPrice;
      const discAmt = (base * (it.discountPercent || 0)) / 100;
      const taxable = base - discAmt;
      const taxAmt = (taxable * (it.taxRatePercent || 18)) / 100;
      const net = taxable + taxAmt;

      return {
        id: `item-${Date.now()}-${idx}`,
        productId: it.productId,
        productSku: prod?.sku || it.productId,
        productName: prod?.name || 'Industrial Material',
        batchId: it.batchId,
        batchNumber: batch?.batchNumber || `B-2610-0${idx + 1}`,
        quantity: it.quantity,
        unit: prod?.unit || 'Units',
        unitPrice: it.unitPrice,
        discountPercent: it.discountPercent,
        discountAmount: discAmt,
        taxRatePercent: it.taxRatePercent,
        taxAmount: taxAmt,
        netAmount: net,
      };
    });

    const paidAmt = formRecordInitialPayment ? Number(formInitialPaidAmount || formTotals.totalAmount) : 0;

    const newInv = createInvoice({
      customerId: cust.id,
      customerName: cust.name,
      customerCode: cust.code || cust.id,
      customerPhone: cust.phone,
      customerEmail: cust.email,
      customerAddress: cust.address,
      customerGstin: cust.gstin,
      orderId: ord?.id,
      orderNumber: ord?.orderNumber,
      regionId: formRegionId,
      regionName: reg?.name || 'Northern Territory',
      invoiceDate: formInvoiceDate,
      dueDate: formDueDate,
      subtotal: formTotals.subtotal,
      totalDiscount: formTotals.totalDiscount,
      totalTax: formTotals.totalTax,
      totalAmount: formTotals.totalAmount,
      paidAmount: paidAmt,
      outstandingBalance: Math.max(0, formTotals.totalAmount - paidAmt),
      status: paidAmt >= formTotals.totalAmount ? 'paid' : (paidAmt > 0 ? 'partially_paid' : 'issued'),
      paymentStatus: paidAmt >= formTotals.totalAmount ? 'paid' : (paidAmt > 0 ? 'partially_paid' : 'unpaid'),
      source: 'admin_manual',
      createdByUserId: currentUser.id,
      createdByUserName: currentUser.name,
      createdByUserRole: currentUser.role,
      items: invoiceItems,
      paymentMode: formRecordInitialPayment ? formInitialPayMode : undefined,
      paymentReference: formRecordInitialPayment ? formInitialPayRef : undefined,
      notes: formNotes || 'Direct manual invoice authorized by Admin.',
    });

    setIsCreateModalOpen(false);
    setSelectedInvoice(newInv);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* ─── PAGE HEADER & CONTROLS ─── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Receivables Governance
            </span>
            <span className="text-xs text-slate-400 font-medium">Centralized Enterprise Register</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Invoices &amp; Billing Register
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Single centralized register of all tax invoices generated across Field Sales and Admin desk. Tracks real-time collections and outstanding credit risk.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => {
              setFormCustomerId(customers[0]?.id || '');
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 text-xs font-bold rounded-2xl shadow-sm px-4 py-2.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Manual Invoice</span>
          </Button>
        </div>
      </div>

      {/* Global Action Feedback Alert */}
      {actionFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 font-semibold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{actionFeedback}</span>
          </div>
          <button type="button" onClick={() => setActionFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── MODERN KPI CARDS ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Invoiced</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatINR(metrics.totalInvoiced)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{invoices.length} total issued invoices</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Payments Collected</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{formatINR(metrics.totalCollected)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{metrics.paidCount} invoices paid in full</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Outstanding Receivables</div>
          <div className="text-2xl font-bold text-amber-500 mt-1">{formatINR(metrics.totalOutstanding)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{metrics.pendingCount} unpaid / partial balances</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overdue Alerts</div>
          <div className="text-2xl font-bold text-rose-500 mt-1">{formatINR(metrics.overdueAmount)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{metrics.overdueCount} invoices past due window</div>
        </div>
      </div>

      {/* ─── SEARCH & MULTI-FACET FILTER BAR ─── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-1">
            <SearchInput
              value={searchTerm}
              onChange={(val) => setSearchTerm(val)}
              placeholder="Search invoice #, customer, order, creator..."
              className="text-xs"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Payment Statuses</option>
              <option value="unpaid">Unpaid / Issued</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid in Full</option>
              <option value="overdue">Overdue Receivables</option>
            </select>
          </div>

          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Creation Sources</option>
              <option value="sales_order_payment">Sales Order Payment (Post-Payment)</option>
              <option value="admin_manual">Admin Manual Bill (Direct)</option>
            </select>
          </div>

          <div>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Operational Territories</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredInvoices.length}</strong> of{' '}
            <strong className="text-slate-800">{invoices.length}</strong> centralized invoices
          </span>
          {(searchTerm || statusFilter !== 'all' || sourceFilter !== 'all' || regionFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setSourceFilter('all');
                setRegionFilter('all');
              }}
              className="text-primary hover:underline font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ─── CENTRALIZED INVOICES TABLE ─── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-400 uppercase tracking-wider font-bold text-[10px] border-b border-slate-100">
                <th className="py-3 px-4">Invoice # &amp; Source</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Linked Order</th>
                <th className="py-3 px-4 text-center">Dates</th>
                <th className="py-3 px-4 text-right">Invoice Value</th>
                <th className="py-3 px-4 text-right">Paid (₹)</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Payment Status</th>
                <th className="py-3 px-4">Created By</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-slate-600">No invoices found matching your criteria</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your search terms or filters</p>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => {
                  const isPaid = inv.outstandingBalance <= 0 || inv.paymentStatus === 'paid';
                  const isOverdue = inv.status === 'overdue' || (!isPaid && new Date(inv.dueDate) < new Date());

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Invoice # & Source */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          className="font-bold text-slate-900 hover:text-primary font-mono text-xs flex items-center gap-1 text-left"
                        >
                          {inv.invoiceNumber}
                        </button>
                        <div className="mt-1">
                          {inv.source === 'admin_manual' ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              Admin Manual
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              Sales Payment Gate
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block truncate max-w-[180px]">
                          {inv.customerName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          ID: {inv.customerCode || inv.customerId}
                        </span>
                      </td>

                      {/* Linked Order */}
                      <td className="py-3 px-4">
                        {inv.orderNumber ? (
                          <span className="font-mono text-xs text-slate-700 block font-medium">
                            {inv.orderNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Direct Allocation</span>
                        )}
                        <span className="text-[10px] text-slate-400 block">{inv.regionName || 'North Territory'}</span>
                      </td>

                      {/* Dates */}
                      <td className="py-3 px-4 text-center">
                        <span className="text-slate-700 block font-medium">{formatDate(inv.invoiceDate)}</span>
                        <span
                          className={`text-[10px] block ${
                            isOverdue ? 'text-rose-600 font-bold' : 'text-slate-400'
                          }`}
                        >
                          Due: {formatDate(inv.dueDate)}
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(inv.totalAmount)}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600">
                        {formatINR(inv.paidAmount || 0)}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {isPaid ? (
                          <span className="text-emerald-600">₹0</span>
                        ) : (
                          <span className="text-rose-600">{formatINR(inv.outstandingBalance)}</span>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-4 text-center">
                        {isPaid ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center gap-1 w-max mx-auto">
                            <CheckCircle2 size={11} /> Paid in Full
                          </span>
                        ) : inv.paidAmount > 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center gap-1 w-max mx-auto">
                            <Clock size={11} /> Partially Paid
                          </span>
                        ) : isOverdue ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center gap-1 w-max mx-auto">
                            <AlertTriangle size={11} /> Overdue
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center gap-1 w-max mx-auto">
                            Unpaid / Issued
                          </span>
                        )}
                      </td>

                      {/* Created By */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 block truncate max-w-[140px]">
                          {inv.createdByUserName}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {inv.createdByUserRole === 'admin' ? 'Admin Desk' : `${inv.createdByUserRole} rep`}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Inspect complete invoice details & preview"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Record Payment shortcut if balance > 0 */}
                          {!isPaid ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRecordPayment(inv)}
                              className="px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-lg text-[10px] transition-colors"
                              title="Record payment remittance against this invoice"
                            >
                              Collect
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedInvoice(inv)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Download Tax Invoice (Fully Paid)"
                            >
                              <Download size={14} />
                            </button>
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

        {filteredInvoices.length > pageSize && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/40">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredInvoices.length / pageSize)}
              totalItems={filteredInvoices.length}
              itemsPerPage={pageSize}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* ─── MODAL: CREATE MANUAL INVOICE (ADMIN & MANAGER) ─── */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Manual Customer Invoice (Admin Desk)"
        description="Issue a direct tax invoice without requiring prior payment collection. Link to customer accounts and warehouse batches."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateManualInvoice} className="space-y-4 text-xs text-slate-700 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Customer Account *
              </label>
              <select
                value={formCustomerId}
                onChange={(e) => setFormCustomerId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code || c.id}) — Outstanding: {formatINR(c.currentOutstanding || 0)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Link to Sales Order (Optional)
              </label>
              <select
                value={formOrderId}
                onChange={(e) => handleSelectOrder(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">No Order Link (Direct Invoice)</option>
                {salesOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} — {o.customerName} ({formatINR(o.totalAmount)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={formInvoiceDate}
                onChange={(e) => setFormInvoiceDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Payment Due Date
              </label>
              <input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white mt-3">
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Itemized Products &amp; Batch Assignment
              </span>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
              >
                <Plus size={13} /> Add Product Line
              </button>
            </div>

            <div className="p-3 space-y-2.5">
              {formItems.map((item, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Product</label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleFormItemChange(idx, 'productId', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Batch Reference</label>
                    <select
                      value={item.batchId}
                      onChange={(e) => handleFormItemChange(idx, 'batchId', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                    >
                      {batches
                        .filter((b) => b.productId === item.productId)
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.batchNumber} (Avail: {b.availableQuantity})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleFormItemChange(idx, 'quantity', Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Unit Price (₹)</label>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleFormItemChange(idx, 'unitPrice', Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                    />
                  </div>

                  <div className="col-span-1 text-center pt-3">
                    {formItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove Line"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Banner */}
            <div className="bg-slate-100 p-3 flex justify-between items-center text-xs">
              <span className="text-slate-500">
                GST Tax Included (18% GSTR-1 compliant)
              </span>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-slate-600">Subtotal: {formatINR(formTotals.subtotal)}</span>
                <span className="text-slate-600">Tax: {formatINR(formTotals.totalTax)}</span>
                <span className="font-bold text-slate-900 text-sm">Total: {formatINR(formTotals.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Upfront Payment Recording Toggle */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-xs">
              <input
                type="checkbox"
                checked={formRecordInitialPayment}
                onChange={(e) => {
                  setFormRecordInitialPayment(e.target.checked);
                  if (e.target.checked && formInitialPaidAmount === 0) {
                    setFormInitialPaidAmount(formTotals.totalAmount);
                  }
                }}
                className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4"
              />
              <span>Record Initial Payment Received with this Invoice</span>
            </label>
            <p className="text-[11px] text-slate-500">
              By default, invoice creation does NOT count as collected revenue. If the customer already paid at point of sale, record remittance here.
            </p>

            {formRecordInitialPayment && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Amount Paid (₹)</label>
                  <input
                    type="number"
                    value={formInitialPaidAmount}
                    onChange={(e) => setFormInitialPaidAmount(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Payment Method</label>
                  <select
                    value={formInitialPayMode}
                    onChange={(e) => setFormInitialPayMode(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs"
                  >
                    <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="RTGS">RTGS</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Reference / UTR / Cheque #</label>
                  <input
                    type="text"
                    value={formInitialPayRef}
                    onChange={(e) => setFormInitialPayRef(e.target.value)}
                    placeholder="e.g. UTR-99014"
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Invoice Memo &amp; Notes
            </label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="e.g. Authorized under special regional enterprise allocation..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="font-bold">
              Generate &amp; Issue Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: RECORD PAYMENT REMITTANCE ─── */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Customer Payment Remittance"
        description="Verify and post customer cash or bank collection. This updates received revenue and reduces outstanding receivables."
        maxWidth="md"
      >
        {paymentTargetInvoice && (
          <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs text-slate-700 pt-2">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice:</span>
                <span className="font-mono font-bold text-slate-800">{paymentTargetInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-800">{paymentTargetInvoice.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Total:</span>
                <span className="font-mono">{formatINR(paymentTargetInvoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Already Paid:</span>
                <span className="font-mono text-emerald-600">{formatINR(paymentTargetInvoice.paidAmount || 0)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 pt-1">
                <span className="text-rose-600">Remaining Balance:</span>
                <span className="font-mono text-rose-600">{formatINR(paymentTargetInvoice.outstandingBalance)}</span>
              </div>
            </div>

            {paymentError && (
              <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {paymentError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Remittance Amount to Collect (₹) *
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                max={paymentTargetInvoice.outstandingBalance}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                <option value="UPI">UPI</option>
                <option value="RTGS">RTGS</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Reference / UTR / Cheque Number *
              </label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                required
                placeholder="e.g. UTR-HDFC-9912048"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Notes
              </label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Settlement reference notes..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="secondary" type="button" onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" className="font-bold">
                Confirm &amp; Post Collection
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─── MODAL: INVOICE DETAILS & PRINT PREVIEW ─── */}
      {selectedInvoice && (
        <Modal
          isOpen={Boolean(selectedInvoice)}
          onClose={() => setSelectedInvoice(null)}
          title={`Tax Invoice ${selectedInvoice.invoiceNumber}`}
          description={`Customer: ${selectedInvoice.customerName} • Source: ${selectedInvoice.source === 'admin_manual' ? 'Admin Direct Manual' : 'Sales Order Payment Gate'}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs text-slate-700 pt-2">
            {/* Header Details Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Invoice Number</span>
                <span className="font-mono text-base font-bold text-slate-900 block">{selectedInvoice.invoiceNumber}</span>
                <span className="text-[11px] text-slate-500">Order: {selectedInvoice.orderNumber || 'Direct Allocation'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer Details</span>
                <span className="font-bold text-slate-900 block truncate">{selectedInvoice.customerName}</span>
                <span className="text-[11px] text-slate-500 font-mono">ID: {selectedInvoice.customerCode || selectedInvoice.customerId}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Issue &amp; Due Date</span>
                <span className="text-slate-800 block">Issue: {formatDate(selectedInvoice.invoiceDate)}</span>
                <span className="text-slate-800 block">Due: {formatDate(selectedInvoice.dueDate)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Status</span>
                <span className="mt-1 block">
                  {selectedInvoice.outstandingBalance <= 0 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Paid in Full
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      Outstanding: {formatINR(selectedInvoice.outstandingBalance)}
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Simulated Communication Channels (Email & WhatsApp) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Send size={14} className="text-primary" />
                  <span>Customer Dispatch Channels (Simulated)</span>
                </div>
                <span className="text-[10px] text-slate-400">Live Client Distribution Status</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 block flex items-center gap-1">
                      <Mail size={13} className="text-blue-600" /> Email PDF Invoice
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {selectedInvoice.customerEmail || 'accounts@client.com'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={selectedInvoice.emailSent ? 'secondary' : 'primary'}
                    disabled={isSendingEmail}
                    onClick={() => handleTriggerEmail(selectedInvoice)}
                    className="text-xs px-2.5 py-1"
                  >
                    {isSendingEmail ? 'Sending...' : selectedInvoice.emailSent ? 'Resend' : 'Send Email'}
                  </Button>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 block flex items-center gap-1">
                      <Phone size={13} className="text-emerald-600" /> WhatsApp Notice
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {selectedInvoice.customerPhone || '+91 98000 00000'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isSendingWhatsApp}
                    onClick={() => handleTriggerWhatsApp(selectedInvoice)}
                    className="text-xs px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  >
                    {isSendingWhatsApp ? 'Sending...' : selectedInvoice.whatsAppSent ? 'Resend' : 'Send WhatsApp'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Invoiced Products & Batches Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Invoiced Line Items &amp; Batch Traceability
              </div>
              <div className="table-responsive">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                      <th className="py-2 px-3">Product Name &amp; SKU</th>
                      <th className="py-2 px-3 text-center">Batch Reference</th>
                      <th className="py-2 px-3 text-center">Quantity</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right font-bold">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                      selectedInvoice.items.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-slate-900 block">{it.productName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{it.productSku || it.productId}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              {it.batchNumber || 'B-ACTIVE'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-medium">
                            {it.quantity} {it.unit || 'Units'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">{formatINR(it.unitPrice)}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                            {formatINR(it.netAmount || it.unitPrice * it.quantity)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-3 px-3 text-center text-slate-400">
                          General commercial tax invoice allocation
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Summary */}
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
                <div className="w-72 space-y-1 font-mono text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Invoice Subtotal:</span>
                    <span>{formatINR(selectedInvoice.subtotal || Math.round(selectedInvoice.totalAmount / 1.18))}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>GST Tax (18%):</span>
                    <span>{formatINR(selectedInvoice.totalTax || Math.round(selectedInvoice.totalAmount - selectedInvoice.totalAmount / 1.18))}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-1 flex justify-between font-bold text-slate-900 text-sm">
                    <span>Total Invoiced:</span>
                    <span>{formatINR(selectedInvoice.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Payments Collected:</span>
                    <span>- {formatINR(selectedInvoice.paidAmount || 0)}</span>
                  </div>
                  <div className="border-t border-dashed border-slate-300 pt-1 flex justify-between font-bold text-sm">
                    <span className={selectedInvoice.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                      Balance Outstanding:
                    </span>
                    <span className={selectedInvoice.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                      {formatINR(selectedInvoice.outstandingBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                Created by <strong>{selectedInvoice.createdByUserName}</strong> on {formatDate(selectedInvoice.invoiceDate)}
              </span>

              <div className="flex items-center gap-2">
                {selectedInvoice.outstandingBalance > 0 && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      handleOpenRecordPayment(selectedInvoice);
                    }}
                    className="font-bold flex items-center gap-1.5"
                  >
                    <CreditCard size={14} />
                    <span>Record Payment</span>
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setSelectedInvoice(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default AdminInvoicesView;
