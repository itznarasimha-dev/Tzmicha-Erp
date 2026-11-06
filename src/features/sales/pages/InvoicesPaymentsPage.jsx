import { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Eye,
  Receipt,
  Download,
  Lock,
  BookOpen,
  FileSpreadsheet,
  History,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
} from 'lucide-react';
import DataTable from '../components/common/DataTable';
import SearchFilterBar from '../components/common/SearchFilterBar';
import StatusBadge from '../components/common/StatusBadge';
import RecordPaymentModal from '../components/modals/RecordPaymentModal';
import InvoiceDetailModal from '../components/modals/InvoiceDetailModal';
import CreateInvoiceModal from '../components/modals/CreateInvoiceModal';
import PaymentReminderModal from '../components/modals/PaymentReminderModal';
import InvoiceDocumentPreviewModal from '../components/modals/InvoiceDocumentPreviewModal';
import InvoiceHistoryModal from '../components/modals/InvoiceHistoryModal';
import { useSales } from '../context/SalesContext';
import { useToast } from '../context/ToastContext';
import { formatINR, formatDate } from '../utils/formatters';
import { downloadInvoiceDocument, downloadPaymentReceipt } from '../utils/documentGenerator';
import {
  isCustomerInRoleScope,
  getInvoiceFollowUpPriority,
  calculatePercentagePaid,
  getOrderClosureMilestone,
} from '../utils/roleScoping';

