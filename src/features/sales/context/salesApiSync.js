import { getAuthToken } from '../../../api/client';
import { salesApi } from '../../../api/sales';
import { financeApi } from '../../../api/finance';
import { operationsApi } from '../../../api/operations';
import { useErpStore } from '../../../store/useErpStore';

/**
 * Executes a Sales/Finance/Operations API persistence request when an auth session
 * token is active. Surfaces real backend/database errors directly in the global banner
 * rather than pretending persistence succeeded.
 */
export async function persistSalesAction(apiCall, contextLabel = 'Sales operation', hooks = {}) {
  if (!getAuthToken() && !useErpStore.getState().isAuthenticated) {
    return { skipped: true };
  }
  try {
    const data = await apiCall();
    if (typeof hooks.onSuccess === 'function') {
      await hooks.onSuccess(data);
    }
    return { ok: true, data };
  } catch (err) {
    if (typeof hooks.onRollback === 'function') {
      hooks.onRollback();
    }
    const message = err instanceof Error ? err.message : `${contextLabel} could not be persisted to PostgreSQL.`;
    useErpStore.getState().setApiError(`${contextLabel}: ${message}`);
    if (typeof hooks.setLocalError === 'function') {
      hooks.setLocalError(`${contextLabel}: ${message}`);
    }
    return { ok: false, error: message };
  }
}

export function mapBackendProduct(raw) {
  const stdPrice = Number(raw.standardPrice ?? raw.standardSellingPrice ?? raw.sellingPrice ?? raw.salePrice ?? 0);
  const batches = Array.isArray(raw.batches) ? raw.batches : [];
  const batchAvail = batches
    .filter((b) => !b.qcStatus || b.qcStatus === 'released')
    .reduce((acc, b) => acc + Math.max(0, Number(b.qtyOnHand ?? 0) - Number(b.qtyReserved ?? 0)), 0);
  const batchReserved = batches.reduce((acc, b) => acc + Math.max(0, Number(b.qtyReserved ?? 0)), 0);
  const batchOnHand = batches.reduce((acc, b) => acc + Math.max(0, Number(b.qtyOnHand ?? 0)), 0);
  const avail = Number(raw.totalAvailableQty ?? raw.availableQuantity ?? raw.availableQty ?? batchAvail ?? 0);
  const reserved = Number(raw.reservedQuantity ?? raw.reservedQty ?? batchReserved ?? 0);
  const total = Number(raw.totalQuantity ?? raw.totalQty ?? (batchOnHand > 0 ? batchOnHand : avail + reserved));
  const lowThreshold = Number(raw.lowStockThreshold ?? 10);
  const realCost =
    raw.costs?.[0]?.unitCost !== undefined
      ? Number(raw.costs[0].unitCost)
      : raw.actualCost !== undefined
      ? Number(raw.actualCost)
      : raw.costPrice !== undefined
      ? Number(raw.costPrice)
      : null;
  return {
    id: raw.id,
    code: raw.sku || raw.code || raw.id,
    name: raw.name || 'Product',
    model: raw.model || raw.sku || '',
    category: raw.category?.name || raw.category || 'Industrial Equipment',
    supplyType: raw.supplyType || 'Manufactured',
    uom: raw.uom?.code || raw.uom?.name || raw.unit || 'Pieces',
    salePrice: stdPrice,
    sellingPrice: stdPrice,
    costPrice: realCost,
    taxRate: Number(raw.taxRatePercent ?? raw.taxRate ?? 18),
    totalQty: total,
    availableQty: avail,
    reservedQty: reserved,
    minStockLevel: lowThreshold,
    status: avail <= 0 ? 'Critical Shortage' : avail <= lowThreshold ? 'Low Stock' : 'In Stock',
  };
}

export function mapBackendLead(raw) {
  return {
    id: raw.id,
    leadId: raw.leadNumber || raw.leadCode || raw.leadId || raw.id,
    companyName: raw.customerName || raw.companyName || '',
    customerName: raw.contactName || raw.customerName || '',
    mobile: raw.phone || raw.mobile || '',
    phone: raw.phone || '',
    email: raw.email || '',
    location: raw.city || raw.location || '',
    interestedProduct: raw.productInterest || raw.interestedProduct || '',
    estimatedValue: Number(raw.estimatedValue ?? 0),
    dateReceived: raw.createdAt ? String(raw.createdAt).split('T')[0] : raw.dateReceived || '',
    sentBy: raw.sourceCampaign || raw.sentBy || 'Marketing Team',
    status: raw.status || 'New',
    notes: raw.notes || '',
    assignedEmployeeId: raw.assignedToId || raw.assignedEmployeeId || null,
    assignedEmployeeName: raw.assignedTo?.name || raw.assignedEmployeeName || null,
    linkedCustomerId: raw.convertedPartyId || raw.linkedCustomerId || null,
  };
}

