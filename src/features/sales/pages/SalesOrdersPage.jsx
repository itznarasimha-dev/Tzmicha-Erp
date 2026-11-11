import { useState, useMemo } from 'react';
import DataTable from '../components/common/DataTable';
import SearchFilterBar from '../components/common/SearchFilterBar';
import StatusBadge from '../components/common/StatusBadge';
import OrderDetailModal from '../components/modals/OrderDetailModal';
import EditOrderModal from '../components/modals/EditOrderModal';
import CreateDispatchModal from '../components/modals/CreateDispatchModal';
import AssignToServiceModal from '../components/modals/AssignToServiceModal';
import { useSales } from '../context/SalesContext';
import { formatINR, formatDate } from '../utils/formatters';
import { Eye, Edit, CheckCircle2 } from 'lucide-react';

export default function SalesOrdersPage() {
  const { orders, customers = [], invoices, payments, dispatches = [], validateServiceHandoffConditions } = useSales();

  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({
    fulfilmentStatus: 'all',
    paymentStatus: 'all',
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [dispatchOrder, setDispatchOrder] = useState(null);
  const [assignServiceOrder, setAssignServiceOrder] = useState(null);

  // Helper to reliably compute order financials: totalAmount, amountPaid, pendingBalance
  const getOrderFinancials = (order) => {
    if (order.amountPaid !== undefined && order.pendingBalance !== undefined) {
      return {
        amountPaid: Number(order.amountPaid || 0),
        pendingBalance: Number(order.pendingBalance || 0),
      };
    }
    const linkedInvoices = invoices.filter((i) => i.orderNo === order.orderNo);
    const invoicePaid = linkedInvoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0);
    const linkedPayments = payments.filter((p) => p.orderNo === order.orderNo);
    const directPaid = linkedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalPaid = Math.max(invoicePaid, directPaid);
    const pendingBalance = Math.max(0, Number(order.totalAmount || 0) - totalPaid);
    return {
      amountPaid: totalPaid,
      pendingBalance,
    };
  };

  // Helper to derive dispatch quantity from actual dispatch records & order line items
  const getOrderDispatchInfo = (order) => {
    const orderDispatches = dispatches.filter(
      (d) => d.orderNo === order.orderNo && d.status !== 'Cancelled' && d.status !== 'Delivery Failed'
    );
    const fromRecords = orderDispatches.reduce((sum, d) => {
      const dQty = (d.items || []).reduce((iSum, item) => iSum + Number(item.qty || item.dispatchedQty || 0), 0);
      return sum + dQty;
    }, 0);
    const fromItems = (order.items || []).reduce((sum, it) => sum + Number(it.dispatchedQty || 0), 0);
    const totalDispatched = Math.max(fromRecords, fromItems);
    const totalOrdered = Number(
      order.orderedQtyTotal || (order.items || []).reduce((sum, it) => sum + Number(it.orderedQty || it.qty || 0), 0)
    );
    const remaining = Math.max(0, totalOrdered - totalDispatched);
    return { totalDispatched, totalOrdered, remaining };
  };

  const filters = [
    {
      key: 'fulfilmentStatus',
      label: 'Fulfilment Status',
      options: [
        { value: 'Confirmed', label: 'Confirmed' },
        { value: 'Checking Stock', label: 'Checking Stock' },
        { value: 'Awaiting Stock', label: 'Awaiting Stock (Shortage)' },
        { value: 'Ready for Dispatch', label: 'Ready for Dispatch' },
        { value: 'Partially Dispatched', label: 'Partially Dispatched' },
        { value: 'Dispatched', label: 'Dispatched' },
        { value: 'In Transit', label: 'In Transit' },
        { value: 'Delivered', label: 'Delivered' },
        { value: 'On Hold', label: 'On Hold' },
        { value: 'Cancelled', label: 'Cancelled' },
      ],
    },
    {
      key: 'paymentStatus',
      label: 'Payment Status',
      options: [
        { value: 'Unpaid', label: 'Unpaid' },
        { value: 'Partially Paid', label: 'Partially Paid' },
        { value: 'Paid', label: 'Paid in Full' },
        { value: 'Overdue', label: 'Overdue' },
        { value: 'Refunded', label: 'Refunded' },
      ],
    },
  ];

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSearch('');
    setFilterValues({ fulfilmentStatus: 'all', paymentStatus: 'all' });
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const qNum = o.quotationNo || '';
      const matchesSearch =
        !search.trim() ||
        o.orderNo.toLowerCase().includes(search.toLowerCase()) ||
        qNum.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName.toLowerCase().includes(search.toLowerCase());

      const matchesFulfil =
        filterValues.fulfilmentStatus === 'all' ||
        o.fulfilmentStatus === filterValues.fulfilmentStatus;

      const matchesPay =
        filterValues.paymentStatus === 'all' ||
        (o.paymentStatus || 'Unpaid') === filterValues.paymentStatus;

      return matchesSearch && matchesFulfil && matchesPay;
    });
  }, [orders, search, filterValues]);

  // Columns adhering strictly to Section 2, 3, 4, 5
  const columns = [
    {
      header: 'Sales Order #',
      key: 'orderNo',
      render: (o) => (
        <button
          type="button"
          onClick={() => setSelectedOrder(o)}
          className="font-semibold text-primary hover:underline bg-transparent border-0 p-0 text-left cursor-pointer"
          title={`View Order ${o.orderNo}`}
        >
          {o.orderNo}
        </button>
      ),
    },
    {
      header: 'Quotation #',
      key: 'quotationNo',
      render: (o) => (
        o.quotationNo ? (
          <span className="font-medium text-slate-700">{o.quotationNo}</span>
        ) : (
          <span className="text-muted">—</span>
        )
      ),
    },
    {
      header: 'Customer ID',
      key: 'customerId',
      render: (o) => {
        const cust = customers.find(
          (c) => c.id === o.customerId || c.customerId === o.customerId || c.code === o.customerId || c.name === o.customerName
        );
        const displayId = cust?.customerId || cust?.code || o.customerId || '—';
        return (
          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {displayId}
          </span>
        );
      },
    },
    {
      header: 'Customer',
      key: 'customerName',
      render: (o) => (
        <span className="font-medium text-slate-800">{o.customerName}</span>
      ),
    },
    {
      header: 'Order Date',
      key: 'orderDate',
      align: 'center',
      render: (o) => <span className="text-xs text-slate-700">{formatDate(o.orderDate)}</span>,
    },
    {
      header: 'Product Summary',
      key: 'productSummary',
      render: (o) => {
        const items = o.items || [];
        const summary = items.map((i) => i.productName).join(', ');
        return (
          <div className="text-xs truncate max-w-xs text-slate-700" title={summary}>
            {summary || 'Product Line Items'}
          </div>
        );
      },
    },
    {
      header: 'Ordered Qty',
      key: 'orderedQty',
      align: 'center',
      render: (o) => <span className="text-xs font-semibold text-slate-800">{o.orderedQtyTotal} units</span>,
    },
    {
      header: 'Dispatch Quantity',
      key: 'dispatchedQty',
      align: 'center',
      render: (o) => {
        const { totalDispatched, totalOrdered, remaining } = getOrderDispatchInfo(o);
        if (totalDispatched === 0) {
          return (
            <span className="text-xs text-muted">
              0 units ({remaining} remaining)
            </span>
          );
        }
        if (remaining === 0 && totalOrdered > 0) {
          return (
            <span className="text-xs font-semibold text-emerald-700">
              {totalDispatched} units (Fully Dispatched)
            </span>
          );
        }
        return (
          <span className="text-xs font-medium text-amber-700">
            {totalDispatched} units <span className="text-muted font-normal">({remaining} remaining)</span>
          </span>
        );
      },
    },
    {
      header: 'Delivery Target Date',
      key: 'requiredDeliveryDate',
      align: 'center',
      render: (o) => <span className="text-xs text-slate-700">{formatDate(o.requiredDeliveryDate)}</span>,
    },
    {
      header: 'Fulfillment Status',
      key: 'fulfilmentStatus',
      align: 'center',
      render: (o) => <StatusBadge status={o.fulfilmentStatus} />,
    },
    {
      header: 'Payment Status',
      key: 'paymentStatus',
      align: 'center',
      render: (o) => <StatusBadge status={o.paymentStatus || 'Unpaid'} />,
    },
    {
      header: 'Order Value',
      key: 'totalAmount',
      align: 'right',
      render: (o) => <span className="font-bold text-slate-900">{formatINR(o.totalAmount)}</span>,
    },
    {
      header: 'Pending Balance',
      key: 'pendingBalance',
      align: 'right',
      render: (o) => {
        const { pendingBalance } = getOrderFinancials(o);
        return (
          <span className={`font-bold ${pendingBalance > 0 ? 'text-danger' : 'text-success'}`}>
            {formatINR(pendingBalance)}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      align: 'center',
      render: (o) => {
        const handoff = o.serviceHandoff;
        const isAssigned = Boolean(handoff && handoff.status === 'Assigned');
        const val = validateServiceHandoffConditions(o);

        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <button
              type="button"
              className="table-action-icon-btn"
              onClick={() => setSelectedOrder(o)}
              title="Inspect order details and dispatch status"
            >
              <Eye size={15} />
            </button>
            <button
              type="button"
              className="table-action-icon-btn"
              onClick={() => setEditingOrder(o)}
              title="Edit Sales Order (Allowed fields: Customer, Dates, Products, Quantities)"
            >
              <Edit size={15} />
            </button>

            {isAssigned ? (
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: '11px',
                    padding: '4px 10px',
                    height: '26px',
                    opacity: 0.6,
                    cursor: 'not-allowed',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    border: '1px solid #cbd5e1',
                  }}
                  disabled
                  title={`Order has already been assigned to Service on ${formatDate(handoff.assignedAt)} by ${handoff.assignedByName} (${handoff.assignedByRole}).`}
                >
                  Assign to Service
                </button>
                <span
                  style={{
                    fontSize: '10px',
                    color: '#065f46',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    padding: '1px 6px',
                    borderRadius: '4px',
                  }}
                  title={`Assigned by ${handoff.assignedByName} (${handoff.assignedByRole}) on ${formatDate(handoff.assignedAt)}`}
                >
                  <CheckCircle2 size={11} className="text-emerald-600" />
                  Assigned by {handoff.assignedByName} ({handoff.assignedByRole})
                </span>
              </div>
            ) : val.eligible ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '11px',
                  padding: '4px 12px',
                  height: '28px',
                  fontWeight: '600',
                  backgroundColor: '#2563eb',
                  borderColor: '#1d4ed8',
                  color: '#ffffff',
                }}
                onClick={() => setAssignServiceOrder(o)}
                title="Assign this order to Service (All 5 preconditions met)"
              >
                Assign to Service
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '11px',
                  padding: '4px 12px',
                  height: '28px',
                  opacity: 0.65,
                  cursor: 'not-allowed',
                  backgroundColor: '#e2e8f0',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                }}
                disabled
                title={`Cannot Assign to Service:\n• ${val.reasons.join('\n• ')}`}
              >
                Assign to Service
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="page-container">
      {/* Page Header (Add Sales Order button removed per Section 2) */}
      <div className="page-header-row mb-4">
        <div>
          <h2 className="page-title">Sales Orders</h2>
          <p className="page-description">
            Process confirmed customer orders, verify inventory availability, check factory shortages, and initiate fulfillment
          </p>
        </div>
      </div>

      <SearchFilterBar
        searchPlaceholder="Search orders by order number, quotation number, or customer..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      <DataTable
        columns={columns}
        data={filteredOrders}
        keyField="id"
        emptyMessage="No sales orders found matching filters"
        pageSize={5}
        minWidth="1680px"
      />

      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onOpenDispatchModal={(order) => setDispatchOrder(order)}
        onOpenAssignService={(order) => setAssignServiceOrder(order)}
      />

      {/* Edit Order Modal */}
      <EditOrderModal
        isOpen={Boolean(editingOrder)}
        onClose={() => setEditingOrder(null)}
        order={editingOrder}
      />

      {/* Create Dispatch Modal */}
      <CreateDispatchModal
        isOpen={Boolean(dispatchOrder)}
        onClose={() => setDispatchOrder(null)}
        preselectedOrder={dispatchOrder}
      />

      {/* Assign to Service Modal */}
      <AssignToServiceModal
        isOpen={Boolean(assignServiceOrder)}
        onClose={() => setAssignServiceOrder(null)}
        order={assignServiceOrder}
      />
    </div>
  );
}
