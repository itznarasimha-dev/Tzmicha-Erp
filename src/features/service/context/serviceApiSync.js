import { getAuthToken } from '../../../api/client';
import { serviceApi } from '../../../api/service';
import { salesApi } from '../../../api/sales';
import { useErpStore } from '../../../store/useErpStore';

/**
 * Executes a Service/Finance/Operations API request when authenticated.
 * Surfaces real server/PostgreSQL errors directly via global apiError banner
 * and never silently pretends failed backend persistence succeeded.
 */
export async function persistServiceAction(apiCall, contextLabel = 'Service operation', hooks = {}) {
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
    const message =
      err instanceof Error ? err.message : `${contextLabel} could not be persisted to PostgreSQL.`;
    useErpStore.getState().setApiError(`${contextLabel}: ${message}`);
    return { ok: false, error: message };
  }
}

export function mapBackendServiceRequest(r) {
  const activeAssignment = Array.isArray(r.assignments) ? r.assignments[0] : null;
  return {
    id: r.id,
    requestNo: r.requestNumber || r.id,
    customerId: r.partyId,
    customerName: r.party?.businessName || r.party?.name || 'Customer',
    contactPerson: r.party?.contactPerson || r.party?.name || '',
    contactNumber: r.party?.phone || '',
    email: r.party?.email || '',
    serviceLocation: r.deliveryAddress || r.party?.billingAddress || '',
    serviceCategory: r.category || 'Breakdown Repair',
    serviceType: r.isRepeatComplaint ? 'Repeat Complaint' : 'Standard Service',
    acceptanceStatus:
      r.triageStatus === 'accepted'
        ? 'Accepted / Ready for Assignment'
        : r.triageStatus === 'rejected'
        ? 'Rejected'
        : 'New / Awaiting Review',
    isRepeatComplaint: Boolean(r.isRepeatComplaint),
    previousServiceRequestId: r.parentRequestId || null,
    productId: r.productId || '',
    productName: r.product?.name || r.equipment?.productName || 'Equipment',
    serialNumber: r.serialNumber || r.equipment?.serialNumber || '',
    orderNo: r.salesOrder?.orderNumber || '',
    warrantyStatus: r.warrantyCoverageStatus || r.warrantyStatus || 'Out of Warranty',
    amcStatus: r.amcStatus || 'None',
    issueType: r.category || 'Operational Fault',
    issueDescription: r.issueDescription || '',
    priority: r.priority || 'Medium',
    requestDate: r.createdAt ? String(r.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
    preferredDate: r.createdAt ? String(r.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
    assignedEngineerId: activeAssignment?.engineerId || null,
    assignedEngineerName: activeAssignment?.engineer?.name || 'Unassigned',
    supportingEmployeeId: null,
    supportingEmployeeName: null,
    status: r.status || 'Unassigned',
    escalations: Array.isArray(r.escalations) ? r.escalations : [],
    warrantyExemptions: Array.isArray(r.warrantyExemptions) ? r.warrantyExemptions : [],
    remarks: '',
  };
}

export function mapBackendAssignment(a) {
  return {
    id: a.id,
    serviceRequestId: a.serviceRequestId,
    customerId: a.serviceRequest?.partyId || '',
    customerName: a.serviceRequest?.party?.businessName || a.serviceRequest?.party?.name || 'Customer',
    serviceCategory: a.serviceRequest?.category || 'Field Service',
    productName: a.serviceRequest?.product?.name || 'Equipment',
    issueDescription: a.serviceRequest?.issueDescription || '',
    priority: a.serviceRequest?.priority || 'Medium',
    assignedEngineerId: a.engineerId,
    assignedEngineerName: a.engineer?.name || 'Engineer',
    supportingEmployeeId: null,
    supportingEmployeeName: null,
    scheduledDate: a.scheduledDate ? String(a.scheduledDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
    startTime: a.startTime || '10:00 AM',
    expectedEndTime: a.expectedEndTime || '02:00 PM',
    workInstructions: a.notes || '',
    status: a.status || 'Assigned',
  };
}

export function mapBackendSchedule(s) {
  const isPreventive = Boolean(s.preventiveCoverageId || s.scheduleType === 'Preventive Maintenance');
  return {
    id: s.id,
    assignmentId: s.assignmentId || null,
    serviceRequestId:
      s.assignment?.serviceRequestId ||
      (isPreventive ? `${String(s.preventiveCoverageType || 'AMC').toUpperCase()}-PREV-${s.scheduleNumber || s.id}` : ''),
    customerId: s.assignment?.serviceRequest?.partyId || s.partyId || '',
    customerName:
      s.assignment?.serviceRequest?.party?.businessName ||
      s.assignment?.serviceRequest?.party?.name ||
      (isPreventive ? 'Preventive Maintenance Visit' : 'Customer'),
    customerLocation: s.assignment?.serviceRequest?.deliveryAddress || '',
    assignedEngineerId: s.engineerId,
    assignedEngineerName: s.engineer?.name || 'Engineer',
    supportingEmployeeId: null,
    supportingEmployeeName: null,
    serviceCategory: s.scheduleType || s.assignment?.serviceRequest?.category || 'Field Service',
    purpose: s.notes || s.assignment?.serviceRequest?.issueDescription || 'Scheduled field service visit',
    scheduledDate: s.scheduledDate ? String(s.scheduledDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
    startTime: s.startTime || '10:00 AM',
    expectedEndTime: s.expectedEndTime || '02:00 PM',
    priority: s.assignment?.serviceRequest?.priority || 'Medium',
    status: s.status || 'Scheduled',
    progress: s.status === 'Completed' ? 100 : s.status === 'In Progress' ? 50 : 0,
  };
}

export function mapBackendSparePart(sp) {
  const availableQty = Number(sp.availableQty ?? 0);
  const minThreshold = Number(sp.minStockLevel ?? 5);
  return {
    id: sp.id,
    code: sp.partCode || sp.id,
    name: sp.name,
    specification: sp.specification || '',
    category: sp.category || 'Spare Parts',
    compatibleProductId: sp.compatibleProductId || '',
    compatibleProductName: sp.compatibleProduct?.name || '',
    uom: sp.unit || 'Pcs',
    availableQty,
    reservedQty: Number(sp.reservedQty ?? 0),
    usedQty: Number(sp.consumedQty ?? 0),
    unitPrice: Number(sp.unitPrice ?? 0),
    minThreshold,
    status: availableQty === 0 ? 'Out of Stock' : availableQty <= minThreshold ? 'Low Stock' : 'In Stock',
    location: sp.binLocation || 'Central Store',
  };
}

export function mapBackendRequisition(req) {
  const rawStatus = String(req.status || 'Pending Manager Approval');
  const norm = rawStatus.toLowerCase();
  let approvalStatus = 'Pending Manager Approval';
  let issueStatus = 'Pending Review';
  let collectionStatus = 'Pending';

  if (norm === 'approved - ready to issue' || norm === 'approved') {
    approvalStatus = 'Pending Store Manager Approval';
    issueStatus = 'Approved - Ready to Issue';
  } else if (norm === 'issued from store' || norm === 'issued') {
    approvalStatus = 'Issued';
    issueStatus = 'Issued from Store';
  } else if (norm === 'collected by engineer' || norm === 'collected') {
    approvalStatus = 'Issued';
    issueStatus = 'Issued from Store';
    collectionStatus = 'Collected';
  } else if (norm === 'consumed on site' || norm === 'consumed') {
    approvalStatus = 'Issued';
    issueStatus = 'Issued from Store';
    collectionStatus = 'Consumed';
  } else if (norm === 'rejected') {
    approvalStatus = 'Rejected';
    issueStatus = 'Cancelled';
  }

  return {
    id: req.id,
    requisitionNo: req.requisitionNumber || req.requisitionNo || req.id,
    serviceRequestId: req.serviceRequestId || '',
    partId: req.sparePartId || '',
    partCode: req.sparePart?.partCode || req.sparePartId || '',
    partName: req.sparePart?.name || 'Spare Part',
    specification: req.sparePart?.specification || '',
    requestedQty: Number(req.requestedQty ?? 1),
    approvedQty: Number(req.approvedQty ?? req.requestedQty ?? 0),
    issuedQty: Number(req.issuedQty ?? 0),
    consumedQty: Number(req.consumedQty ?? 0),
    returnedQty: Number(req.returnedQty ?? 0),
    requestedBy: req.requestedBy?.name || 'Technician',
    customerId: req.serviceRequest?.partyId || '',
    customerName: req.serviceRequest?.party?.businessName || req.serviceRequest?.party?.name || 'Customer',
    approvalStatus,
    issueStatus,
    collectionStatus,
    remarks: req.remarks || '',
    createdAt: req.createdAt ? String(req.createdAt).slice(0, 10) : '',
  };
}

export function mapBackendWarranty(w) {
  const totalVisits = Number(w.totalVisitsAllowed ?? 4);
  const completed = Number(w.visitsUsed ?? w.visitsCompleted ?? 0);
  return {
    id: w.id,
    customerId: w.partyId || '',
    customerName: w.party?.businessName || w.party?.name || 'Customer',
    contactNumber: w.party?.phone || '',
    productId: w.productId || '',
    productName: w.product?.name || 'Equipment',
    serialNumber: w.serialNumber || '',
    invoiceNumber: w.salesOrder?.orderNumber || w.serialNumber || w.warrantyNumber || '',
    warrantyStartDate: w.startDate ? String(w.startDate).slice(0, 10) : '',
    warrantyEndDate: w.endDate ? String(w.endDate).slice(0, 10) : '',
    coverageType: w.coverageType || 'Standard Manufacturer Warranty',
    visitsCompleted: completed,
    visitsUsed: completed,
    remainingVisits: Math.max(0, totalVisits - completed),
    warrantyStatus: w.status || 'Active',
  };
}

export function mapBackendAmc(a) {
  const totalVisits = Number(a.totalVisitsAllowed ?? 4);
  const completed = Number(a.visitsUsed ?? a.visitsCompleted ?? 0);
  return {
    id: a.id,
    customerId: a.partyId || '',
    customerName: a.party?.businessName || a.party?.name || 'Customer',
    contactNumber: a.party?.phone || '',
    productId: a.productId || '',
    productName: a.product?.name || 'Equipment',
    contractNumber: a.contractNumber || a.contractNo || a.id,
    contractStartDate: a.startDate ? String(a.startDate).slice(0, 10) : '',
    contractEndDate: a.endDate ? String(a.endDate).slice(0, 10) : '',
    visitsIncluded: totalVisits,
    visitsUsed: completed,
    visitsCompleted: completed,
    remainingVisits: Math.max(0, totalVisits - completed),
    amcValue: Number(a.contractValue ?? 0),
    amcStatus: a.status || 'Active',
    amcType: a.planTier || 'Comprehensive AMC',
  };
}

export function mapBackendProposal(p) {
  let status = 'Pending Manager Approval';
  if (p.serviceManagerStatus === 'rejected') {
    status = 'Rejected by Manager';
  } else if (p.serviceManagerStatus === 'approved') {
    if (p.storeManagerStatus === 'approved') status = 'Approved';
    else if (p.storeManagerStatus === 'rejected') status = 'Rejected by Store Manager';
    else status = 'Pending Store Manager Approval';
  }
  return {
    id: p.id,
    proposalNo: p.proposalNumber || p.id,
    category: p.category || 'General Components',
    partCode: p.partNumber || p.proposalNumber || p.id,
    partName: p.partName,
    specification: p.specification || '',
    uom: p.unit || 'Nos',
    unitPrice: Number(p.estimatedPrice ?? 0),
    initialQty: Number(p.initialQty ?? 0),
    reason: p.justification || '',
    proposedBy: p.proposedBy?.name || 'Technician',
    proposedDate: p.createdAt ? String(p.createdAt).slice(0, 10) : '',
    status,
    rejectionReason: p.rejectionReason || null,
    createdSparePartId: p.createdSparePartId || null,
  };
}

export function mapBackendServiceBill(inv) {
  const totalAmount = Number(inv.totalAmount ?? 0);
  const amountPaid = Number(inv.paidAmount ?? 0);
  const rawApprovalStatus = String(inv.approvalStatus || inv.status || '').toLowerCase();
  const approvalStatus =
    rawApprovalStatus === 'pending_service_approval'
      ? 'Pending Service Approval'
      : rawApprovalStatus === 'pending_finance' || rawApprovalStatus === 'pending_approval'
      ? 'Pending Finance Approval'
      : rawApprovalStatus === 'rejected'
      ? 'Rejected'
      : 'Approved';

  const lines = Array.isArray(inv.lines) ? inv.lines : [];
  let partsCharges = 0;
  let labourCharges = 0;
  let additionalCharges = 0;
  let serviceCharges = 0;
  for (const line of lines) {
    const qty = Number(line.quantity ?? 1);
    const price = Number(line.unitPrice ?? 0);
    const lineAmount = Number(line.lineSubtotal ?? line.taxableAmount ?? qty * price);
    const itemType = String(line.itemType || '').toLowerCase();
    const desc = String(line.description || '').toLowerCase();
    if (itemType === 'spare_part') {
      partsCharges += lineAmount;
    } else if (itemType === 'fee' || itemType === 'additional') {
      additionalCharges += lineAmount;
    } else if (
      itemType === 'labor' ||
      itemType === 'labour' ||
      desc.includes('labour') ||
      desc.includes('labor')
    ) {
      labourCharges += lineAmount;
    } else {
      serviceCharges += lineAmount;
    }
  }
  const subtotalFromInv = Number(inv.subtotal ?? Math.max(0, totalAmount - Number(inv.totalTax ?? 0)));
  if (lines.length === 0 && subtotalFromInv > 0) {
    serviceCharges = subtotalFromInv;
  }
  const taxAmount = Number(inv.totalTax ?? Math.max(0, totalAmount - subtotalFromInv));

  return {
    id: inv.id,
    serviceInvoiceNo: inv.invoiceNumber || inv.invoiceNo || inv.id,
    serviceRequestId: inv.serviceRequestId || '',
    serviceApprovedById: inv.serviceApprovedById || null,
    serviceApproved: Boolean(inv.serviceApprovedById),
    customerId: inv.partyId || '',
    customerName: inv.party?.businessName || inv.party?.name || 'Customer',
    invoiceDate: inv.issueDate
      ? String(inv.issueDate).slice(0, 10)
      : inv.createdAt
      ? String(inv.createdAt).slice(0, 10)
      : '',
    dueDate: inv.dueDate ? String(inv.dueDate).slice(0, 10) : '',
    serviceCharges,
    labourCharges,
    partsCharges,
    additionalCharges,
    discount: Number(inv.discountAmount ?? inv.totalDiscount ?? 0),
    taxRate: 18,
    taxAmount,
    totalAmount,
    amountPaid,
    balance: Math.max(0, Number(inv.outstandingBalance ?? totalAmount - amountPaid)),
    approvalStatus,
    paymentStatus: inv.paymentStatus === 'paid' ? 'Paid' : inv.paymentStatus === 'partially_paid' ? 'Partially Paid' : 'Pending',
    notes: inv.notes || '',
  };
}

export function mapBackendServiceHistory(h) {
  return {
    id: h.entryNumber || h.id,
    rawId: h.id,
    serviceRequestId: h.serviceRequestId || '',
    customerId: h.partyId || '',
    customerName: h.party?.businessName || h.party?.name || 'Customer',
    productName: h.serviceRequest?.product?.name || h.eventType || 'Service Intervention',
    assignedEngineerName: h.actorUser?.name || 'Service Team',
    issueCategory: h.eventType || 'Service Log',
    resolutionSummary: h.summary || '',
    occurredAt: h.occurredAt ? String(h.occurredAt).slice(0, 10) : '',
    totalDurationHours: 0,
    customerRating: 5,
  };
}

export async function fetchServiceBootstrapData() {
  if (!getAuthToken() && !useErpStore.getState().isAuthenticated) return null;
  const [overview, customers, products] = await Promise.all([
    serviceApi.getOverview(),
    salesApi.listCustomers().catch(() => []),
    salesApi.listProducts().catch(() => []),
  ]);

  return {
    serviceRequests: (overview?.requests || []).map(mapBackendServiceRequest),
    assignments: (overview?.assignments || []).map(mapBackendAssignment),
    schedules: (overview?.schedules || []).map(mapBackendSchedule),
    spareParts: (overview?.spareParts || []).map(mapBackendSparePart),
    sparePartRequests: (overview?.requisitions || []).map(mapBackendRequisition),
    inventoryProposals: (overview?.proposals || []).map(mapBackendProposal),
    warrantyRecords: (overview?.warranties || []).map(mapBackendWarranty),
    amcRecords: (overview?.amcContracts || []).map(mapBackendAmc),
    serviceBilling: (overview?.serviceBilling || []).map(mapBackendServiceBill),
    escalations: overview?.escalations || [],
    warrantyExemptions: overview?.exemptions || [],
    serviceHistory: (overview?.history || []).map(mapBackendServiceHistory),
    customers: Array.isArray(customers) ? customers : [],
    products: Array.isArray(products) ? products : [],
  };
}