export function mapBackendFollowUp(raw) {
  return {
    id: raw.id,
    customerId: raw.partyId || raw.customerId || '',
    customerName: raw.party?.businessName || raw.party?.name || raw.customerName || 'Customer',
    followUpDate: raw.dueDate ? String(raw.dueDate).split('T')[0] : raw.followUpDate || '',
    dueDate: raw.dueDate ? String(raw.dueDate).split('T')[0] : '',
    mode: raw.mode || 'Phone Call',
    subject: raw.subject || '',
    notes: raw.notes || '',
    status: raw.status || 'Scheduled',
    owner: raw.ownerUser?.name || raw.owner || 'Sales Staff',
    priority: raw.priority || 'Medium',
  };
}

export function mapBackendCustomer(raw) {
  return {
    id: raw.id,
    customerId: raw.code || raw.id,
    code: raw.code || raw.id,
    name: raw.businessName || raw.name,
    type: raw.partyType || raw.customerType || 'Dealer/Distributor',
    contactPerson: raw.contactPerson || raw.name,
    phone: raw.phone || '',
    email: raw.email || '',
    address: raw.billingAddress || '',
    gstin: raw.gstin || '',
    regionId: raw.regionId || 'REG-HYD',
    assignedTo: raw.assignedSalesUser?.name || '',
    assignedEmployeeId: raw.assignedSalesUser?.employeeCode || raw.assignedSalesUserId || '',
    creditLimit: Number(raw.creditLimit ?? 0),
    outstandingBalance: Number(raw.currentOutstanding ?? 0),
    status: raw.status || 'Active',
    isNew: !raw.lastOrderDate,
    lastOrderDate: raw.lastOrderDate || null,
    totalOrders: Number(raw.totalCompletedOrders ?? 0),
  };
}

