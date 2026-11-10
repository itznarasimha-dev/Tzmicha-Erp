import React, { useState, useMemo } from 'react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import ServiceInvoiceDetailModal from './components/ServiceInvoiceDetailModal';
import RecordServicePaymentModal from './components/RecordServicePaymentModal';
import CreateServiceBillModal from './components/CreateServiceBillModal';
import { useSchedule } from '../../context/ScheduleContext';
import { useRole } from '../../context/RoleContext';
import { formatINR, formatDate } from '../../utils/formatters';
import { FileText, Receipt, Eye, CheckCircle2, DollarSign, Download, Lock, Plus, Check, CheckSquare } from 'lucide-react';

export default function ServiceBilling() {
  const { roleId } = useRole();
  const {
    serviceBilling,
    recordServicePayment,
    approveServiceBill,
    rejectServiceBill,
    issueServiceBill,
    sendBillToFinance
  } = useSchedule();

  const isManager = roleId === 'manager';

  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'payments'
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({
    status: 'all',
    approvalStatus: 'all'
  });

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState(null);
  const [isCreateBillOpen, setIsCreateBillOpen] = useState(false);

  const filters = [
    {
      key: 'status',
      label: 'Payment Status',
      options: [
        { value: 'Paid', label: 'Paid in Full' },
        { value: 'Partially Paid', label: 'Partially Paid' },
        { value: 'Pending', label: 'Pending Payment' }
      ]
    },
    {
      key: 'approvalStatus',
      label: 'Finance Approval',
      options: [
        { value: 'Pending Finance Approval', label: 'Pending Finance Approval' },
        { value: 'Approved', label: 'Approved' },
        { value: 'Issued', label: 'Issued' },
        { value: 'Rejected', label: 'Rejected' },
        { value: 'Draft', label: 'Draft' }
      ]
    }
  ];

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSearch('');
    setFilterValues({ status: 'all', approvalStatus: 'all' });
  };

  // Top summary KPI metrics
  const metrics = useMemo(() => {
    const totalInvoiced = serviceBilling.reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);
    const totalCollected = serviceBilling.reduce((sum, i) => sum + Number(i.amountPaid || 0), 0);
    const totalOutstanding = serviceBilling.reduce((sum, i) => sum + Number(i.balance || 0), 0);
    const pendingInvoices = serviceBilling.filter((i) => i.balance > 0);
    const pendingAmount = pendingInvoices.reduce((sum, i) => sum + Number(i.balance || 0), 0);

    return {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      pendingCount: pendingInvoices.length,
      pendingAmount
    };
  }, [serviceBilling]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return serviceBilling.filter((i) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search.trim() ||
        i.serviceInvoiceNo.toLowerCase().includes(q) ||
        i.serviceRequestId.toLowerCase().includes(q) ||
        i.customerName.toLowerCase().includes(q) ||
        i.customerId.toLowerCase().includes(q) ||
        (i.notes && i.notes.toLowerCase().includes(q));

      const matchesStatus =
        filterValues.status === 'all' || i.paymentStatus === filterValues.status;

      const currentApproval = i.approvalStatus || 'Approved';
      const matchesApproval =
        filterValues.approvalStatus === 'all' || currentApproval === filterValues.approvalStatus;

      return matchesSearch && matchesStatus && matchesApproval;
    });
  }, [serviceBilling, search, filterValues]);

  // Payments log (records where payment has been made)
  const paymentsList = useMemo(() => {
    return serviceBilling
      .filter((i) => Number(i.amountPaid || 0) > 0)
      .map((i, index) => ({
        receiptNo: `RCPT-2026-${(index + 1).toString().padStart(3, '0')}`,
        serviceInvoiceNo: i.serviceInvoiceNo,
        serviceRequestId: i.serviceRequestId,
        customerName: i.customerName,
        paymentDate: i.paymentDate || i.invoiceDate,
        method: i.paymentMethod || 'Bank Transfer',
        referenceNo: i.paymentReference || 'SYS-AUTO-CLEARED',
        amount: i.amountPaid
      }));
  }, [serviceBilling]);

  const filteredPayments = useMemo(() => {
    return paymentsList.filter((p) => {
      const q = search.toLowerCase();
      return (
        !search.trim() ||
        p.receiptNo.toLowerCase().includes(q) ||
        p.serviceInvoiceNo.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        p.referenceNo.toLowerCase().includes(q)
      );
    });
  }, [paymentsList, search]);

  const invoiceColumns = [
    {
      header: 'Service Invoice #',
      key: 'serviceInvoiceNo',
      render: (i) => (
        <div>
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => setSelectedInvoice(i)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontSize: '13px' }}
          >
            {i.serviceInvoiceNo}
          </button>
          <span className="text-xs text-muted block">Ticket: {i.serviceRequestId}</span>
        </div>
      )
    },
    {
      header: 'Customer',
      key: 'customerName',
      render: (i) => (
        <div>
          <span className="font-medium text-slate-800" style={{ fontSize: '13px', display: 'block' }}>
            {i.customerName}
          </span>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#2563eb' }}>
            {i.customerId}
          </span>
        </div>
      )
    },
    {
      header: 'Invoice Date',
      key: 'invoiceDate',
      align: 'center',
      render: (i) => <span className="text-xs">{formatDate(i.invoiceDate)}</span>
    },
    {
      header: 'Due Date',
      key: 'dueDate',
      align: 'center',
      render: (i) => (
        <span className={`text-xs ${i.paymentStatus === 'Pending' ? 'text-slate-700' : ''}`}>
          {formatDate(i.dueDate)}
        </span>
      )
    },
    {
      header: 'Service & Labor (₹)',
      key: 'serviceCharges',
      align: 'right',
      render: (i) => (
        <span className="text-xs font-medium">
          {formatINR(Number(i.serviceCharges || 0) + Number(i.labourCharges || 0))}
        </span>
      )
    },
    {
      header: 'Parts (₹)',
      key: 'partsCharges',
      align: 'right',
      render: (i) => (
        <span className="text-xs font-medium">
          {formatINR(i.partsCharges || 0)}
        </span>
      )
    },
    {
      header: 'GST 18% (₹)',
      key: 'taxAmount',
      align: 'right',
      render: (i) => (
        <span className="text-xs text-muted">
          {formatINR(i.taxAmount || 0)}
        </span>
      )
    },
    {
      header: 'Total Bill (₹)',
      key: 'totalAmount',
      align: 'right',
      render: (i) => <span className="font-semibold text-slate-900">{formatINR(i.totalAmount)}</span>
    },
    {
      header: 'Paid (₹)',
      key: 'amountPaid',
      align: 'right',
      render: (i) => <span className="text-success text-xs font-medium">{formatINR(i.amountPaid)}</span>
    },
    {
      header: 'Balance Due',
      key: 'balance',
      align: 'right',
      render: (i) => (
        <span className={`font-bold ${i.balance > 0 ? 'text-danger' : 'text-success'}`}>
          {formatINR(i.balance)}
        </span>
      )
    },
    {
      header: 'Approval Status',
      key: 'approvalStatus',
      align: 'center',
      render: (i) => {
        const status = i.approvalStatus || 'Approved';
        const styles = {
          'Draft': { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
          'Pending Finance Approval': { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
          'Approved': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
          'Rejected': { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
          'Issued': { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' }
        };
        const s = styles[status] || styles['Approved'];
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: s.bg,
              color: s.color,
              border: `1px solid ${s.border}`
            }}
          >
            {status}
          </span>
        );
      }
    },
    {
      header: 'Payment Status',
      key: 'paymentStatus',
      align: 'center',
      render: (i) => <StatusBadge status={i.paymentStatus} />
    },
    {
      header: 'Actions',
      align: 'center',
      render: (i) => {
        const appStatus = i.approvalStatus || 'Approved';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
            <button
              type="button"
              className="table-action-icon-btn"
              onClick={() => setSelectedInvoice(i)}
              title="Inspect Tax Invoice Details"
            >
              <Eye size={15} />
            </button>

            {/* 1. Draft -> Send Request to Finance */}
            {appStatus === 'Draft' && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ fontSize: '11px', padding: '3px 8px', height: '26px' }}
                onClick={() => {
                  if (window.confirm(`Send Service Invoice ${i.serviceInvoiceNo} to Finance Team for review & approval?`)) {
                    if (sendBillToFinance) {
                      sendBillToFinance(i.serviceInvoiceNo);
                    } else {
                      issueServiceBill(i.serviceInvoiceNo);
                    }
                  }
                }}
                title="Send bill to Finance Team for approval"
              >
                <CheckSquare size={12} /> Issue Bill
              </button>
            )}

            {/* 2. Finance / Manager approval workflow buttons */}
            {(isManager || roleId === 'coordinator') && appStatus === 'Pending Finance Approval' && (
              <>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    backgroundColor: '#10b981',
                    color: '#fff',
                    padding: '3px 8px',
                    fontSize: '11px',
                    height: '26px',
                    border: 'none',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onClick={() => approveServiceBill(i.serviceInvoiceNo)}
                  title="Finance Approval: Approve Service Bill"
                >
                  <Check size={13} /> Approve
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    padding: '3px 8px',
                    fontSize: '11px',
                    height: '26px',
                    border: 'none',
                    borderRadius: '4px'
                  }}
                  onClick={() => {
                    const r = window.prompt('Finance Rejection Reason:');
                    if (r) rejectServiceBill(i.serviceInvoiceNo, r);
                  }}
                  title="Finance Approval: Reject Service Bill"
                >
                  Reject
                </button>
              </>
            )}

            {/* 3. Collect Button: Strictly ONLY when Approved or Issued, and balance > 0 */}
            {i.balance > 0 && (appStatus === 'Approved' || appStatus === 'Issued') && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ fontSize: '11px', padding: '3px 10px', height: '26px' }}
                onClick={() => setPaymentTargetInvoice(i)}
                title="Record customer payment collection"
              >
                Collect
              </button>
            )}
          </div>
        );
      }
    }
  ];

  const paymentColumns = [
    {
      header: 'Receipt #',
      key: 'receiptNo',
      render: (p) => <span className="font-semibold text-primary">{p.receiptNo}</span>
    },
    {
      header: 'Customer',
      key: 'customerName',
      render: (p) => <span className="font-medium text-slate-800">{p.customerName}</span>
    },
    {
      header: 'Linked Invoice',
      key: 'serviceInvoiceNo',
      render: (p) => <span className="font-mono text-xs text-primary">{p.serviceInvoiceNo}</span>
    },
    {
      header: 'Payment Date',
      key: 'paymentDate',
      align: 'center',
      render: (p) => <span className="text-xs">{formatDate(p.paymentDate)}</span>
    },
    {
      header: 'Channel / Mode',
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
            color: '#334155'
          }}
        >
          {p.method}
        </span>
      )
    },
    {
      header: 'UTR / Reference',
      key: 'referenceNo',
      render: (p) => <span className="font-mono text-xs text-muted">{p.referenceNo}</span>
    },
    {
      header: 'Amount Collected',
      key: 'amount',
      align: 'right',
      render: (p) => (
        <span className="font-bold text-success">{formatINR(p.amount)}</span>
      )
    }
  ];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row mb-4">
        <div>
          <h2 className="page-title">Service Invoicing & Billing</h2>
          <p className="page-description">
            Generate and track post-service tax invoices, diagnostic call fees, parts billing, and client collections
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCreateBillOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            <span>Create Service Bill</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Matching Sales Design */}
      <div className="summary-kpi-grid mb-4">
        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
          <div className="summary-kpi-label">Total Service Invoiced</div>
          <div className="summary-kpi-value">{formatINR(metrics.totalInvoiced)}</div>
          <div className="summary-kpi-sub">{serviceBilling.length} service invoices issued</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
          <div className="summary-kpi-label">Total Collections</div>
          <div className="summary-kpi-value text-success">{formatINR(metrics.totalCollected)}</div>
          <div className="summary-kpi-sub">{paymentsList.length} receipts processed</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
          <div className="summary-kpi-label">Outstanding Balance</div>
          <div className="summary-kpi-value text-warning">{formatINR(metrics.totalOutstanding)}</div>
          <div className="summary-kpi-sub">Active service receivables</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #ef4444' }}>
          <div className="summary-kpi-label">Pending / Unpaid Bills</div>
          <div className="summary-kpi-value text-danger">{formatINR(metrics.pendingAmount)}</div>
          <div className="summary-kpi-sub">{metrics.pendingCount} unpaid invoice{metrics.pendingCount === 1 ? '' : 's'}</div>
        </div>
      </div>

      {/* View Tabs */}
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
          <span>Service Invoices ({serviceBilling.length})</span>
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
          <span>Payment Receipts ({paymentsList.length})</span>
        </button>
      </div>

      {/* Search & Filters */}
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={activeTab === 'invoices' ? 'Search by invoice #, ticket #, or customer...' : 'Search by receipt #, customer, or UTR...'}
        filters={activeTab === 'invoices' ? filters : []}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* Content Table */}
      {activeTab === 'invoices' ? (
        <DataTable
          columns={invoiceColumns}
          data={filteredInvoices}
          keyField="serviceInvoiceNo"
          minWidth="1750px"
          emptyMessage="No service invoices found matching your filter criteria."
          defaultPageSize={10}
        />
      ) : (
        <DataTable
          columns={paymentColumns}
          data={filteredPayments}
          keyField="receiptNo"
          minWidth="1100px"
          emptyMessage="No payment receipts found matching your filter criteria."
          defaultPageSize={10}
        />
      )}

      {/* Modals */}
      <CreateServiceBillModal
        isOpen={isCreateBillOpen}
        onClose={() => setIsCreateBillOpen(false)}
      />

      <ServiceInvoiceDetailModal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        onRecordPayment={(inv) => setPaymentTargetInvoice(inv)}
      />

      <RecordServicePaymentModal
        isOpen={Boolean(paymentTargetInvoice)}
        onClose={() => setPaymentTargetInvoice(null)}
        invoice={paymentTargetInvoice}
        onConfirm={recordServicePayment}
      />
    </div>
  );
}
