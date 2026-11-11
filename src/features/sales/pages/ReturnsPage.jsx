import { useState, useMemo } from 'react';
import {
  Eye,
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  PackageCheck,
  RotateCcw,
  Ban,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import ReturnDetailModal from '../components/modals/ReturnDetailModal';
import { useSales } from '../context/SalesContext';
import { formatDate } from '../utils/formatters';

const REGIONAL_CUSTOMER_IDS = [
  'CUST-004',
  'CUS-000004',
  'CUST-006',
  'CUS-000006',
  'CUST-007',
  'CUS-000007',
  'CUST-008',
  'CUS-000008',
];

export default function ReturnsPage() {
  const { returns = [], userRole, navigateTo } = useSales();

  // 1. Role-Based Access Enforcement
  const isAuthorized = ['sales_manager', 'sales_coordinator', 'admin'].includes(userRole);

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'returns' | 'cancellations'
  const [search, setSearch] = useState('');
  const [caseStatusFilter, setCaseStatusFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');
  const [refundStatusFilter, setRefundStatusFilter] = useState('all');
  const [selectedReturn, setSelectedReturn] = useState(null);

  // 2. Data Scoping
  const scopedReturns = useMemo(() => {
    if (userRole === 'sales_manager' || userRole === 'admin') {
      return returns;
    }
    if (userRole === 'sales_coordinator') {
      return returns.filter(
        (r) =>
          r.regionId === 'REG-HYD' ||
          REGIONAL_CUSTOMER_IDS.includes(r.customerId) ||
          r.customerName?.toLowerCase().includes('kaveri') ||
          r.customerName?.toLowerCase().includes('gujarat metalcrafts') ||
          r.customerName?.toLowerCase().includes('shree ganesh') ||
          r.customerName?.toLowerCase().includes('telangana')
      );
    }
    return [];
  }, [returns, userRole]);

  // Top summary KPIs
  const metrics = useMemo(() => {
    const total = scopedReturns.length;
    const totalReturns = scopedReturns.filter((r) => (r.type || r.itemType) === 'Return').length;
    const totalCancellations = scopedReturns.filter((r) => (r.type || r.itemType) === 'Cancellation').length;
    const awaitingStockInspection = scopedReturns.filter(
      (r) =>
        r.stockStatus === 'Awaiting Stock Inspection' ||
        r.stockStatus === 'Pending QC' ||
        (!r.restockApproved && (r.type || r.itemType) === 'Return')
    ).length;
    const refundPending = scopedReturns.filter(
      (r) => r.refundStatus?.includes('Pending') || r.caseStatus === 'Refund Pending'
    ).length;
    const restockedCount = scopedReturns.filter(
      (r) => r.stockStatus === 'Restocked' || r.restockApproved
    ).length;

    return { total, totalReturns, totalCancellations, awaitingStockInspection, refundPending, restockedCount };
  }, [scopedReturns]);

  // Tab, search, and status filtering
  const filteredReturns = useMemo(() => {
    return scopedReturns.filter((r) => {
      const type = r.type || r.itemType || 'Return';
      if (activeTab === 'returns' && type !== 'Return') return false;
      if (activeTab === 'cancellations' && type !== 'Cancellation') return false;

      const q = search.toLowerCase().trim();
      const refNo = (r.returnNo || r.id || '').toLowerCase();
      const orderNo = (r.salesOrderId || r.orderNo || '').toLowerCase();
      const custId = (r.customerId || '').toLowerCase();
      const custName = (r.customerName || '').toLowerCase();
      const prodId = (r.productId || r.productCode || '').toLowerCase();
      const prodName = (r.productName || '').toLowerCase();
      const reason = (r.reason || '').toLowerCase();

      const matchesSearch =
        !q ||
        refNo.includes(q) ||
        orderNo.includes(q) ||
        custId.includes(q) ||
        custName.includes(q) ||
        prodId.includes(q) ||
        prodName.includes(q) ||
        reason.includes(q);

      const currentCaseStatus = r.caseStatus || r.status;
      const matchesCase = caseStatusFilter === 'all' || currentCaseStatus === caseStatusFilter;

      const currentStockStatus = r.stockStatus || (r.restockApproved ? 'Restocked' : 'Awaiting Stock Inspection');
      const matchesStock = stockStatusFilter === 'all' || currentStockStatus === stockStatusFilter;

      const currentRefundStatus = r.refundStatus || 'Not Applicable';
      const matchesRefund = refundStatusFilter === 'all' || currentRefundStatus === refundStatusFilter;

      return matchesSearch && matchesCase && matchesStock && matchesRefund;
    });
  }, [scopedReturns, activeTab, search, caseStatusFilter, stockStatusFilter, refundStatusFilter]);

  // Unauthorized access guard for Sales Rep and Junior Sales
  if (!isAuthorized) {
    return (
      <div className="page-container">
        <div
          className="card"
          style={{
            padding: '50px 24px',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            maxWidth: '600px',
            margin: '40px auto',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <ShieldAlert size={28} style={{ color: '#dc2626' }} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Access Denied — Restricted Module
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, marginBottom: '20px' }}>
            The <strong>Returns &amp; Cancellations</strong> ledger is strictly restricted to Sales Managers and Regional Sales Coordinators for monitoring purposes. Sales Representatives and Junior Sales Employees are not permitted to access return or cancellation records.
          </p>
          <div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => navigateTo('dashboard')}
            >
              Return to My Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Strictly Structured Columns (16 Fields per Specification)
  const columns = [
    {
      header: 'Reference ID',
      key: 'returnNo',
      render: (r) => (
        <button
          type="button"
          className="font-semibold text-primary hover:underline"
          onClick={() => setSelectedReturn(r)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: '12.5px',
            display: 'block',
          }}
          title="Inspect case details"
        >
          {r.returnNo || r.id}
        </button>
      ),
    },
    {
      header: 'Sales Order ID',
      key: 'orderNo',
      render: (r) => (
        <span className="text-xs font-mono font-medium text-slate-700">
          {r.salesOrderId || r.orderNo}
        </span>
      ),
    },
    {
      header: 'Customer',
      key: 'customerName',
      render: (r) => (
        <div>
          <span className="font-semibold text-xs text-slate-800 block truncate" style={{ maxWidth: '170px' }} title={r.customerName}>
            {r.customerName}
          </span>
          <span className="text-xs font-mono text-muted block" style={{ fontSize: '11px' }}>
            ID: {r.customerId}
          </span>
        </div>
      ),
    },
    {
      header: 'Product',
      key: 'productName',
      render: (r) => (
        <div style={{ maxWidth: '190px' }}>
          <span className="font-medium text-xs text-slate-800 block truncate" title={r.productName}>
            {r.productName}
          </span>
          <span className="text-xs text-muted font-mono block" style={{ fontSize: '11px' }}>
            ID: {r.productId || r.productCode}
          </span>
        </div>
      ),
    },
    {
      header: 'Purchased Qty',
      key: 'originalPurchasedQty',
      align: 'center',
      render: (r) => (
        <span className="text-xs font-semibold text-slate-800">
          {r.originalPurchasedQty ?? r.originalQty ?? r.qty}
        </span>
      ),
    },
    {
      header: 'Return Qty',
      key: 'returnQty',
      align: 'center',
      render: (r) => (
        <span className="text-xs font-bold text-danger">
          {r.returnQty ?? r.qty}
        </span>
      ),
    },
    {
      header: 'Order Date',
      key: 'orderDate',
      align: 'center',
      render: (r) => <span className="text-xs text-slate-700">{formatDate(r.purchaseDate || r.orderDate)}</span>,
    },
    {
      header: 'Case Date',
      key: 'returnDate',
      align: 'center',
      render: (r) => <span className="text-xs text-slate-700">{formatDate(r.returnDate || r.cancellationDate)}</span>,
    },
    {
      header: 'Reason',
      key: 'reason',
      render: (r) => (
        <span className="text-xs text-slate-600 block truncate" style={{ maxWidth: '160px' }} title={r.reason}>
          {r.reason}
        </span>
      ),
    },
    {
      header: 'Type',
      key: 'type',
      align: 'center',
      render: (r) => {
        const itemType = r.type || r.itemType || 'Return';
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: '700',
              backgroundColor: itemType === 'Return' ? '#eff6ff' : '#fef2f2',
              color: itemType === 'Return' ? '#2563eb' : '#dc2626',
              border: `1px solid ${itemType === 'Return' ? '#bfdbfe' : '#fecaca'}`,
            }}
          >
            {itemType}
          </span>
        );
      },
    },
    {
      header: 'Case Status',
      key: 'caseStatus',
      align: 'center',
      render: (r) => <StatusBadge status={r.caseStatus || r.status} size="small" />,
    },
    {
      header: 'Stock Status',
      key: 'stockStatus',
      align: 'center',
      render: (r) => {
        const stock = r.stockStatus || (r.restockApproved ? 'Restocked' : 'Awaiting Stock Inspection');
        return <StatusBadge status={stock} size="small" />;
      },
    },
    {
      header: 'Refund Status',
      key: 'refundStatus',
      align: 'center',
      render: (r) => {
        const refund = r.refundStatus || 'Not Applicable';
        return <StatusBadge status={refund} size="small" />;
      },
    },
    {
      header: 'Remarks',
      key: 'remarks',
      render: (r) => {
        const text = r.remarks || r.notes || '—';
        return (
          <span className="text-xs text-slate-500 block truncate" style={{ maxWidth: '140px' }} title={text}>
            {text}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      align: 'center',
      render: (r) => (
        <button
          type="button"
          className="table-action-icon-btn"
          onClick={() => setSelectedReturn(r)}
          title="Inspect case details (View-Only)"
        >
          <Eye size={15} />
        </button>
      ),
    },
  ];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row mb-4">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="page-title">Returns &amp; Cancellations</h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '600',
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              {userRole === 'sales_manager' || userRole === 'admin'
                ? 'Organizational Scope • View-Only Monitoring'
                : 'Regional Scope (Hyderabad & Deccan) • View-Only'}
            </span>
          </div>
          <p className="page-description">
            Read-only audit ledger for monitoring customer returns, order cancellations, warehouse stock restitution, and credit clearance
          </p>
        </div>
      </div>

      {/* Operational Ownership Callout */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '12px',
          color: '#1e40af',
        }}
      >
        <ShieldCheck size={18} className="shrink-0 text-primary" />
        <div>
          <strong>Operational Authority Separation:</strong> Case statuses are managed by Customer Support, stock restitution is controlled by the Store/Stock team, and refunds are authorized exclusively by Finance. Sales maintains strictly view-only access.
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="summary-kpi-grid mb-4">
        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
          <div className="summary-kpi-label">Total Logged Cases</div>
          <div className="summary-kpi-value">{metrics.total}</div>
          <div className="summary-kpi-sub">
            {metrics.totalReturns} Returns • {metrics.totalCancellations} Cancellations
          </div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
          <div className="summary-kpi-label">Awaiting Stock Inspection</div>
          <div className="summary-kpi-value text-warning">{metrics.awaitingStockInspection}</div>
          <div className="summary-kpi-sub">Store team dock quarantine</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #ef4444' }}>
          <div className="summary-kpi-label">Refund Pending</div>
          <div className="summary-kpi-value text-danger">{metrics.refundPending}</div>
          <div className="summary-kpi-sub">Awaiting Finance clearance</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
          <div className="summary-kpi-label">Restocked / Settled</div>
          <div className="summary-kpi-value text-success">{metrics.restockedCount}</div>
          <div className="summary-kpi-sub">Inventory restored by Store</div>
        </div>
      </div>

      {/* Filter Tabs: All Cases vs Returns vs Cancellations */}
      <div className="tab-navigation-bar mb-4">
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <RotateCcw size={15} />
          <span>All Cases ({scopedReturns.length})</span>
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'returns' ? 'active' : ''}`}
          onClick={() => setActiveTab('returns')}
        >
          <PackageCheck size={15} />
          <span>Returns ({scopedReturns.filter((r) => (r.type || r.itemType) === 'Return').length})</span>
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'cancellations' ? 'active' : ''}`}
          onClick={() => setActiveTab('cancellations')}
        >
          <Ban size={15} />
          <span>Cancellations ({scopedReturns.filter((r) => (r.type || r.itemType) === 'Cancellation').length})</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div
        className="card mb-4"
        style={{
          padding: '12px 16px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '9px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search by ID, order, customer, product..."
              style={{ width: '260px', fontSize: '12px', padding: '5px 10px 5px 28px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Case Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Case Status:</span>
            <select
              className="form-select"
              style={{ fontSize: '12px', padding: '4px 8px', minWidth: '140px' }}
              value={caseStatusFilter}
              onChange={(e) => setCaseStatusFilter(e.target.value)}
            >
              <option value="all">All Case Statuses</option>
              <option value="Return Requested">Return Requested</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Cancellation Requested">Cancellation Requested</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Refund Pending">Refund Pending</option>
            </select>
          </div>

          {/* Stock Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Stock Status:</span>
            <select
              className="form-select"
              style={{ fontSize: '12px', padding: '4px 8px', minWidth: '140px' }}
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
            >
              <option value="all">All Stock Statuses</option>
              <option value="Awaiting Stock Inspection">Awaiting Stock Inspection</option>
              <option value="Restocked">Restocked</option>
              <option value="Quarantined">Quarantined</option>
            </select>
          </div>

          {/* Refund Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Refund Status:</span>
            <select
              className="form-select"
              style={{ fontSize: '12px', padding: '4px 8px', minWidth: '140px' }}
              value={refundStatusFilter}
              onChange={(e) => setRefundStatusFilter(e.target.value)}
            >
              <option value="all">All Refund Statuses</option>
              <option value="Refund Pending">Refund Pending</option>
              <option value="Refund Processed">Refund Processed</option>
              <option value="Not Applicable">Not Applicable</option>
            </select>
          </div>
        </div>

        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSearch('');
              setCaseStatusFilter('all');
              setStockStatusFilter('all');
              setRefundStatusFilter('all');
            }}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Read-Only Data Table */}
      <DataTable
        columns={columns}
        data={filteredReturns}
        keyField="id"
        emptyMessage="No return or cancellation records found matching the selected filters"
        pageSize={8}
      />

      {/* Return Detail Modal (Strictly Read-Only) */}
      <ReturnDetailModal
        isOpen={Boolean(selectedReturn)}
        onClose={() => setSelectedReturn(null)}
        returnItem={selectedReturn}
      />
    </div>
  );
}