export function mapBackendQuotation(raw) {
  const creatorName = raw.salesUser?.name || raw.salesUserName || 'Sales Staff';
  const creatorRole = raw.salesUser?.role?.code || raw.salesUser?.role?.subRole || 'sales_rep';
  const rawApproval = String(raw.approvalStatus || '').toLowerCase();
  const hasRevisions = Number(raw.revisionCount || 0) > 0 || (Array.isArray(raw.revisions) && raw.revisions.length > 0);
  const normalizedStatus =
    raw.status === 'Draft'
      ? 'Draft'
      : raw.status === 'Converted'
      ? 'Converted'
      : rawApproval === 'rejected' || raw.status === 'Rejected'
      ? 'Rejected'
      : rawApproval === 'approved' || raw.status === 'Accepted' || raw.status === 'Approved'
      ? 'Approved'
      : rawApproval === 'pending_approval' || raw.status === 'Sent' || raw.status === 'Awaiting Approval' || raw.status === 'Pending Approval'
      ? hasRevisions
        ? 'Revised—Pending Approval'
        : 'Pending Approval'
      : raw.status || 'Pending Approval';
  return {
    id: raw.id,
    quotationNo: raw.quotationNo || raw.id,
    customerId: raw.partyId,
    customerName: raw.party?.businessName || raw.party?.name || 'Customer',
    customerEmail: raw.party?.email || '',
    customerPhone: raw.party?.phone || '',
    createdDate: raw.createdAt ? String(raw.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
    validUntil: raw.validUntil ? String(raw.validUntil).split('T')[0] : '',
    status: normalizedStatus,
    approvalStatus: raw.approvalStatus || undefined,
    createdBy: raw.salesUser?.employeeCode || raw.salesUserId || '',
    createdByUserId: raw.salesUserId || '',
    createdByName: creatorName,
    createdByRole: creatorRole,
    raisedBy: `${creatorName}`,
    salesOwner: `${creatorName}`,
    items: (raw.lines || []).map((l) => ({
      productId: l.productId,
      productName: l.product?.name || l.productName || l.productSku || 'Product',
      productCode: l.product?.sku || l.productSku || '',
      uom: l.unit || 'Pieces',
      unitPrice: Number(l.unitPrice ?? 0),
      qty: Number(l.quantity ?? 1),
      discountPercent: Number(l.discountPercent ?? 0),
      taxRate: Number(l.taxRatePercent ?? 18),
      lineTotal: Number(l.netAmount ?? 0),
    })),
    subtotal: Number(raw.subtotal ?? 0),
    discountTotal: Number(raw.totalDiscount ?? 0),
    taxTotal: Number(raw.totalTax ?? 0),
    grandTotal: Number(raw.totalAmount ?? 0),
    notes: raw.notes || '',
  };
}

const ORDER_STATUS_LABELS = {
  confirmed: 'Confirmed',
  reserved: 'Reserved',
  partially_dispatched: 'Partially Dispatched',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  pending_discount_approval: 'Pending Discount Approval',
  awaiting_stock: 'Awaiting Stock',
};

const PAYMENT_STATUS_LABELS = {
  unpaid: 'Unpaid',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
};

export function mapBackendOrder(raw) {
  const rawStatusKey = String(raw.status || 'confirmed').toLowerCase();
  const rawPayKey = String(raw.paymentStatus || 'unpaid').toLowerCase();
  const linkedRequests = Array.isArray(raw.serviceRequests) ? raw.serviceRequests : [];
  const handedOver = raw.handoverToServiceStatus === 'handed_over' || linkedRequests.length > 0;
  return {
    id: raw.id,
    orderNo: raw.orderNumber || raw.id,
    quotationId: raw.quotationId || raw.quotation?.id || null,
    quotationNo: raw.quotation?.quotationNo || raw.quotationNo || null,
    invoiceNo: raw.invoices?.[0]?.invoiceNumber || raw.invoiceNo || null,
    customerId: raw.partyId,
    customerName: raw.party?.businessName || raw.party?.name || 'Customer',
    customerType: raw.party?.partyType || 'Distributor/Dealer',
    orderDate: raw.orderDate ? String(raw.orderDate).split('T')[0] : new Date().toISOString().split('T')[0],
    requiredDeliveryDate: raw.requiredDeliveryDate ? String(raw.requiredDeliveryDate).split('T')[0] : '',
    fulfilmentStatus: ORDER_STATUS_LABELS[rawStatusKey] || raw.status || 'Confirmed',
    paymentStatus: PAYMENT_STATUS_LABELS[rawPayKey] || raw.paymentStatus || 'Unpaid',
    totalAmount: Number(raw.totalAmount ?? 0),
    amountPaid: Number(raw.amountPaid ?? 0),
    pendingBalance: Math.max(0, Number(raw.totalAmount ?? 0) - Number(raw.amountPaid ?? 0)),
    requiresDiscountApproval: Boolean(raw.requiresDiscountApproval),
    discountApprovalStatus: raw.discountApprovalStatus || 'not_required',
    handoverToServiceStatus: raw.handoverToServiceStatus || (handedOver ? 'handed_over' : 'none'),
    serviceRequests: linkedRequests,
    serviceHandoff: handedOver
      ? {
          status: 'Assigned',
          serviceRequestId: linkedRequests[0]?.id || null,
          requestNumber: linkedRequests[0]?.requestNumber || null,
          serviceCompletionStatus: linkedRequests[0]?.status || 'Assigned to Service',
        }
      : null,
    items: (raw.lines || []).map((l) => ({
      id: l.id,
      productId: l.productId,
      productName: l.product?.name || l.productName || 'Product',
      orderedQty: Number(l.quantity ?? 0),
      reservedQty: Number(l.reservedQty ?? l.allocatedQty ?? 0),
      dispatchedQty: Number(l.dispatchedQty ?? 0),
      unitPrice: Number(l.unitPrice ?? 0),
      discountPercent: Number(l.discountPercent ?? 0),
      taxRate: Number(l.taxRatePercent ?? 18),
      lineTotal: Number(l.netAmount ?? 0),
    })),
    notes: raw.notes || '',
  };
}

export function mapBackendDispatch(raw) {
  const statusMap = {
    ready_for_dispatch: 'Ready for Dispatch',
    dispatched: 'Dispatched',
    in_transit: 'In Transit',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    delivery_failed: 'Delivery Failed',
    returned: 'Returned',
  };
  const deliveryKey = String(raw.deliveryStatus || raw.status || 'dispatched').toLowerCase();
  return {
    id: raw.id,
    dispatchNo: raw.dispatchNumber || raw.dispatchNo || raw.id,
    orderNo: raw.salesOrder?.orderNumber || raw.orderNo || raw.salesOrderId || '',
    customerId: raw.partyId || raw.customerId || '',
    customerName: raw.party?.businessName || raw.party?.name || raw.customerName || 'Customer',
    dispatchDate: raw.dispatchedAt ? String(raw.dispatchedAt).split('T')[0] : raw.dispatchDate || '',
    expectedDeliveryDate: raw.expectedDeliveryDate ? String(raw.expectedDeliveryDate).split('T')[0] : '',
    deliveredDate: raw.deliveredAt ? String(raw.deliveredAt).split('T')[0] : raw.deliveredDate || null,
    warehouse: raw.warehouse?.name || raw.warehouseName || raw.warehouse || 'Warehouse',
    carrier: raw.carrierName || raw.carrier || 'Standard Courier',
    trackingNo: raw.trackingNumber || raw.trackingNo || '',
    status: statusMap[deliveryKey] || raw.status || 'Dispatched',
    items: (raw.lines || raw.items || []).map((l) => ({
      productId: l.productId,
      productName: l.product?.name || l.productName || 'Product',
      qty: Number(l.quantity ?? l.qty ?? 0),
      batchOrSerial: l.serialNumber || l.batchId || 'Batch Assigned',
    })),
  };
}

export function mapBackendReturn(raw) {
  const isRestocked = raw.restockStatus === 'restocked' || Boolean(raw.restockApproved);
  return {
    id: raw.id,
    returnNo: raw.returnNumber || raw.returnNo || raw.id,
    itemType: raw.itemType || 'Return',
    type: raw.type || 'Return',
    customerId: raw.partyId || raw.customerId || '',
    customerName: raw.party?.businessName || raw.party?.name || raw.customerName || 'Customer',
    regionId: raw.party?.regionId || raw.regionId || '',
    salesOrderId: raw.salesOrderId || '',
    orderNo: raw.salesOrder?.orderNumber || raw.orderNo || raw.salesOrderId || '',
    returnDate: raw.createdAt ? String(raw.createdAt).split('T')[0] : raw.returnDate || '',
    productCode: raw.lines?.[0]?.productId || raw.productCode || '',
    productName: raw.lines?.[0]?.product?.name || raw.productName || 'Returned Product',
    qty: (raw.lines || []).reduce((s, l) => s + Number(l.quantity ?? 0), 0) || Number(raw.qty ?? 1),
    reason: raw.reason || '',
    caseStatus: raw.status || 'Requested',
    status: raw.status || 'Requested',
    stockStatus: isRestocked ? 'Restocked' : 'Awaiting Stock Inspection',
    restockApproved: isRestocked,
    refundStatus: raw.refundStatus || (Number(raw.totalRefundAmount ?? 0) > 0 ? 'Pending Finance Authorization' : 'Not Applicable'),
    totalRefundAmount: Number(raw.totalRefundAmount ?? 0),
    notes: raw.notes || '',
  };
}

export function mapBackendPayment(raw) {
  const rawStatus = String(raw.status || 'pending_verification').toLowerCase();
  const normalizedStatus =
    rawStatus === 'verified'
      ? 'Verified'
      : rawStatus === 'discrepancy_flagged' || rawStatus === 'discrepancy' || rawStatus === 'flagged'
      ? 'Discrepancy'
      : 'Pending Verification';
  return {
    ...raw,
    receiptNo: raw.paymentNumber || raw.receiptNo || raw.id,
    paymentDate: raw.paymentDate ? String(raw.paymentDate).split('T')[0] : '',
    amount: Number(raw.amount ?? 0),
    method: raw.mode || raw.method || 'NEFT',
    referenceNo: raw.referenceNo || '',
    orderNo: raw.salesOrder?.orderNumber || raw.orderNo || raw.salesOrderId || '',
    invoiceNo: raw.allocations?.[0]?.invoice?.invoiceNumber || raw.invoiceNo || '',
    customerName: raw.party?.businessName || raw.party?.name || raw.customerName || 'Customer',
    status: normalizedStatus,
    backendStatus: rawStatus,
  };
}

export function mapBackendInvoice(raw) {
  const totalAmount = Number(raw.totalAmount ?? 0);
  const paidAmount = Number(raw.paidAmount ?? raw.amountPaid ?? 0);
  const outstandingBalance = Math.max(0, Number(raw.outstandingBalance ?? raw.balanceDue ?? totalAmount - paidAmount));
  const rawApprovalStatus = String(raw.approvalStatus || raw.status || '').toLowerCase();
  const approvalStatus =
    rawApprovalStatus === 'pending_service_approval'
      ? 'Pending Service Approval'
      : rawApprovalStatus === 'pending_finance' ||
        rawApprovalStatus === 'pending_approval' ||
        raw.status === 'Pending Approval'
      ? 'Pending Approval'
      : rawApprovalStatus === 'rejected'
      ? 'Rejected'
      : 'Approved';
  return {
    id: raw.id,
    invoiceNo: raw.invoiceNumber || raw.invoiceNo || raw.id,
    orderNo: raw.salesOrder?.orderNumber || raw.salesOrderId || null,
    customerId: raw.partyId,
    customerName: raw.party?.businessName || raw.party?.name || 'Customer',
    source: raw.source || 'sales',
    serviceRequestId: raw.serviceRequestId || null,
    serviceApprovedBy: raw.serviceApprovedById || null,
    invoiceDate: raw.issueDate ? String(raw.issueDate).split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: raw.dueDate ? String(raw.dueDate).split('T')[0] : '',
    totalAmount,
    paidAmount,
    balance: outstandingBalance,
    status:
      raw.status === 'paid' || raw.paymentStatus === 'paid'
        ? 'Paid'
        : raw.paymentStatus === 'partially_paid'
        ? 'Partially Paid'
        : approvalStatus === 'Approved'
        ? 'Issued'
        : approvalStatus === 'Pending Service Approval'
        ? 'Pending Service Approval'
        : approvalStatus === 'Rejected'
        ? 'Rejected'
        : 'Pending Approval',
    approvalStatus,
    approvedBy: raw.approvedBy?.name || raw.approvedById || raw.approvedByUserId || null,
    approvedAt: raw.approvedAt || null,
    notes: raw.notes || '',
  };
}

export async function fetchSalesBootstrapData(canAccessPipeline) {
  if (!getAuthToken() && !useErpStore.getState().isAuthenticated) return null;

  const [customers, products, quotations, orders, leads, followups, dispatchBundle, invoices, payments, expenses, attendance] =
    await Promise.all([
      salesApi.listCustomers(),
      salesApi.listProducts(),
      salesApi.listQuotations(),
      salesApi.listOrders(),
      salesApi.listLeads(),
      salesApi.listFollowUps(),
      salesApi.listDispatchesAndReturns(),
      financeApi.listInvoices(),
      financeApi.listPayments(),
      operationsApi.listExpenses(),
      operationsApi.getAttendanceAndLeaves(),
    ]);

  let opportunities = null;
  if (canAccessPipeline) {
    opportunities = await salesApi.listOpportunities();
  }

  return {
    customers: Array.isArray(customers) ? customers.map(mapBackendCustomer) : [],
    products: Array.isArray(products) ? products.map(mapBackendProduct) : [],
    quotations: Array.isArray(quotations) ? quotations.map(mapBackendQuotation) : [],
    orders: Array.isArray(orders) ? orders.map(mapBackendOrder) : [],
    leads: Array.isArray(leads) ? leads.map(mapBackendLead) : [],
    followups: Array.isArray(followups) ? followups.map(mapBackendFollowUp) : [],
    dispatches: Array.isArray(dispatchBundle?.dispatches) ? dispatchBundle.dispatches.map(mapBackendDispatch) : [],
    returns: Array.isArray(dispatchBundle?.returns) ? dispatchBundle.returns.map(mapBackendReturn) : [],
    invoices: Array.isArray(invoices) ? invoices.map(mapBackendInvoice) : [],
    payments: Array.isArray(payments) ? payments.map(mapBackendPayment) : [],
    expenses: Array.isArray(expenses?.claims) ? expenses.claims : [],
    attendance,
    opportunities,
  };
}
