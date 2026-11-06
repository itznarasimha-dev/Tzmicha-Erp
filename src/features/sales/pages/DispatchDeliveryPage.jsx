import { useState, useMemo } from 'react';
import {
  Eye,
  MapPin,
  Calendar,
  Truck,
  PackageCheck,
  ShieldAlert,
} from 'lucide-react';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import SearchFilterBar from '../components/common/SearchFilterBar';
import Modal from '../components/common/Modal';
import { useSales } from '../context/SalesContext';
import { formatDate, formatINR } from '../utils/formatters';
import { isCustomerInRoleScope } from '../utils/roleScoping';

export default function DispatchDeliveryPage() {
  const { dispatches, orders, invoices, customers, userRole, userProfile } = useSales();

  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({
    status: 'all',
    warehouse: 'all',
  });
  const [selectedDispatch, setSelectedDispatch] = useState(null);

  const filters = [
    {
      key: 'status',
      label: 'Delivery Status',
      options: [
        { value: 'Ready for Dispatch', label: 'Ready for Dispatch' },
        { value: 'Dispatched', label: 'Dispatched' },
        { value: 'In Transit', label: 'In Transit' },
        { value: 'Out for Delivery', label: 'Out for Delivery' },
        { value: 'Delivered', label: 'Delivered' },
        { value: 'Delivery Failed', label: 'Delivery Failed' },
        { value: 'Returned', label: 'Returned' },
      ],
    },
    {
      key: 'warehouse',
      label: 'Origin Warehouse',
      options: [
        { value: 'Pune Central Plant', label: 'Pune Central Plant' },
        { value: 'Bhiwandi Mumbai Hub', label: 'Bhiwandi Mumbai Hub' },
        { value: 'Delhi NCR Hub', label: 'Delhi NCR Hub' },
        { value: 'Chennai Logistics Park', label: 'Chennai Logistics Park' },
      ],
    },
  ];

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSearch('');
    setFilterValues({ status: 'all', warehouse: 'all' });
  };

  // Helper to find customer by any identifier
  const getCustomerForDispatch = (d) => {
    return customers.find(
      (c) => c.id === d.customerId || c.customerId === d.customerId || c.name === d.customerName
    );
  };

  // Helper to find related order
  const getRelatedOrder = (orderNo) => {
    return orders.find((o) => o.orderNo === orderNo || o.id === orderNo);
  };

  // Helper to find linked invoice
  const getLinkedInvoice = (orderNo, dispatchRecord) => {
    return invoices.find(
      (inv) => inv.orderNo === orderNo || (dispatchRecord && inv.customerId === dispatchRecord.customerId && inv.orderNo === dispatchRecord.orderNo)
    );
  };

  // Scoped dispatches according to 4-tier Sales Hierarchy
  const scopedDispatches = useMemo(() => {
    return dispatches.filter((d) => {
      const customer = getCustomerForDispatch(d);
      return isCustomerInRoleScope(customer, userRole, userProfile);
    });
  }, [dispatches, customers, userRole, userProfile]);

  // Summary metrics calculated strictly from scoped dispatches
  const metrics = useMemo(() => {
    const total = scopedDispatches.length;
    const inTransit = scopedDispatches.filter((d) => d.status === 'In Transit' || d.status === 'Out for Delivery').length;
    const delivered = scopedDispatches.filter((d) => d.status === 'Delivered').length;
    const readyOrPending = scopedDispatches.filter((d) => d.status === 'Ready for Dispatch' || d.status === 'Pending').length;
    const failedOrReturned = scopedDispatches.filter((d) => d.status === 'Delivery Failed' || d.status === 'Returned').length;

    return { total, inTransit, delivered, readyOrPending, failedOrReturned };
  }, [scopedDispatches]);

  const filteredDispatches = useMemo(() => {
    return scopedDispatches.filter((d) => {
      const searchLower = search.toLowerCase();
      const customer = getCustomerForDispatch(d);
      const customerDisplayId = customer?.customerId || d.customerId || '';

      const matchesSearch =
        !search.trim() ||
        d.dispatchNo.toLowerCase().includes(searchLower) ||
        d.orderNo.toLowerCase().includes(searchLower) ||
        d.customerName.toLowerCase().includes(searchLower) ||
        customerDisplayId.toLowerCase().includes(searchLower) ||
        (d.carrier && d.carrier.toLowerCase().includes(searchLower)) ||
        (d.trackingNo && d.trackingNo.toLowerCase().includes(searchLower)) ||
        (d.items && d.items.some((i) => i.productName.toLowerCase().includes(searchLower)));

      const matchesStatus =
        filterValues.status === 'all' || d.status === filterValues.status;

      const matchesWarehouse =
        filterValues.warehouse === 'all' || d.warehouse === filterValues.warehouse;

      return matchesSearch && matchesStatus && matchesWarehouse;
    });
  }, [scopedDispatches, search, filterValues, customers]);

  // Strictly Read-Only Columns for Sales Users
  const columns = [
    {
      header: 'Dispatch Ref #',
      key: 'dispatchNo',
      render: (d) => (
        <div>
          <span className="font-semibold text-primary">{d.dispatchNo}</span>
          <span className="text-xs text-muted block">Carrier: {d.carrier}</span>
        </div>
      ),
    },
    {
      header: 'Sales Order ID',
      key: 'orderNo',
      render: (d) => (
        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
          {d.orderNo}
        </span>
      ),
    },
    {
      header: 'Customer ID',
      key: 'customerId',
      render: (d) => {
        const customer = getCustomerForDispatch(d);
        const displayId = customer?.customerId || d.customerId || 'CUST-001';
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
      render: (d) => (
        <div>
          <span className="font-medium text-slate-800 block">{d.customerName}</span>
          <span className="text-xs text-muted">{d.warehouse}</span>
        </div>
      ),
    },
    {
      header: 'Product Details',
      key: 'products',
      render: (d) => {
        if (!d.items || d.items.length === 0) return <span className="text-muted text-xs">—</span>;
        const first = d.items[0];
        const extra = d.items.length - 1;
        return (
          <div style={{ maxWidth: '170px' }}>
            <span className="text-xs font-medium text-slate-800 block truncate" title={first.productName}>
              {first.productName}
            </span>
            {extra > 0 && (
              <span className="text-xs text-muted">+{extra} more item{extra > 1 ? 's' : ''}</span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Ordered Qty',
      key: 'orderedQty',
      align: 'center',
      render: (d) => {
        const relatedOrder = getRelatedOrder(d.orderNo);
        const orderedTotal = relatedOrder
          ? relatedOrder.orderedQtyTotal ?? relatedOrder.items?.reduce((s, it) => s + (Number(it.qty) || 0), 0)
          : '—';
        return <span className="text-xs font-semibold text-slate-700">{orderedTotal}</span>;
      },
    },
    {
      header: 'Dispatched Qty',
      key: 'dispatchedQty',
      align: 'center',
      render: (d) => {
        const dispTotal = d.items ? d.items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0) : 0;
        return <span className="text-xs font-bold text-slate-900">{dispTotal}</span>;
      },
    },
    {
      header: 'Dispatch Date',
      key: 'dispatchDate',
      align: 'center',
      render: (d) => <span className="text-xs">{formatDate(d.dispatchDate)}</span>,
    },
    {
      header: 'Expected Delivery',
      key: 'expectedDeliveryDate',
      align: 'center',
      render: (d) => <span className="text-xs">{formatDate(d.expectedDeliveryDate)}</span>,
    },
    {
      header: 'Actual Delivery',
      key: 'deliveredDate',
      align: 'center',
      render: (d) =>
        d.deliveredDate ? (
          <span className="text-xs font-semibold text-success">{formatDate(d.deliveredDate)}</span>
        ) : (
          <span className="text-muted text-xs">—</span>
        ),
    },
    {
      header: 'Delivery Status',
      key: 'status',
      align: 'center',
      render: (d) => <StatusBadge status={d.status} />,
    },
    {
      header: 'Payment Status',
      key: 'paymentStatus',
      align: 'center',
      render: (d) => {
        const relatedOrder = getRelatedOrder(d.orderNo);
        const linkedInvoice = getLinkedInvoice(d.orderNo, d);
        const currentStatus = relatedOrder?.paymentStatus || linkedInvoice?.status || 'Unpaid';
        return <StatusBadge status={currentStatus} />;
      },
    },
    {
      header: 'Pending Balance',
      key: 'pendingBalance',
      align: 'right',
      render: (d) => {
        const relatedOrder = getRelatedOrder(d.orderNo);
        const linkedInvoice = getLinkedInvoice(d.orderNo, d);
        const balance = linkedInvoice
          ? linkedInvoice.balance
          : relatedOrder?.pendingBalance !== undefined
          ? relatedOrder.pendingBalance
          : 0;

        return (
          <span className={`text-xs font-bold ${balance > 0 ? 'text-danger' : 'text-success'}`}>
            {formatINR(balance)}
          </span>
        );
      },
    },
    {
      header: 'Tracking Info',
      key: 'tracking',
      render: (d) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800 block">{d.carrier}</span>
          <span className="font-mono text-muted">{d.trackingNo}</span>
        </div>
      ),
    },
    {
      header: 'Actions',
      align: 'center',
      render: (d) => (
        <button
          type="button"
          className="table-action-icon-btn"
          onClick={() => setSelectedDispatch(d)}
          title="Inspect consignment & fulfillment tracking details (Read-only)"
        >
          <Eye size={15} />
        </button>
      ),
    },
  ];

  return (
    <div className="page-container">
      {/* Page Header (Consignments strictly read-only for Sales) */}
      <div className="page-header-row mb-4">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="page-title">Dispatch &amp; Delivery</h2>
            {userRole === 'sales_manager' || userRole === 'admin' ? (
              <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                Company-Wide Tracking
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
            Read-only logistics tracking, consignment dispatch records, warehouse fulfillment, and delivery confirmations
          </p>
        </div>

        {/* Read-Only Informational Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            <Truck size={14} className="text-primary" />
            <span>Store &amp; Logistics Managed</span>
          </div>
        </div>
      </div>

      {/* Compact Summary KPI Cards */}
      <div className="summary-kpi-grid">
        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
          <div className="summary-kpi-label">Total Shipments</div>
          <div className="summary-kpi-value">{metrics.total}</div>
          <div className="summary-kpi-sub">Scoped consignments</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
          <div className="summary-kpi-label">Ready / Pending</div>
          <div className="summary-kpi-value text-warning">{metrics.readyOrPending}</div>
          <div className="summary-kpi-sub">Awaiting carrier pickup</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #8b5cf6' }}>
          <div className="summary-kpi-label">In Transit</div>
          <div className="summary-kpi-value" style={{ color: '#7c3aed' }}>{metrics.inTransit}</div>
          <div className="summary-kpi-sub">En route with carrier</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
          <div className="summary-kpi-label">Delivered</div>
          <div className="summary-kpi-value text-success">{metrics.delivered}</div>
          <div className="summary-kpi-sub">Proof of delivery verified</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #ef4444' }}>
          <div className="summary-kpi-label">Failed / Returned</div>
          <div className="summary-kpi-value text-danger">{metrics.failedOrReturned}</div>
          <div className="summary-kpi-sub">Delivery exceptions</div>
        </div>
      </div>

      <SearchFilterBar
        searchPlaceholder="Search by consignment #, order #, customer name, customer ID, carrier, tracking #, or product..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      <DataTable
        columns={columns}
        data={filteredDispatches}
        keyField="id"
        emptyMessage="No dispatch records match your role scope and search filters"
        pageSize={8}
      />

      {/* Consignment Inspection Modal (Strictly Read-Only) */}
      {selectedDispatch && (
        <Modal
          isOpen={Boolean(selectedDispatch)}
          onClose={() => setSelectedDispatch(null)}
          size="large"
          title={`Dispatch Consignment ${selectedDispatch.dispatchNo}`}
          subtitle={`Sales Order: ${selectedDispatch.orderNo} • Customer: ${selectedDispatch.customerName}`}
          footer={
            <div className="modal-actions-bar" style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedDispatch(null)}
              >
                Close Inspection
              </button>
            </div>
          }
        >
          <div className="dispatch-detail-view">
            {/* Meta Banner */}
            <div className="detail-meta-banner mb-4">
              <div className="meta-col">
                <span className="meta-label">Customer</span>
                <span className="meta-val font-semibold">{selectedDispatch.customerName}</span>
                <span className="text-xs text-primary font-mono block">
                  {getCustomerForDispatch(selectedDispatch)?.customerId || selectedDispatch.customerId}
                </span>
              </div>
              <div className="meta-col">
                <span className="meta-label">Carrier</span>
                <span className="meta-val font-semibold">{selectedDispatch.carrier}</span>
              </div>
              <div className="meta-col">
                <span className="meta-label">Tracking / AWB</span>
                <span className="meta-val font-mono">{selectedDispatch.trackingNo}</span>
              </div>
              <div className="meta-col">
                <span className="meta-label">Delivery Status</span>
                <StatusBadge status={selectedDispatch.status} />
              </div>
              <div className="meta-col">
                <span className="meta-label">Payment Status</span>
                <StatusBadge
                  status={
                    getRelatedOrder(selectedDispatch.orderNo)?.paymentStatus ||
                    getLinkedInvoice(selectedDispatch.orderNo, selectedDispatch)?.status ||
                    'Unpaid'
                  }
                />
              </div>
            </div>

            {/* Read-Only Store Synchronization Callout */}
            <div className="alert-callout alert-callout-info mb-4" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PackageCheck size={18} className="text-primary" />
              <div style={{ fontSize: '12px', color: '#1e3a8a' }}>
                <strong>Store &amp; Logistics Authority:</strong> Dispatch notes and consignment delivery statuses are recorded by the Store &amp; Logistics department. Sales users have real-time tracking access for customer coordination and receivables management.
              </div>
            </div>

            <div className="info-display-grid mb-4">
              <div className="info-box">
                <span className="info-label flex items-center gap-1">
                  <MapPin size={13} /> Originating Warehouse
                </span>
                <p className="info-value">{selectedDispatch.warehouse}</p>
              </div>
              <div className="info-box">
                <span className="info-label flex items-center gap-1">
                  <Calendar size={13} /> Dispatch Date
                </span>
                <p className="info-value">{formatDate(selectedDispatch.dispatchDate)}</p>
              </div>
              <div className="info-box">
                <span className="info-label flex items-center gap-1">
                  <Calendar size={13} /> Expected Delivery
                </span>
                <p className="info-value">{formatDate(selectedDispatch.expectedDeliveryDate)}</p>
              </div>
              <div className="info-box">
                <span className="info-label flex items-center gap-1">
                  <Calendar size={13} /> Actual Delivery
                </span>
                <p className="info-value font-semibold">
                  {selectedDispatch.deliveredDate ? (
                    <span className="text-success">{formatDate(selectedDispatch.deliveredDate)}</span>
                  ) : (
                    <span className="text-muted">In Transit / Pending</span>
                  )}
                </p>
              </div>
            </div>

            <div className="section-title mb-2">Picked &amp; Dispatched Consignment Items</div>
            <div className="table-responsive">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ textAlign: 'center' }}>Dispatched Qty</th>
                    <th>Batch / Serial Allocation</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDispatch.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="font-semibold text-primary">{item.productName}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.qty} Units</td>
                      <td className="font-mono text-xs">{item.batchOrSerial || 'Standard Allocation'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