export default function InvoicesPaymentsPage({ initialTab = 'invoices' }) {
  const { invoices, payments, customers, orders, updateInvoice, userRole, userProfile } = useSales();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState(initialTab); // 'invoices' | 'payments' | 'ledger'
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({
    status: 'all',
    method: 'all',
    paymentType: 'all',
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState(null);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [reminderTargetInvoice, setReminderTargetInvoice] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTargetInvoice, setHistoryTargetInvoice] = useState(null);

  const invoiceFilters = [
    {
      key: 'status',
      label: 'Invoice Status',
      options: [
        { value: 'Issued', label: 'Issued (Awaiting Payment)' },
        { value: 'Partially Paid', label: 'Partially Paid' },
        { value: 'Overdue', label: 'Overdue (Receivables Alert)' },
        { value: 'Paid', label: 'Paid in Full' },
      ],
    },
  ];

  const paymentFilters = [
    {
      key: 'method',
      label: 'Payment Method',
      options: [
        { value: 'Bank Transfer / NEFT', label: 'Bank Transfer / NEFT' },
        { value: 'UPI', label: 'UPI' },
        { value: 'Cheque', label: 'Cheque' },
        { value: 'RTGS', label: 'RTGS' },
        { value: 'Cash', label: 'Cash' },
      ],
    },
  ];

  const ledgerFilters = [
    {
      key: 'paymentType',
      label: 'Transaction Type',
      options: [
        { value: 'Advance Payment', label: 'Advance Payment' },
        { value: 'Installment', label: 'Installment' },
        { value: 'Dispatch-Related Payment', label: 'Dispatch-Related Payment' },
        { value: 'Final Payment', label: 'Final Payment' },
      ],
    },
    {
      key: 'method',
      label: 'Payment Method',
      options: [
        { value: 'Bank Transfer / NEFT', label: 'Bank Transfer / NEFT' },
        { value: 'UPI', label: 'UPI' },
        { value: 'Cheque', label: 'Cheque' },
        { value: 'RTGS', label: 'RTGS' },
        { value: 'Cash', label: 'Cash' },
      ],
    },
  ];

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSearch('');
    setFilterValues({ status: 'all', method: 'all', paymentType: 'all' });
  };

  // Role-scoped invoices and payments
  const scopedInvoices = useMemo(() => {
    return invoices.filter((i) => {
      const customer = customers.find(
        (c) => c.id === i.customerId || c.customerId === i.customerId || c.name === i.customerName
      );
      return isCustomerInRoleScope(customer, userRole, userProfile);
    });
  }, [invoices, customers, userRole, userProfile]);

  const scopedPayments = useMemo(() => {
    return payments.filter((p) => {
      const customer = customers.find(
        (c) => c.id === p.customerId || c.customerId === p.customerId || c.name === p.customerName
      );
      return isCustomerInRoleScope(customer, userRole, userProfile);
    });
  }, [payments, customers, userRole, userProfile]);

  // Top summary metrics
  const metrics = useMemo(() => {
    const totalInvoiced = scopedInvoices.reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);
    const totalCollected = scopedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalOutstanding = scopedInvoices.reduce((sum, i) => sum + Number(i.balance || 0), 0);
    const overdueInvoices = scopedInvoices.filter((i) => i.status === 'Overdue');
    const overdueAmount = overdueInvoices.reduce((sum, i) => sum + Number(i.balance || 0), 0);

    return {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      overdueCount: overdueInvoices.length,
      overdueAmount,
    };
  }, [scopedInvoices, scopedPayments]);

  // Cross-module Service Completion Notifications
  const serviceCompletionAlerts = useMemo(() => {
    return orders
      .filter((o) => o.serviceHandoff && o.serviceHandoff.serviceCompletionStatus === 'Completed')
      .map((o) => {
        const inv = invoices.find((i) => i.orderNo === o.orderNo || i.id === o.invoiceNo);
        const cust = customers.find((c) => c.id === o.customerId || c.customerId === o.customerId) || {};
        const verifiedOutstanding = inv ? inv.balance : o.pendingBalance;
        return {
          orderNo: o.orderNo,
          invoiceNo: inv?.invoiceNo || 'INV-Pending',
          customerId: cust.customerId || o.customerId,
          customerName: o.customerName,
          serviceRef: o.serviceHandoff.serviceReference || 'SRV-REC',
          completionDate: o.serviceHandoff.serviceCompletionDate || '2026-10-24',
          remarks: o.serviceHandoff.serviceCompletionRemarks || 'Installation and commissioning verified on-site.',
          outstandingAmount: verifiedOutstanding,
          notificationMessage: 'Service completed. The remaining amount can now be collected.',
        };
      });
  }, [orders, invoices, customers]);

  // Operational Delivery Confirmation Alerts
  const deliveredAwaitingPaymentOrders = useMemo(() => {
    return orders
      .filter((o) => o.fulfilmentStatus === 'Delivered' && Number(o.pendingBalance || 0) > 0)
      .map((o) => {
        const inv = invoices.find((i) => i.orderNo === o.orderNo || i.id === o.invoiceNo);
        const cust = customers.find((c) => c.id === o.customerId || c.customerId === o.customerId) || {};
        return {
          orderNo: o.orderNo,
          invoiceNo: inv?.invoiceNo || 'INV-Pending',
          customerId: cust.customerId || o.customerId,
          customerName: o.customerName,
          pendingBalance: inv ? inv.balance : o.pendingBalance,
        };
      });
  }, [orders, invoices, customers]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return scopedInvoices.filter((i) => {
      const searchLower = search.toLowerCase();
      const customer = customers.find(
        (c) => c.id === i.customerId || c.customerId === i.customerId || c.name === i.customerName
      );
      const displayId = customer?.customerId || i.customerDisplayId || i.customerId || '';

      const matchesSearch =
        !search.trim() ||
        i.invoiceNo.toLowerCase().includes(searchLower) ||
        i.customerName.toLowerCase().includes(searchLower) ||
        displayId.toLowerCase().includes(searchLower) ||
        (i.orderNo && i.orderNo.toLowerCase().includes(searchLower));

      const matchesStatus =
        filterValues.status === 'all' || i.status === filterValues.status;

      return matchesSearch && matchesStatus;
    });
  }, [scopedInvoices, search, filterValues, customers]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    return scopedPayments.filter((p) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search.trim() ||
        p.receiptNo.toLowerCase().includes(searchLower) ||
        p.customerName.toLowerCase().includes(searchLower) ||
        (p.invoiceNo && p.invoiceNo.toLowerCase().includes(searchLower)) ||
        (p.referenceNo && p.referenceNo.toLowerCase().includes(searchLower));

      const matchesMethod =
        filterValues.method === 'all' || p.method === filterValues.method;

      return matchesSearch && matchesMethod;
    });
  }, [scopedPayments, search, filterValues]);

  // Construct comprehensive Transaction Ledger entries
  const ledgerEntries = useMemo(() => {
    return scopedPayments.map((p) => {
      const inv = invoices.find((i) => i.invoiceNo === p.invoiceNo);
      const orderNo = p.orderNo || inv?.orderNo;
      const ord = orders.find((o) => o.orderNo === orderNo || o.id === orderNo);

      const totalOrderValue = ord ? Number(ord.totalAmount || 0) : (inv ? Number(inv.totalAmount || 0) : Number(p.amount || 0));
      const totalCollected = ord ? Number(ord.amountPaid ?? (inv ? inv.paidAmount : p.amount)) : (inv ? Number(inv.paidAmount || p.amount) : Number(p.amount || 0));
      const remainingBalance = ord ? Number(ord.pendingBalance ?? Math.max(0, totalOrderValue - totalCollected)) : (inv ? Number(inv.balance || 0) : 0);
      const paymentStatus = ord?.paymentStatus || inv?.status || (remainingBalance <= 0 ? 'Paid' : 'Partially Paid');

      return {
        ...p,
        orderNo: orderNo || '—',
        totalOrderValue,
        totalCollected,
        remainingBalance,
        paymentStatus,
        rawInvoice: inv,
        rawOrder: ord,
      };
    });
  }, [payments, invoices, orders]);

  // Filter Ledger
  const filteredLedger = useMemo(() => {
    return ledgerEntries.filter((row) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search.trim() ||
        row.receiptNo?.toLowerCase().includes(searchLower) ||
        row.customerName?.toLowerCase().includes(searchLower) ||
        row.orderNo?.toLowerCase().includes(searchLower) ||
        row.invoiceNo?.toLowerCase().includes(searchLower) ||
        row.referenceNo?.toLowerCase().includes(searchLower) ||
        row.paymentType?.toLowerCase().includes(searchLower);

      const matchesType =
        filterValues.paymentType === 'all' || !filterValues.paymentType || row.paymentType === filterValues.paymentType;

      const matchesMethod =
        filterValues.method === 'all' || !filterValues.method || row.method === filterValues.method;

      return matchesSearch && matchesType && matchesMethod;
    });
  }, [ledgerEntries, search, filterValues]);

  // Ledger summary calculations
  const ledgerSummary = useMemo(() => {
    const totalCollected = filteredLedger.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    // Unique orders in filtered ledger
    const uniqueOrders = new Set(filteredLedger.map((r) => r.orderNo).filter(Boolean));
    const totalOrderValue = Array.from(uniqueOrders).reduce((sum, oNo) => {
      const ord = orders.find((o) => o.orderNo === oNo || o.id === oNo);
      return sum + (ord ? Number(ord.totalAmount || 0) : 0);
    }, 0);
    const totalPending = Array.from(uniqueOrders).reduce((sum, oNo) => {
      const ord = orders.find((o) => o.orderNo === oNo || o.id === oNo);
      return sum + (ord ? Number(ord.pendingBalance || 0) : 0);
    }, 0);

    return {
      transactionCount: filteredLedger.length,
      totalCollected,
      totalOrderValue: totalOrderValue || totalCollected,
      totalPending,
    };
  }, [filteredLedger, orders]);

  const handleExportLedgerCSV = () => {
    if (filteredLedger.length === 0) {
      showToast('No ledger entries available to export', 'warning');
      return;
    }
    const headers = [
      'Receipt #',
      'Date',
      'Customer',
      'Order #',
      'Invoice #',
      'Payment Type',
      'Mode',
      'Reference / UTR',
      'Order Value (INR)',
      'Transaction Amount (INR)',
      'Total Collected (INR)',
      'Remaining Balance (INR)',
      'Payment Status',
    ];
    const rows = filteredLedger.map((r) => [
      r.receiptNo,
      r.paymentDate,
      `"${(r.customerName || '').replace(/"/g, '""')}"`,
      r.orderNo,
      r.invoiceNo,
      r.paymentType || 'Advance Payment',
      r.method,
      r.referenceNo || '',
      r.totalOrderValue,
      r.amount,
      r.totalCollected,
      r.remainingBalance,
      r.paymentStatus,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Ledger exported successfully to CSV', 'success');
  };

  const handleDownloadInvoice = (invoice) => {
    const customer = customers.find(
      (c) => c.id === invoice.customerId || c.customerId === invoice.customerId || c.name === invoice.customerName
    );
    const order = orders.find((o) => o.orderNo === invoice.orderNo || o.id === invoice.orderNo);
    downloadInvoiceDocument(invoice, customer || {}, order || {});
    showToast(`Downloading Tax Invoice ${invoice.invoiceNo}`, 'success');
  };

  const handleDownloadReceipt = (payment) => {
    const customer = customers.find((c) => c.id === payment.customerId || c.name === payment.customerName);
    const invoice = invoices.find((i) => i.invoiceNo === payment.invoiceNo);
    downloadPaymentReceipt(payment, customer || {}, invoice || {});
    showToast(`Downloading Official Receipt ${payment.receiptNo}`, 'success');
  };

  const getPaymentTypeBadgeStyle = (type) => {
    switch (type) {
      case 'Advance Payment':
        return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'Installment':
        return { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' };
      case 'Dispatch-Related Payment':
        return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
      case 'Final Payment':
        return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
      default:
        return { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' };
    }
  };

  const invoiceColumns = [
    {
      header: 'Invoice #',
      key: 'invoiceNo',
      render: (i) => (
        <div>
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => setSelectedInvoice(i)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontSize: '13px' }}
          >
            {i.invoiceNo}
          </button>
        </div>
      ),
    },
    {
      header: 'Sales Order ID',
      key: 'orderNo',
      render: (i) => (
        <span
          className="font-mono text-xs font-semibold"
          style={{
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            padding: '2px 7px',
            borderRadius: '4px',
            display: 'inline-block',
            color: '#334155',
          }}
        >
          {i.orderNo || '—'}
        </span>
      ),
    },
    {
      header: 'Customer ID',
      key: 'customerId',
      render: (i) => {
        const customer = customers.find(
          (c) => c.id === i.customerId || c.customerId === i.customerId || c.name === i.customerName
        );
        const displayId = customer?.customerId || i.customerDisplayId || i.customerId || 'CUST-001';
        return (
          <span
            className="font-mono text-xs font-semibold text-primary"
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '2px 8px',
              borderRadius: '4px',
              display: 'inline-block',
            }}
          >
            {displayId}
          </span>
        );
      },
    },
    {
      header: 'Customer Name',
      key: 'customerName',
      render: (i) => <span className="font-medium text-slate-800">{i.customerName}</span>,
    },
    {
      header: 'Percentage Paid',
      key: 'percentagePaid',
      align: 'center',
      render: (i) => {
        const pct = calculatePercentagePaid(i.paidAmount, i.totalAmount);
        const isFull = pct >= 100;
        const isPartial = pct > 0 && pct < 100;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '700',
                backgroundColor: isFull ? '#dcfce7' : isPartial ? '#eff6ff' : '#f1f5f9',
                color: isFull ? '#15803d' : isPartial ? '#1d4ed8' : '#64748b',
                border: `1px solid ${isFull ? '#bbf7d0' : isPartial ? '#bfdbfe' : '#e2e8f0'}`,
                whiteSpace: 'nowrap',
              }}
            >
              {pct}%
            </span>
            <div
              style={{
                width: '60px',
                height: '4px',
                backgroundColor: '#e2e8f0',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: isFull ? '#10b981' : isPartial ? '#2563eb' : 'transparent',
                }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: 'Total Amount (₹)',
      key: 'totalAmount',
      align: 'right',
      render: (i) => <span className="font-semibold">{formatINR(i.totalAmount)}</span>,
    },
    {
      header: 'Paid (₹)',
      key: 'paidAmount',
      align: 'right',
      render: (i) => <span className="text-success text-xs font-medium">{formatINR(i.paidAmount)}</span>,
    },
    {
      header: 'Outstanding Balance',
      key: 'balance',
      align: 'right',
      render: (i) => (
        <span className={`font-bold ${i.balance > 0 ? 'text-danger' : 'text-success'}`}>
          {formatINR(i.balance)}
        </span>
      ),
    },
    {
      header: 'Payment Status',
      key: 'status',
      align: 'center',
      render: (i) => <StatusBadge status={i.status} />,
    },
    {
      header: 'Follow-up Priority',
      key: 'priority',
      align: 'center',
      render: (i) => {
        const p = getInvoiceFollowUpPriority(i);
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '700',
              backgroundColor: p.bg,
              color: p.color,
              border: `1px solid ${p.border}`,
              whiteSpace: 'nowrap',
            }}
          >
            {p.label}
          </span>
        );
      },
    },
    {
      header: 'Remarks / Updates',
      key: 'updatesHistory',
      render: (i) => {
        const history = i.updatesHistory || [];
        const latest = history[history.length - 1];
        return (
          <div style={{ maxWidth: '240px', fontSize: '11.5px' }}>
            {latest ? (
              <div>
                <span style={{ color: '#0f172a', fontWeight: '500', display: 'block', lineHeight: '1.3' }}>
                  {latest.description}
                </span>
                <span style={{ fontSize: '10.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <span>{latest.updatedByName} ({latest.role})</span>
                  <span>•</span>
                  <span>{latest.date}</span>
                </span>
              </div>
            ) : (
              <span style={{ color: '#94a3b8' }}>{i.notes || 'No remarks recorded'}</span>
            )}
            <button
              type="button"
              onClick={() => {
                setHistoryTargetInvoice(i);
                setIsHistoryModalOpen(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '2px 0',
                color: '#2563eb',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                marginTop: '3px',
              }}
            >
              <History size={11} />
              <span>View History ({history.length})</span>
            </button>
          </div>
        );
      },
    },
    {
      header: 'Order Milestone',
      key: 'milestone',
      align: 'center',
      render: (i) => {
        const ord = orders.find((o) => o.orderNo === i.orderNo || o.id === i.orderNo);
        const milestone = getOrderClosureMilestone(ord, i);
        return (
          <div style={{ textAlign: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                backgroundColor: milestone.bg,
                color: milestone.color,
                border: `1px solid ${milestone.border}`,
                whiteSpace: 'nowrap',
              }}
            >
              {milestone.label}
            </span>
            <span style={{ display: 'block', fontSize: '10px', color: '#64748b', marginTop: '2px', maxWidth: '170px' }}>
              {milestone.description}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Approval',
      key: 'approvalStatus',
      align: 'center',
      render: (i) => (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: '700',
            backgroundColor: i.approvalStatus === 'Approved' ? '#dcfce7' : '#fef3c7',
            color: i.approvalStatus === 'Approved' ? '#166534' : '#92400e',
            border: i.approvalStatus === 'Approved' ? '1px solid #bbf7d0' : '1px solid #fde68a',
          }}
        >
          {i.approvalStatus === 'Approved' ? 'Approved' : 'Pending Approval'}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'center',
      render: (i) => {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
            <button
              type="button"
              className="table-action-icon-btn"
              onClick={() => setSelectedInvoice(i)}
              title="Inspect invoice details"
            >
              <Eye size={15} />
            </button>

            <button
              type="button"
              className="table-action-icon-btn text-primary"
              onClick={() => {
                setPreviewInvoice(i);
                setIsPreviewOpen(true);
              }}
              title="Preview formal customer tax invoice document"
            >
              <FileText size={15} />
            </button>

            <button
              type="button"
              className="table-action-icon-btn text-primary"
              onClick={() => handleDownloadInvoice(i)}
              title="Download Tax Invoice PDF"
            >
              <Download size={15} />
            </button>

            {i.balance > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', padding: '3px 8px', height: '26px' }}
                onClick={() => {
                  setReminderTargetInvoice(i);
                  setIsReminderOpen(true);
                }}
                title="Compose customer payment follow-up reminder (WhatsApp or Email)"
              >
                Collect
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const paymentColumns = [
    {
      header: 'Receipt #',
      key: 'receiptNo',
      render: (p) => <span className="font-semibold text-primary">{p.receiptNo}</span>,
    },
    {
      header: 'Customer',
      key: 'customerName',
      render: (p) => <span className="font-medium text-slate-800">{p.customerName}</span>,
    },
    {
      header: 'Payment Date',
      key: 'paymentDate',
      align: 'center',
      render: (p) => <span className="text-xs">{formatDate(p.paymentDate)}</span>,
    },
    {
      header: 'Linked Invoice',
      key: 'invoiceNo',
      render: (p) => <span className="font-mono text-xs text-primary">{p.invoiceNo}</span>,
    },
    {
      header: 'Method',
      key: 'method',
      render: (p) => (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            backgroundColor: '#f1f5f9',
            color: '#334155',
          }}
        >
          {p.method}
        </span>
      ),
    },
    {
      header: 'Reference / UTR',
      key: 'referenceNo',
      render: (p) => <span className="font-mono text-xs text-muted">{p.referenceNo}</span>,
    },
    {
      header: 'Amount Collected',
      key: 'amount',
      align: 'right',
      render: (p) => (
        <span className="font-bold text-success">{formatINR(p.amount)}</span>
      ),
    },
    {
      header: 'Action',
      align: 'center',
      render: (p) => (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '3px 8px' }}
          onClick={() => handleDownloadReceipt(p)}
          title="Download Official Payment Receipt"
        >
          <Download size={13} />
          <span>Receipt</span>
        </button>
      ),
    },
  ];

  // Section 6: Comprehensive Transaction Ledger Columns
  const ledgerColumns = [
    {
      header: 'Date & Receipt',
      key: 'receiptNo',
      render: (row) => (
        <div>
          <span className="font-semibold text-primary block" style={{ fontSize: '13px' }}>
            {row.receiptNo}
          </span>
          <span className="text-xs text-muted block">{formatDate(row.paymentDate)}</span>
        </div>
      ),
    },
    {
      header: 'Customer & Order',
      key: 'customerName',
      render: (row) => (
        <div>
          <span className="font-medium text-slate-800 block" style={{ fontSize: '13px' }}>
            {row.customerName}
          </span>
          <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
            <span className="font-mono text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
              Order: {row.orderNo}
            </span>
            {row.invoiceNo && (
              <span className="font-mono text-xs text-primary bg-blue-50 px-1.5 py-0.5 rounded">
                Inv: {row.invoiceNo}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Transaction Type',
      key: 'paymentType',
      align: 'center',
      render: (row) => {
        const typeStyle = getPaymentTypeBadgeStyle(row.paymentType);
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: '700',
              backgroundColor: typeStyle.bg,
              color: typeStyle.color,
              border: `1px solid ${typeStyle.border}`,
              whiteSpace: 'nowrap',
            }}
          >
            {row.paymentType || 'Advance Payment'}
          </span>
        );
      },
    },
    {
      header: 'Payment Mode & Ref',
      key: 'method',
      render: (row) => (
        <div>
          <span
            style={{
              display: 'inline-block',
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              marginBottom: '3px',
            }}
          >
            {row.method}
          </span>
          <span className="font-mono text-xs text-muted block" title={`UTR/Ref: ${row.referenceNo}`}>
            Ref: {row.referenceNo || '—'}
          </span>
        </div>
      ),
    },
    {
      header: 'Total Order Value',
      key: 'totalOrderValue',
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-slate-700">{formatINR(row.totalOrderValue)}</span>
      ),
    },
    {
      header: 'Collected in Txn',
      key: 'amount',
      align: 'right',
      render: (row) => (
        <span className="font-bold text-success" style={{ fontSize: '13px' }}>
          +{formatINR(row.amount)}
        </span>
      ),
    },
    {
      header: 'Total Collected',
      key: 'totalCollected',
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-slate-800 text-xs">{formatINR(row.totalCollected)}</span>
      ),
    },
    {
      header: 'Remaining Balance',
      key: 'remainingBalance',
      align: 'right',
      render: (row) => (
        <span
          className={`font-bold ${row.remainingBalance > 0 ? 'text-danger' : 'text-success'}`}
          style={{ fontSize: '13px' }}
        >
          {formatINR(row.remainingBalance)}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'paymentStatus',
      align: 'center',
      render: (row) => <StatusBadge status={row.paymentStatus} size="small" />,
    },
    {
      header: 'Receipt',
      align: 'center',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
          <button
            type="button"
            className="table-action-icon-btn text-primary"
            onClick={() => handleDownloadReceipt(row)}
            title="Download Official Payment Receipt"
          >
            <Download size={14} />
          </button>
          {row.rawInvoice && (
            <button
              type="button"
              className="table-action-icon-btn"
              onClick={() => setSelectedInvoice(row.rawInvoice)}
              title="Inspect Linked Invoice"
            >
              <Eye size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row mb-4">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="page-title">Invoices &amp; Payments</h2>
            {userRole === 'sales_manager' || userRole === 'admin' ? (
              <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                Company-Wide Receivables
              </span>
            ) : userRole === 'sales_coordinator' ? (
              <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                Regional Scope (Hyderabad &amp; Deccan)
              </span>
            ) : (
              <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                Assigned Accounts ({userProfile?.fullName || 'Sales Rep'})
              </span>
            )}
          </div>
          <p className="page-description">
            Track customer receivables, sales tax invoices, collection receipts, and order transaction ledger
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'ledger' && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-icon-text"
              onClick={handleExportLedgerCSV}
              title="Export complete filtered transaction ledger to CSV"
            >
              <FileSpreadsheet size={15} />
              <span>Export Ledger</span>
            </button>
          )}

          {activeTab === 'invoices' && (
            <button
              type="button"
              className="btn btn-primary btn-sm btn-icon-text"
              onClick={() => setIsCreateInvoiceOpen(true)}
              title="Generate new commercial Sales Tax Invoice"
            >
              <Plus size={15} />
              <span>Create Invoice</span>
            </button>
          )}

          {activeTab === 'payments' && (
            <button
              type="button"
              className="btn btn-primary btn-sm btn-icon-text"
              onClick={() => {
                setPaymentTargetInvoice(null);
                setIsRecordPaymentOpen(true);
              }}
              title="Record customer payment receipt in Finance ledger"
            >
              <Plus size={15} />
              <span>Record Customer Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* Compact Summary KPI Cards */}
      <div className="summary-kpi-grid">
        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
          <div className="summary-kpi-label">Total Invoiced</div>
          <div className="summary-kpi-value">{formatINR(metrics.totalInvoiced)}</div>
          <div className="summary-kpi-sub">{scopedInvoices.length} invoices generated</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
          <div className="summary-kpi-label">Total Collections</div>
          <div className="summary-kpi-value text-success">{formatINR(metrics.totalCollected)}</div>
          <div className="summary-kpi-sub">{scopedPayments.length} receipts cleared</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
          <div className="summary-kpi-label">Outstanding Balance</div>
          <div className="summary-kpi-value text-warning">{formatINR(metrics.totalOutstanding)}</div>
          <div className="summary-kpi-sub">Active receivables pool</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #ef4444' }}>
          <div className="summary-kpi-label">Overdue Receivables</div>
          <div className="summary-kpi-value text-danger">{formatINR(metrics.overdueAmount)}</div>
          <div className="summary-kpi-sub">{metrics.overdueCount} overdue invoice{metrics.overdueCount === 1 ? '' : 's'}</div>
        </div>
      </div>

      {/* Three Clearly Separated View Tabs: Invoices, Payments, Ledger */}
      <div className="tab-navigation-bar mb-4">
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('invoices');
            handleReset();
          }}
        >
          <FileText size={16} />
          <span>Customer Invoices ({invoices.length})</span>
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('payments');
            handleReset();
          }}
        >
          <Receipt size={16} />
          <span>Payments Collected ({payments.length})</span>
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'ledger' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('ledger');
            handleReset();
          }}
        >
          <BookOpen size={16} />
          <span>Transaction Ledger ({payments.length})</span>
        </button>
      </div>

      {/* Tab 1: Invoices */}
      {activeTab === 'invoices' && (
        <>
          {/* Cross-Module Service Completion Notification (Visible to Sales and Finance) */}
          {serviceCompletionAlerts.length > 0 && (
            <div
              className="card mb-3"
              style={{
                backgroundColor: '#fefce8',
                border: '1px solid #fde047',
                borderRadius: '8px',
                padding: '12px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Wrench size={16} className="text-amber-600" />
                <strong style={{ fontSize: '13px', color: '#854d0e' }}>
                  Cross-Module Service Notification (Service → Sales &amp; Finance)
                </strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {serviceCompletionAlerts.map((alert) => (
                  <div
                    key={alert.serviceRef}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #fef08a',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          {alert.customerId}
                        </span>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>{alert.customerName}</strong>
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>• Order: {alert.orderNo}</span>
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>• Invoice: {alert.invoiceNo}</span>
                        <span style={{ fontSize: '11px', color: '#0284c7', background: '#e0f2fe', padding: '1px 6px', borderRadius: '3px' }}>
                          Ref: {alert.serviceRef} ({alert.completionDate})
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#b45309', fontWeight: '700' }}>
                        "{alert.notificationMessage}"
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                        Remarks: {alert.remarks}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>Verified Outstanding</span>
                      <strong style={{ fontSize: '13.5px', color: '#dc2626' }}>
                        {formatINR(alert.outstandingAmount)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operational Delivery Status Alert */}
          {deliveredAwaitingPaymentOrders.length > 0 && (
            <div
              className="card mb-3"
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '10px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={16} className="text-primary shrink-0" />
                <div style={{ fontSize: '12px', color: '#1e40af' }}>
                  <strong>Store &amp; Fulfillment Clearance:</strong> {deliveredAwaitingPaymentOrders.length} order{deliveredAwaitingPaymentOrders.length === 1 ? '' : 's'} confirmed delivered by Store.
                  <span style={{ fontStyle: 'italic', marginLeft: '6px' }}>
                    "Product dispatched and delivered. Awaiting customer payment to complete and close the order."
                  </span>
                </div>
              </div>
            </div>
          )}

          <SearchFilterBar
            searchPlaceholder="Search invoices by invoice #, customer, or order..."
            searchValue={search}
            onSearchChange={setSearch}
            filters={invoiceFilters}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />

          <DataTable
            columns={invoiceColumns}
            data={filteredInvoices}
            keyField="id"
            emptyMessage="No customer invoices found matching filters"
            pageSize={8}
          />
        </>
      )}

      {/* Tab 2: Payments */}
      {activeTab === 'payments' && (
        <>
          <SearchFilterBar
            searchPlaceholder="Search payment receipts by receipt #, customer, invoice #, or UTR..."
            searchValue={search}
            onSearchChange={setSearch}
            filters={paymentFilters}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />

          <DataTable
            columns={paymentColumns}
            data={filteredPayments}
            keyField="id"
            emptyMessage="No payment receipts recorded"
            pageSize={8}
          />
        </>
      )}

      {/* Tab 3: Transaction Ledger (Section 6) */}
      {activeTab === 'ledger' && (
        <>
          {/* Ledger Context & Totals Ribbon */}
          <div
            className="card mb-4"
            style={{
              padding: '14px 18px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '20px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>
                Sales Order Transaction Ledger
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Audited transaction timeline covering advances, installments, dispatch-related payments, and final payments
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>TOTAL TRANSACTIONS</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                  {ledgerSummary.transactionCount} entries
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>TOTAL COLLECTED</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#16a34a' }}>
                  {formatINR(ledgerSummary.totalCollected)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>ORDER BOOK REPRESENTED</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#2563eb' }}>
                  {formatINR(ledgerSummary.totalOrderValue)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>OUTSTANDING BALANCE</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#dc2626' }}>
                  {formatINR(ledgerSummary.totalPending)}
                </div>
              </div>
            </div>
          </div>

          <SearchFilterBar
            searchPlaceholder="Search ledger by receipt #, customer, order #, invoice #, or UTR..."
            searchValue={search}
            onSearchChange={setSearch}
            filters={ledgerFilters}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />

          <DataTable
            columns={ledgerColumns}
            data={filteredLedger}
            keyField="id"
            emptyMessage="No ledger transactions found matching filters"
            pageSize={8}
          />
        </>
      )}

      {/* Create Commercial Invoice Modal */}
      <CreateInvoiceModal
        isOpen={isCreateInvoiceOpen}
        onClose={() => setIsCreateInvoiceOpen(false)}
      />

      {/* Payment Reminder Composition Modal (Collect Action) */}
      {isReminderOpen && (
        <PaymentReminderModal
          isOpen={isReminderOpen}
          onClose={() => {
            setIsReminderOpen(false);
            setReminderTargetInvoice(null);
          }}
          invoice={reminderTargetInvoice}
        />
      )}

      {/* Formal Invoice Document Preview Modal */}
      {isPreviewOpen && (
        <InvoiceDocumentPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewInvoice(null);
          }}
          invoice={previewInvoice}
        />
      )}

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        onOpenReminderModal={(inv) => {
          setReminderTargetInvoice(inv);
          setIsReminderOpen(true);
        }}
      />

      {/* Record Payment Modal (Finance Clearing) */}
      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => {
          setIsRecordPaymentOpen(false);
          setPaymentTargetInvoice(null);
        }}
        preselectedInvoice={paymentTargetInvoice}
      />

      {/* Invoice Chronological Update History & Remarks Modal */}
      <InvoiceHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryTargetInvoice(null);
        }}
        invoice={historyTargetInvoice}
      />
    </div>
  );
}
