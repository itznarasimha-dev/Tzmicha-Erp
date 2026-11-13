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
  MessageSquare,
  Mail,
  HelpCircle,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  TrendingDown,
  Sparkles,
  FileText,
} from 'lucide-react';
import { Customer, SalesRemittanceEntry, Invoice, ReceiptPaymentIn } from '../../types';
import { formatINR, numberToIndianWords, maskAccountNumber } from '../../services/formatters';

export const FinanceReceivablesPaymentsView: React.FC = () => {
  const {
    customers,
    salesRemittances,
    invoices,
    receiptsPaymentsIn,
    companyProfiles,
    activeCompanyProfileId,
    recordPaymentIn,
    verifyCustomerRemittance,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'aging' | 'receipts' | 'remittances'>('aging');
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [selectedCustomerForStatement, setSelectedCustomerForStatement] = useState<Customer | null>(null);
  const [selectedReceiptDetail, setSelectedReceiptDetail] = useState<ReceiptPaymentIn | null>(null);

  // Record Multi-Invoice Allocation Modal State
  const [recordReceiptModalOpen, setRecordReceiptModalOpen] = useState(false);
  const [targetCustomerId, setTargetCustomerId] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<ReceiptPaymentIn['paymentMode']>('neft_rtgs');
  const [bankRef, setBankRef] = useState('');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('cba-01');
  const [allocations, setAllocations] = useState<{ [invoiceId: string]: number }>({});
  const [receiptRemarks, setReceiptRemarks] = useState('');

  // Remittance Verification Modal
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedRemittance, setSelectedRemittance] = useState<SalesRemittanceEntry | null>(null);
  const [discrepancyNote, setDiscrepancyNote] = useState('');

  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination
  const [agingPage, setAgingPage] = useState(1);
  const [agingPageSize, setAgingPageSize] = useState(8);
  const [rcpPage, setRcpPage] = useState(1);
  const [rcpPageSize, setRcpPageSize] = useState(8);
  const [remPage, setRemPage] = useState(1);
  const [remPageSize, setRemPageSize] = useState(8);

  // ─── AGING BUCKETS CALCULATION PER CUSTOMER ───
  const customerAgingData = useMemo(() => {
    const today = new Date('2026-11-12'); // System current fiscal date

    return (customers || []).map((cust) => {
      const custInvoices = (invoices || []).filter(
        (i) => i.customerId === cust.id && i.outstandingBalance > 0
      );

      let b0_30 = 0;
      let b31_60 = 0;
      let b61_90 = 0;
      let b90_plus = 0;

      custInvoices.forEach((inv) => {
        const due = new Date(inv.dueDate);
        const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 3600 * 24));

        if (diffDays <= 30) {
          b0_30 += inv.outstandingBalance;
        } else if (diffDays <= 60) {
          b31_60 += inv.outstandingBalance;
        } else if (diffDays <= 90) {
          b61_90 += inv.outstandingBalance;
        } else {
          b90_plus += inv.outstandingBalance;
        }
      });

      const totalOverdue = b31_60 + b61_90 + b90_plus;
      const totalOutstanding = b0_30 + totalOverdue;
      const creditUtilization = cust.creditLimit > 0 ? (totalOutstanding / cust.creditLimit) * 100 : 0;

      return {
        customer: cust,
        totalOutstanding,
        b0_30,
        b31_60,
        b61_90,
        b90_plus,
        totalOverdue,
        creditUtilization,
        invoicesCount: custInvoices.length,
      };
    });
  }, [customers, invoices]);

  // Filtered Aging Customers
  const filteredAging = useMemo(() => {
    return customerAgingData.filter((item) => {
      if (riskFilter === 'overdue' && item.totalOverdue <= 0) return false;
      if (riskFilter === 'high_risk' && item.b90_plus <= 0) return false;
      if (riskFilter === 'exceeded_limit' && item.creditUtilization <= 100) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          item.customer.name.toLowerCase().includes(q) ||
          item.customer.businessName.toLowerCase().includes(q) ||
          item.customer.phone.toLowerCase().includes(q) ||
          item.customer.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [customerAgingData, riskFilter, searchTerm]);

  // Filtered Receipts
  const filteredReceipts = useMemo(() => {
    return (receiptsPaymentsIn || []).filter((r) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          r.receiptNumber.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.bankReference.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [receiptsPaymentsIn, searchTerm]);

  // Filtered Remittances
  const filteredRemittances = useMemo(() => {
    return (salesRemittances || []).filter((r) => {
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

  const paginatedAging = useMemo(() => {
    return filteredAging.slice((agingPage - 1) * agingPageSize, agingPage * agingPageSize);
  }, [filteredAging, agingPage, agingPageSize]);

  const paginatedReceipts = useMemo(() => {
    return filteredReceipts.slice((rcpPage - 1) * rcpPageSize, rcpPage * rcpPageSize);
  }, [filteredReceipts, rcpPage, rcpPageSize]);

  const paginatedRemittances = useMemo(() => {
    return filteredRemittances.slice((remPage - 1) * remPageSize, remPage * remPageSize);
  }, [filteredRemittances, remPage, remPageSize]);

  // Overall Portfolio Metrics
  const agingMetrics = useMemo(() => {
    let totalOutstanding = 0;
    let b0_30 = 0;
    let b31_60 = 0;
    let b61_90 = 0;
    let b90_plus = 0;

    customerAgingData.forEach((d) => {
      totalOutstanding += d.totalOutstanding;
      b0_30 += d.b0_30;
      b31_60 += d.b31_60;
      b61_90 += d.b61_90;
      b90_plus += d.b90_plus;
    });

    return { totalOutstanding, b0_30, b31_60, b61_90, b90_plus };
  }, [customerAgingData]);

  // Open Multi-Invoice Allocation Modal
  const handleOpenRecordReceiptModal = (cust?: Customer) => {
    const cid = cust ? cust.id : customers[0]?.id || '';
    setTargetCustomerId(cid);

    const custInvs = (invoices || []).filter((i) => i.customerId === cid && i.outstandingBalance > 0);
    const totalDue = custInvs.reduce((s, i) => s + i.outstandingBalance, 0);

    setReceivedAmount(totalDue > 0 ? totalDue.toString() : '50000');
    setPaymentMode('neft_rtgs');
    setBankRef(`UTR-${Date.now().toString().slice(-6)}`);
    setSelectedBankAccountId('cba-01');
    setReceiptRemarks('');

    // Pre-populate FIFO allocation
    const initialAlloc: { [id: string]: number } = {};
    let rem = totalDue;
    custInvs.forEach((inv) => {
      const take = Math.min(rem, inv.outstandingBalance);
      if (take > 0) {
        initialAlloc[inv.id] = take;
        rem -= take;
      }
    });
    setAllocations(initialAlloc);

    setRecordReceiptModalOpen(true);
  };

  // Recompute allocation when target customer or received amount changes
  const targetCustomerInvoices = useMemo(() => {
    if (!targetCustomerId) return [];
    return (invoices || []).filter((i) => i.customerId === targetCustomerId && i.outstandingBalance > 0);
  }, [targetCustomerId, invoices]);

  const totalAllocatedAmount = useMemo(() => {
    return Object.values(allocations).reduce((sum, val) => sum + (Number(val) || 0), 0);
  }, [allocations]);

  const unallocatedAdvance = useMemo(() => {
    const totalRecv = Number(receivedAmount) || 0;
    return Math.max(0, Math.round((totalRecv - totalAllocatedAmount) * 100) / 100);
  }, [receivedAmount, totalAllocatedAmount]);

  const handleAllocationChange = (invId: string, val: string) => {
    const num = Math.max(0, Number(val) || 0);
    setAllocations((prev) => ({
      ...prev,
      [invId]: num,
    }));
  };

  const handleAutoAllocateFIFO = () => {
    let rem = Number(receivedAmount) || 0;
    const newAlloc: { [id: string]: number } = {};

    targetCustomerInvoices.forEach((inv) => {
      const take = Math.min(rem, inv.outstandingBalance);
      if (take > 0) {
        newAlloc[inv.id] = take;
        rem -= take;
      }
    });
    setAllocations(newAlloc);
  };

  const handleConfirmSaveReceipt = () => {
    if (!targetCustomerId || !receivedAmount || isSubmitting) return;
    const amt = Number(receivedAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid received amount.');
      return;
    }

    const cust = (customers || []).find((c) => c.id === targetCustomerId);
    if (!cust) return;

    setIsSubmitting(true);
    try {
      const allocArray = Object.entries(allocations)
        .filter(([_, allocAmt]) => allocAmt > 0)
        .map(([invId, allocAmt]) => {
          const matchedInv = targetCustomerInvoices.find((i) => i.id === invId);
          return {
            invoiceId: invId,
            invoiceNumber: matchedInv?.invoiceNumber || invId,
            allocatedAmount: allocAmt,
          };
        });

      const receipt = recordPaymentIn({
        receiptNumber: '',
        companyProfileId: activeCompanyProfileId,
        customerId: targetCustomerId,
        customerName: cust.name,
        customerGstin: cust.gstin,
        receiptDate: new Date().toISOString().split('T')[0],
        amountReceived: amt,
        amountInWords: numberToIndianWords(amt),
        paymentMode,
        bankReference: bankRef || `UTR-${Date.now().toString().slice(-6)}`,
        companyBankAccountId: selectedBankAccountId,
        idempotencyKey: `idemp-rcp-${Date.now()}`,
        allocations: allocArray,
        unallocatedAdvance,
        status: 'posted',
        notes: receiptRemarks || `Payment received from ${cust.name}`,
        createdByUserId: 'usr-fin-01',
        createdByUserName: 'Suresh Singhania (CFO)',
      });

      setSuccessToast(`Payment receipt ${receipt.receiptNumber} recorded for ${formatINR(amt)}! Invoices and ledgers updated.`);
      setTimeout(() => setSuccessToast(null), 5000);
      setRecordReceiptModalOpen(false);
    } catch (err: any) {
      alert(`Error saving receipt: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dunning simulated actions
  const handleSendDunningNotice = (custName: string, channel: 'whatsapp' | 'email') => {
    setSuccessToast(`Automated ${channel.toUpperCase()} dunning notice & aging statement dispatched to accounts team of ${custName}.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <div className="space-y-5">
      {successToast && (
        <div className="p-3.5 bg-emerald-50/90 backdrop-blur-md border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <Badge variant="success" size="sm">Updated</Badge>
        </div>
      )}

      {/* ─── HEADER & TAB SWITCHER ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-3xl backdrop-blur-xl bg-white/70 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Customer Receivables, Aging Matrix &amp; Receipts
            </h1>
            <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
              FIFO Allocation
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time 4-bucket aging analysis, multi-invoice payment allocation with on-account advances, and dunning triggers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleOpenRecordReceiptModal()}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1" />
            Record Payment In
          </Button>

          {/* Sub Tab Switcher */}
          <div className="flex items-center p-1 bg-slate-100/80 rounded-2xl border border-slate-200 text-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('aging');
                setRiskFilter('all');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'aging' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aging Matrix ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('receipts');
                setRiskFilter('all');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'receipts' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Receipts Register ({receiptsPaymentsIn?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('remittances');
                setRiskFilter('all');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'remittances' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Field Remittances ({salesRemittances.length})
            </button>
          </div>
        </div>
      </div>

      {/* ─── 4-BUCKET AGING SUMMARY CARDS ─── */}
      {activeTab === 'aging' && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="backdrop-blur-md bg-white/80 p-3.5 rounded-2xl border border-slate-200/80 shadow-xs col-span-2 md:col-span-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Receivables</span>
            <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
              {formatINR(agingMetrics.totalOutstanding)}
            </div>
            <span className="text-[10px] text-slate-400">Total customer book</span>
          </div>

          <div className="backdrop-blur-md bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-emerald-800">Current (0-30 Days)</span>
              <Badge variant="success" size="sm" className="text-[9px]">Normal</Badge>
            </div>
            <div className="text-lg font-bold text-emerald-950 font-mono mt-0.5">
              {formatINR(agingMetrics.b0_30)}
            </div>
            <span className="text-[10px] text-emerald-700">Within payment terms</span>
          </div>

          <div className="backdrop-blur-md bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-amber-800">31-60 Days</span>
              <Badge variant="warning" size="sm" className="text-[9px]">Soft Dunning</Badge>
            </div>
            <div className="text-lg font-bold text-amber-950 font-mono mt-0.5">
              {formatINR(agingMetrics.b31_60)}
            </div>
            <span className="text-[10px] text-amber-700">First email reminder</span>
          </div>

          <div className="backdrop-blur-md bg-orange-50/60 p-3.5 rounded-2xl border border-orange-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-orange-800">61-90 Days</span>
              <Badge variant="warning" size="sm" className="text-[9px]">Phone Follow-up</Badge>
            </div>
            <div className="text-lg font-bold text-orange-950 font-mono mt-0.5">
              {formatINR(agingMetrics.b61_90)}
            </div>
            <span className="text-[10px] text-orange-700">Urgent collections</span>
          </div>

          <div className="backdrop-blur-md bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-rose-800">90+ Days (Critical)</span>
              <Badge variant="danger" size="sm" className="text-[9px]">Hold Dispatches</Badge>
            </div>
            <div className="text-lg font-bold text-rose-950 font-mono mt-0.5">
              {formatINR(agingMetrics.b90_plus)}
            </div>
            <span className="text-[10px] text-rose-700">Credit hold recommended</span>
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
              activeTab === 'aging'
                ? "Search customer, business, phone, ID..."
                : activeTab === 'receipts'
                ? "Search receipt #, customer, UTR ref..."
                : "Search remittance #, sales rep..."
            }
            className="text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'aging' && (
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Debtors Portfolio</option>
              <option value="overdue">Overdue Invoices Only</option>
              <option value="high_risk">90+ Days Critical Dues</option>
              <option value="exceeded_limit">Credit Limit Breached</option>
            </select>
          )}
        </div>
      </div>

      {/* ─── AGING MATRIX TABLE ─── */}
      {activeTab === 'aging' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/70">
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Credit Limit &amp; Terms</th>
                  <th className="py-3 px-4 text-right">0-30 Days</th>
                  <th className="py-3 px-4 text-right">31-60 Days</th>
                  <th className="py-3 px-4 text-right">61-90 Days</th>
                  <th className="py-3 px-4 text-right">90+ Days</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-700">Total Outstanding</th>
                  <th className="py-3 px-4 text-center">Risk Badge</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredAging.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                      No debtor accounts match the selected filter.
                    </td>
                  </tr>
                ) : (
                  paginatedAging.map((row) => {
                    const c = row.customer;
                    const isExceeded = row.creditUtilization > 100;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{c.name}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {c.businessName} • {c.phone}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">
                            {formatINR(c.creditLimit)}
                          </span>
                          <span className={`text-[10px] font-mono block ${isExceeded ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                            {row.creditUtilization.toFixed(0)}% Utilized (30 Days)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700">
                          {row.b0_30 > 0 ? formatINR(row.b0_30) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-amber-700">
                          {row.b31_60 > 0 ? formatINR(row.b31_60) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-orange-700">
                          {row.b61_90 > 0 ? formatINR(row.b61_90) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-700 font-bold">
                          {row.b90_plus > 0 ? formatINR(row.b90_plus) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-950">
                          {formatINR(row.totalOutstanding)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {row.b90_plus > 0 ? (
                            <Badge variant="danger" size="sm">Critical 90+</Badge>
                          ) : isExceeded ? (
                            <Badge variant="warning" size="sm">Limit Breached</Badge>
                          ) : row.totalOverdue > 0 ? (
                            <Badge variant="warning" size="sm">Overdue</Badge>
                          ) : (
                            <Badge variant="success" size="sm">Healthy</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedCustomerForStatement(c)}
                              className="h-7 text-xs px-2"
                              title="Customer 360 Statement of Account"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1" />
                              Statement
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendDunningNotice(c.name, 'whatsapp')}
                              className="h-7 text-xs px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              title="Send WhatsApp Payment Follow-up"
                            >
                              <Send className="w-3 h-3 mr-1" />
                              WhatsApp
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleOpenRecordReceiptModal(c)}
                              className="h-7 text-xs px-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                              title="Record received payment against invoices"
                            >
                              Pay In
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

          {filteredAging.length > agingPageSize && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/40">
              <Pagination
                currentPage={agingPage}
                totalPages={Math.ceil(filteredAging.length / agingPageSize)}
                totalItems={filteredAging.length}
                itemsPerPage={agingPageSize}
                onPageChange={setAgingPage}
                onItemsPerPageChange={(size) => {
                  setAgingPageSize(size);
                  setAgingPage(1);
                }}
              />
            </div>
          )}
        </Card>
      )}

      {/* ─── RECEIPTS REGISTER TABLE ─── */}
      {activeTab === 'receipts' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/70">
                  <th className="py-3 px-4">Receipt # &amp; Date</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Payment Mode &amp; UTR</th>
                  <th className="py-3 px-4 text-right">Amount Received</th>
                  <th className="py-3 px-4 text-center">Allocated Invoices</th>
                  <th className="py-3 px-4 text-right">Unallocated Advance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      No payment receipts posted yet.
                    </td>
                  </tr>
                ) : (
                  paginatedReceipts.map((rcp) => (
                    <tr key={rcp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {rcp.receiptNumber}
                        <span className="text-[10px] text-slate-400 block font-normal font-sans">
                          {rcp.receiptDate}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{rcp.customerName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {rcp.customerGstin || 'Unregistered'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold uppercase text-slate-800 block text-[11px]">
                          {rcp.paymentMode.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-indigo-600 font-mono block">
                          {rcp.bankReference}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                        {formatINR(rcp.amountReceived)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge size="sm" variant="neutral">
                          {rcp.allocations?.length || 0} Invoices
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {rcp.unallocatedAdvance > 0 ? (
                          <span className="text-indigo-700">{formatINR(rcp.unallocatedAdvance)}</span>
                        ) : (
                          <span className="text-slate-400">₹0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge size="sm" variant={rcp.status === 'posted' ? 'success' : 'danger'}>
                          {rcp.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedReceiptDetail(rcp)}
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

          {filteredReceipts.length > rcpPageSize && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/40">
              <Pagination
                currentPage={rcpPage}
                totalPages={Math.ceil(filteredReceipts.length / rcpPageSize)}
                totalItems={filteredReceipts.length}
                itemsPerPage={rcpPageSize}
                onPageChange={setRcpPage}
                onItemsPerPageChange={(size) => {
                  setRcpPageSize(size);
                  setRcpPage(1);
                }}
              />
            </div>
          )}
        </Card>
      )}

      {/* ─── FIELD REMITTANCES TABLE ─── */}
      {activeTab === 'remittances' && (
        <Card className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/70">
                  <th className="py-3 px-4">Remittance #</th>
                  <th className="py-3 px-4">Sales Rep Details</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4 text-right">Remitted Amount</th>
                  <th className="py-3 px-4">Bank Ref</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredRemittances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      No field remittances recorded.
                    </td>
                  </tr>
                ) : (
                  paginatedRemittances.map((rem) => (
                    <tr key={rem.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {rem.entryNumber}
                        <span className="text-[10px] text-slate-400 block font-normal font-sans">
                          {rem.date}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{rem.salesUserName}</span>
                        <span className="text-[10px] text-slate-400">ID: {rem.salesUserId}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{rem.customerName || 'Multi-Party Cash'}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                        {formatINR(rem.amount)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {rem.referenceNumber}
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
                          {rem.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {rem.status === 'pending_verification' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                verifyCustomerRemittance(rem.id, true);
                                setSuccessToast(`Remittance ${rem.entryNumber} verified and credited.`);
                                setTimeout(() => setSuccessToast(null), 3000);
                              }}
                              className="h-7 text-xs px-2"
                            >
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                verifyCustomerRemittance(rem.id, false, 'Discrepancy in bank credit');
                                setSuccessToast(`Remittance ${rem.entryNumber} marked as rejected.`);
                                setTimeout(() => setSuccessToast(null), 3000);
                              }}
                              className="h-7 text-xs px-2 text-rose-700 border-rose-200"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── CUSTOMER 360 STATEMENT OF ACCOUNT MODAL ─── */}
      {selectedCustomerForStatement && (
        <Modal
          isOpen={!!selectedCustomerForStatement}
          onClose={() => setSelectedCustomerForStatement(null)}
          title={`Statement of Account: ${selectedCustomerForStatement.name}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{selectedCustomerForStatement.name}</h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  ID: {selectedCustomerForStatement.id} • Phone: {selectedCustomerForStatement.phone}
                </p>
                <p className="text-[10px] text-slate-400">GSTIN: {selectedCustomerForStatement.gstin || 'Unregistered'}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Balance Outstanding</span>
                <span className="text-base font-bold font-mono text-rose-700 block">
                  {formatINR(selectedCustomerForStatement.currentOutstanding)}
                </span>
                <span className="text-[10px] text-slate-500">Credit Limit: {formatINR(selectedCustomerForStatement.creditLimit)}</span>
              </div>
            </div>

            {/* Invoices list */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs mb-2">Unpaid &amp; Active Tax Invoices</h4>
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-semibold text-[10px]">
                      <th className="py-2 px-3">Invoice #</th>
                      <th className="py-2 px-3">Invoice Date</th>
                      <th className="py-2 px-3">Due Date</th>
                      <th className="py-2 px-3 text-right">Total Amount</th>
                      <th className="py-2 px-3 text-right">Paid</th>
                      <th className="py-2 px-3 text-right">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(invoices || [])
                      .filter((i) => i.customerId === selectedCustomerForStatement.id)
                      .map((inv) => (
                        <tr key={inv.id}>
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">{inv.invoiceNumber}</td>
                          <td className="py-2 px-3">{inv.invoiceDate}</td>
                          <td className="py-2 px-3">{inv.dueDate}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatINR(inv.totalAmount)}</td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-700">{formatINR(inv.paidAmount)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                            {formatINR(inv.outstandingBalance)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                Print Statement
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedCustomerForStatement(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── RECORD PAYMENT IN MODAL (MULTI-INVOICE FIFO ALLOCATION) ─── */}
      {recordReceiptModalOpen && (
        <Modal
          isOpen={recordReceiptModalOpen}
          onClose={() => setRecordReceiptModalOpen(false)}
          title="Record Customer Payment Receipt (Multi-Invoice Allocation)"
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs text-slate-800">
            {/* Customer & Bank Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-indigo-50/60 rounded-2xl border border-indigo-200">
              <div>
                <label className="text-[10px] font-bold text-indigo-900 uppercase block mb-1">Debtor Customer</label>
                <select
                  value={targetCustomerId}
                  onChange={(e) => setTargetCustomerId(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-indigo-200 bg-white font-semibold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {(customers || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Due: {formatINR(c.currentOutstanding)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-indigo-900 uppercase block mb-1">Total Amount Received (₹)</label>
                <input
                  type="number"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-indigo-200 bg-white font-mono font-bold text-indigo-950 focus:outline-none"
                  placeholder="Enter total money received"
                />
              </div>
            </div>

            {/* Payment Mode & Bank Ref */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-0.5">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-white focus:outline-none cursor-pointer"
                >
                  <option value="neft_rtgs">NEFT / RTGS Wire</option>
                  <option value="upi">Company UPI / QR</option>
                  <option value="cheque">Account Payee Cheque</option>
                  <option value="cash">Petty Cash Counterfoil</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-0.5">Bank Ref / UTR #</label>
                <input
                  type="text"
                  value={bankRef}
                  onChange={(e) => setBankRef(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono text-slate-900 focus:outline-none"
                  placeholder="e.g. UTR-998822"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-0.5">Deposit Account</label>
                <select
                  value={selectedBankAccountId}
                  onChange={(e) => setSelectedBankAccountId(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-white focus:outline-none cursor-pointer"
                >
                  <option value="cba-01">HDFC Operating A/C (•••• 9921)</option>
                  <option value="cba-02">ICICI Collections A/C (•••• 4411)</option>
                </select>
              </div>
            </div>

            {/* Invoices Allocation Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block text-xs">
                    Allocate to Outstanding Invoices ({targetCustomerInvoices.length} Pending)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Allocated: {formatINR(totalAllocatedAmount)} • Advance Remaining: {formatINR(unallocatedAdvance)}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAutoAllocateFIFO}
                  className="h-6 text-[10px] px-2 text-indigo-700 border-indigo-200"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Auto-Allocate FIFO
                </Button>
              </div>

              {targetCustomerInvoices.length === 0 ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px]">
                  No unpaid invoices found for this customer. Entire amount of {formatINR(Number(receivedAmount) || 0)} will be credited as an On-Account Advance.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-48">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-semibold text-[10px]">
                        <th className="py-2 px-3">Invoice #</th>
                        <th className="py-2 px-3">Due Date</th>
                        <th className="py-2 px-3 text-right">Balance Due</th>
                        <th className="py-2 px-3 text-right">Allocate Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {targetCustomerInvoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">{inv.invoiceNumber}</td>
                          <td className="py-2 px-3 text-[11px] text-slate-500">{inv.dueDate}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                            {formatINR(inv.outstandingBalance)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              value={allocations[inv.id] || ''}
                              onChange={(e) => handleAllocationChange(inv.id, e.target.value)}
                              max={inv.outstandingBalance}
                              className="w-28 text-right p-1 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none"
                              placeholder="0.00"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Remarks / Reference Notes</label>
              <input
                type="text"
                value={receiptRemarks}
                onChange={(e) => setReceiptRemarks(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none"
                placeholder="Optional banking notes or drawer endorsement"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setRecordReceiptModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmSaveReceipt}
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                {isSubmitting ? 'Posting Receipt...' : 'Post Customer Receipt'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── RECEIPT DETAIL MODAL ─── */}
      {selectedReceiptDetail && (
        <Modal
          isOpen={!!selectedReceiptDetail}
          onClose={() => setSelectedReceiptDetail(null)}
          title={`Customer Receipt: ${selectedReceiptDetail.receiptNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-emerald-950 text-base">
                  {selectedReceiptDetail.receiptNumber}
                </span>
                <Badge variant="success" size="sm">{selectedReceiptDetail.status.toUpperCase()}</Badge>
              </div>
              <p className="text-[11px] text-emerald-800 mt-1">
                Receipt Date: {selectedReceiptDetail.receiptDate} • Mode: {selectedReceiptDetail.paymentMode.toUpperCase()}
              </p>
            </div>

            <div className="space-y-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{selectedReceiptDetail.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bank Reference (UTR):</span>
                <span className="font-mono font-bold text-indigo-700">{selectedReceiptDetail.bankReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Received:</span>
                <span className="font-mono font-bold text-emerald-800">{formatINR(selectedReceiptDetail.amountReceived)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">On-Account Advance:</span>
                <span className="font-mono font-bold text-indigo-900">{formatINR(selectedReceiptDetail.unallocatedAdvance)}</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
              <span className="font-bold text-slate-500 uppercase text-[9px] block">Amount in Words:</span>
              <span className="italic text-slate-800">{selectedReceiptDetail.amountInWords}</span>
            </div>

            {/* Allocations breakdown */}
            <div>
              <span className="font-bold block text-slate-700 text-xs mb-1">Invoice Allocations</span>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                {selectedReceiptDetail.allocations?.map((a) => (
                  <div key={a.invoiceId} className="p-2 flex justify-between items-center">
                    <span className="font-mono font-bold text-indigo-700">{a.invoiceNumber}</span>
                    <span className="font-mono font-bold text-emerald-800">{formatINR(a.allocatedAmount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedReceiptDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
