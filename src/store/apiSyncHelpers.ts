import {
  AuditLog,
  Batch,
  Customer,
  ExpenseClaim,
  Invoice,
  LeaveRequest,
  Organization,
  PLAN_TIERS,
  Product,
  Quotation,
  SalesOrder,
  SalesRemittanceEntry,
  SubscriptionPlan,
  User,
  UserRole,
} from '../types';

export function mapStoreUserToRoleCode(
  user: Partial<Pick<User, 'role' | 'salesSubRole' | 'serviceSubRole' | 'marketingSubRole'>>
): string {
  switch (user.role) {
    case 'admin':
      return 'admin';
    case 'manager':
      return 'manager';
    case 'finance':
      return 'finance';
    case 'store_manager':
      return 'store_manager';
    case 'hr':
      return 'hr';
    case 'marketing':
      return 'marketing_manager';
    case 'sales':
      if (user.salesSubRole === 'sales_manager') return 'sales_manager';
      if (user.salesSubRole === 'sales_coordinator') return 'sales_coordinator';
      if (user.salesSubRole === 'junior_sales') return 'junior_sales';
      return 'sales_rep';
    case 'service':
      if (user.serviceSubRole === 'coordinator') return 'service_coordinator';
      if (user.serviceSubRole === 'engineer') return 'service_engineer';
      if (user.serviceSubRole === 'employee') return 'service_employee';
      return 'service_manager';
    default:
      return 'sales_rep';
  }
}

export function mapApiUserToStoreUser(raw: Record<string, any>): User {
  const baseRole = (raw.role || raw.baseRole || 'sales') as UserRole;
  return {
    id: String(raw.id),
    name: String(raw.name || raw.email || 'User'),
    email: String(raw.email || ''),
    role: baseRole,
    salesSubRole: raw.salesSubRole || undefined,
    serviceSubRole: raw.serviceSubRole || undefined,
    marketingSubRole: raw.marketingSubRole || undefined,
    employeeId: raw.employeeCode || raw.employeeId || String(raw.id),
    department: raw.department || raw.departmentName || baseRole.toUpperCase(),
    designation: raw.designation || raw.roleName || baseRole,
    status: (raw.status || 'active') as User['status'],
    avatar:
      raw.avatar ||
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    phone: raw.phone || '+91 98000 00000',
    assignedRegionId: String(raw.assignedRegionId || (raw.allRegions ? 'all' : 'all')),
    maxDiscountPercent: Number(raw.maxDiscountPercent ?? 5),
    monthlySalesTarget: raw.monthlySalesTarget ? Number(raw.monthlySalesTarget) : undefined,
    monthlyVisitTarget: raw.monthlyVisitTarget ? Number(raw.monthlyVisitTarget) : undefined,
    walletBalance: Number(raw.walletBalance ?? 0),
    teamId: raw.teamId || raw.organization?.teamId,
    organizationId: raw.orgId || raw.organizationId || raw.organization?.id,
  };
}

export function mapApiOrgToStoreOrg(raw: Record<string, any>): Organization {
  const planRaw = String(raw.planCode || raw.plan || 'Enterprise');
  const plan: SubscriptionPlan =
    planRaw.toLowerCase().includes('std') || planRaw.toLowerCase() === 'standard'
      ? 'Standard'
      : planRaw.toLowerCase().includes('pro') || planRaw.toLowerCase() === 'professional'
      ? 'Professional'
      : 'Enterprise';
  const limits = PLAN_TIERS[plan] || PLAN_TIERS.Enterprise;
  return {
    id: String(raw.id || 'org-apex'),
    teamId: String(raw.teamId || 'APEX-2026'),
    name: String(raw.name || 'Enterprise Workspace'),
    legalName: raw.legalName || undefined,
    taxGstNumber: raw.taxGstNumber || undefined,
    industry: raw.industry || undefined,
    currency: raw.currency || 'INR (₹)',
    plan,
    maxEmployees: Number(raw.maxEmployees ?? limits.maxEmployees),
    maxRegions: Number(raw.maxRegions ?? limits.maxRegions),
    maxWarehouses: Number(raw.maxWarehouses ?? limits.maxWarehouses),
    registeredAt: raw.createdAt ? String(raw.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
    memberCount: Number(raw.memberCount ?? 1),
    adminEmail: raw.adminEmail || undefined,
    adminName: raw.adminName || undefined,
  };
}

export function syncSubModuleRoleStorage(user: User): void {
  if (typeof window === 'undefined') return;
  try {
    if (user.role === 'marketing') {
      const targetRoleId =
        user.marketingSubRole === 'marketing_manager'
          ? 'manager'
          : user.marketingSubRole === 'marketing_senior'
          ? 'senior'
          : 'junior';
      localStorage.setItem('tzmicha_erp_demo_role', targetRoleId);
      localStorage.setItem('totallyerp_demo_role', targetRoleId);
    }
    if (user.role === 'service') {
      const targetServiceRole = user.serviceSubRole || 'manager';
      localStorage.setItem('apexerp_service_active_role', targetServiceRole);
    }
  } catch {
    /* ignore storage errors */
  }
}

export function mapApiCustomerToStore(raw: Record<string, any>): Customer {
  return {
    id: String(raw.id),
    code: raw.code || undefined,
    name: String(raw.name || raw.businessName || ''),
    businessName: String(raw.businessName || raw.name || ''),
    type: (raw.partyType || raw.type || 'dealer') as Customer['type'],
    regionId: String(raw.regionId || 'reg-north'),
    assignedSalesUserId: raw.assignedSalesUserId || undefined,
    assignedMarketingUserId: raw.assignedMarketingUserId || undefined,
    contactPerson: raw.contactPerson || raw.name || undefined,
    phone: String(raw.phone || ''),
    email: String(raw.email || ''),
    address: String(raw.billingAddress || raw.address || ''),
    billingAddress: raw.billingAddress || undefined,
    shippingAddress: raw.shippingAddress || undefined,
    gstin: raw.gstin || undefined,
    paymentTerms: raw.paymentTerms || 'Net 30',
    creditLimit: Number(raw.creditLimit ?? 0),
    currentOutstanding: Number(raw.currentOutstanding ?? 0),
    onboardingDate: raw.createdAt ? String(raw.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
    status: (raw.status || 'active') as Customer['status'],
    totalCompletedOrders: raw.totalCompletedOrders ? Number(raw.totalCompletedOrders) : undefined,
    totalLifetimeRevenue: raw.totalLifetimeRevenue ? Number(raw.totalLifetimeRevenue) : undefined,
  };
}

export function mapApiProductToStore(raw: Record<string, any>): Product {
  const stdPrice =
    raw.standardSellingPrice ??
    raw.prices?.find?.((p: any) => p.priceList === 'standard')?.amount ??
    raw.prices?.[0]?.amount ??
    0;
  const minPrice =
    raw.minAllowedPrice ??
    raw.prices?.find?.((p: any) => p.priceList === 'floor')?.amount ??
    stdPrice;
  return {
    id: String(raw.id),
    sku: String(raw.sku || ''),
    name: String(raw.name || ''),
    categoryId: String(raw.categoryId || raw.category?.id || 'cat-1'),
    categoryName: String(raw.category?.name || raw.categoryName || 'General'),
    unit: String(raw.uom?.code || raw.unit || 'Unit'),
    description: String(raw.description || ''),
    minOrderQuantity: Number(raw.minOrderQuantity ?? 1),
    lowStockThreshold: Number(raw.lowStockThreshold ?? 10),
    actualCost: Number(raw.actualCost ?? stdPrice * 0.7),
    standardSellingPrice: Number(stdPrice),
    minAllowedPrice: Number(minPrice),
    defaultMaxDiscountPercent: Number(raw.defaultMaxDiscountPercent ?? 10),
    hsnCode: String(raw.hsnCode || ''),
    taxRatePercent: Number(raw.taxRatePercent ?? 18),
  };
}

export function mapApiBatchToStore(raw: Record<string, any>): Batch {
  const available = Number(raw.availableQuantity ?? raw.qtyOnHand ?? 0);
  const reserved = Number(raw.reservedQuantity ?? raw.qtyReserved ?? 0);
  const dispatched = Number(raw.dispatchedQuantity ?? 0);
  return {
    id: String(raw.id),
    batchNumber: String(raw.batchNo || raw.batchNumber || raw.id),
    productId: String(raw.productId),
    productSku: String(raw.product?.sku || raw.productSku || ''),
    productName: String(raw.product?.name || raw.productName || ''),
    regionId: String(raw.warehouse?.regionId || raw.regionId || 'reg-north'),
    warehouseId: String(raw.warehouseId || ''),
    locationId: String(raw.locationId || 'loc-1'),
    initialQuantity: Number(raw.initialQuantity ?? available + reserved + dispatched),
    availableQuantity: available,
    reservedQuantity: reserved,
    dispatchedQuantity: dispatched,
    manufacturingDate: raw.manufacturedAt ? String(raw.manufacturedAt).split('T')[0] : '',
    expiryDate: raw.expiryDate ? String(raw.expiryDate).split('T')[0] : '',
    actualUnitCost: Number(raw.unitCost ?? raw.actualUnitCost ?? 0),
    status: (raw.status || (available > 0 ? 'active' : 'exhausted')) as Batch['status'],
  };
}

export function mapApiSalesOrderToStore(raw: Record<string, any>): SalesOrder {
  const lines = Array.isArray(raw.lines) ? raw.lines : Array.isArray(raw.items) ? raw.items : [];
  return {
    id: String(raw.id),
    orderNumber: String(raw.orderNumber || raw.id),
    createdAt: raw.createdAt || raw.orderDate || new Date().toISOString(),
    customerId: String(raw.partyId || raw.customerId || ''),
    customerName: String(raw.party?.businessName || raw.party?.name || raw.customerName || 'Customer'),
    customerType: String(raw.party?.partyType || raw.customerType || 'dealer'),
    regionId: String(raw.regionId || raw.party?.regionId || 'reg-north'),
    salesUserId: String(raw.salesUserId || ''),
    salesUserName: String(raw.salesUser?.name || raw.salesUserName || 'Sales Executive'),
    items: lines.map((l: any) => ({
      productId: String(l.productId),
      productSku: String(l.product?.sku || l.productSku || ''),
      productName: String(l.product?.name || l.productName || ''),
      unit: String(l.unit || 'Unit'),
      quantity: Number(l.quantity ?? 0),
      standardPrice: Number(l.standardPrice ?? l.unitPrice ?? 0),
      discountPercent: Number(l.discountPercent ?? 0),
      quotedUnitPrice: Number(l.unitPrice ?? l.quotedUnitPrice ?? 0),
      totalAmount: Number(l.totalAmount ?? l.netAmount ?? 0),
      taxAmount: Number(l.taxAmount ?? 0),
      netAmount: Number(l.netAmount ?? 0),
      allocations: Array.isArray(l.allocations) ? l.allocations : [],
    })),
    subtotal: Number(raw.subtotal ?? 0),
    totalDiscount: Number(raw.totalDiscount ?? 0),
    totalTax: Number(raw.totalTax ?? 0),
    totalAmount: Number(raw.totalAmount ?? 0),
    status: String(raw.status || 'pending_discount_approval') as SalesOrder['status'],
    requiresDiscountApproval: Boolean(raw.requiresDiscountApproval),
    discountApprovalStatus: (raw.discountApprovalStatus || 'not_required') as SalesOrder['discountApprovalStatus'],
    discountApprovalReason: raw.discountApprovalReason || undefined,
    discountApprovedBy: raw.discountApprovedBy || undefined,
    discountApprovedAt: raw.discountApprovedAt || undefined,
    paymentStatus: (raw.paymentStatus || 'unpaid') as SalesOrder['paymentStatus'],
    amountPaid: Number(raw.amountPaid ?? 0),
    warehouseId: raw.warehouseId || undefined,
    notes: raw.notes || '',
  };
}

export function mapApiQuotationToStore(raw: Record<string, any>): Quotation {
  const lines = Array.isArray(raw.lines) ? raw.lines : Array.isArray(raw.items) ? raw.items : [];
  return {
    id: String(raw.id),
    quotationNo: String(raw.quotationNo || raw.id),
    senderName: String(raw.party?.contactPerson || raw.salesUser?.name || raw.senderName || 'Sales Inquiry'),
    senderCompany: String(raw.party?.businessName || raw.party?.name || raw.senderCompany || ''),
    senderEmail: raw.party?.email || raw.senderEmail || undefined,
    senderPhone: raw.party?.phone || raw.senderPhone || undefined,
    customerId: String(raw.partyId || raw.customerId || ''),
    customerName: String(raw.party?.businessName || raw.party?.name || raw.customerName || ''),
    regionId: String(raw.regionId || 'reg-north'),
    assignedSalesUserId: raw.salesUserId ? String(raw.salesUserId) : undefined,
    assignedSalesUserName: raw.salesUser?.name || raw.salesUserName || undefined,
    createdDate: raw.createdAt ? String(raw.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
    validUntil: raw.validUntil ? String(raw.validUntil).split('T')[0] : '',
    status: String(raw.status || 'Draft') as Quotation['status'],
    priority: (raw.priority || 'Normal') as Quotation['priority'],
    items: lines.map((l: any) => ({
      productId: String(l.productId),
      productName: String(l.product?.name || l.productName || ''),
      qty: Number(l.quantity ?? l.qty ?? 1),
      unitPrice: Number(l.unitPrice ?? 0),
      discountPercent: Number(l.discountPercent ?? 0),
      taxRate: Number(l.taxRatePercent ?? l.taxRate ?? 18),
      lineTotal: Number(l.netAmount ?? l.lineTotal ?? 0),
    })),
    subtotal: Number(raw.subtotal ?? 0),
    discountTotal: Number(raw.totalDiscount ?? raw.discountTotal ?? 0),
    taxTotal: Number(raw.totalTax ?? raw.taxTotal ?? 0),
    grandTotal: Number(raw.totalAmount ?? raw.grandTotal ?? 0),
    notes: raw.notes || undefined,
  };
}

export function mapApiInvoiceToStore(raw: Record<string, any>): Invoice {
  const lines = Array.isArray(raw.lines) ? raw.lines : Array.isArray(raw.items) ? raw.items : [];
  const totalAmount = Number(raw.totalAmount ?? 0);
  const paidAmount = Number(raw.paidAmount ?? raw.amountPaid ?? 0);
  const outstandingBalance = Number(
    raw.outstandingBalance ?? raw.balanceDue ?? Math.max(0, totalAmount - paidAmount)
  );
  const mappedStatus: Invoice['status'] =
    raw.approvalStatus === 'pending_service_approval'
      ? 'pending_service_approval'
      : raw.approvalStatus === 'pending_finance'
      ? 'pending_approval'
      : raw.approvalStatus === 'rejected'
      ? 'rejected'
      : (String(raw.status || 'issued') as Invoice['status']);

  const mappedSource: Invoice['source'] =
    raw.source === 'admin_manual'
      ? 'admin_manual'
      : raw.source === 'service_billing'
      ? 'service_billing'
      : 'sales_order_payment';

  return {
    id: String(raw.id),
    invoiceNumber: String(raw.invoiceNumber || raw.invoiceNo || raw.id),
    customerId: String(raw.partyId || raw.customerId || ''),
    customerName: String(raw.party?.businessName || raw.party?.name || raw.customerName || ''),
    customerCode: raw.party?.code || raw.customerCode || undefined,
    customerEmail: raw.party?.email || raw.customerEmail || undefined,
    customerPhone: raw.party?.phone || raw.customerPhone || undefined,
    customerGstin: raw.party?.gstin || raw.customerGstin || undefined,
    customerAddress: raw.party?.billingAddress || raw.customerAddress || undefined,
    orderId: raw.salesOrderId || raw.linkedOrderId || undefined,
    orderNumber: raw.salesOrder?.orderNumber || raw.orderNumber || undefined,
    serviceRequestId: raw.serviceRequestId || undefined,
    serviceApprovedById: raw.serviceApprovedById || undefined,
    approvalStatus: raw.approvalStatus || undefined,
    regionId: String(raw.regionId || 'reg-north'),
    regionName: raw.region?.name || raw.regionName || undefined,
    invoiceDate: raw.issueDate ? String(raw.issueDate).split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: raw.dueDate ? String(raw.dueDate).split('T')[0] : '',
    items: lines.map((l: any) => ({
      id: String(l.id || `${l.productId || 'item'}`),
      productId: String(l.productId || l.id || 'item'),
      productSku: String(l.productSku || l.sku || l.itemType || 'ITEM'),
      productName: String(l.description || l.productName || 'Item'),
      quantity: Number(l.quantity ?? 1),
      unit: String(l.unit || 'Unit'),
      unitPrice: Number(l.unitPrice ?? 0),
      discountPercent: Number(l.discountPercent ?? 0),
      discountAmount: Number(l.discountAmount ?? 0),
      taxRatePercent: Number(l.taxRatePercent ?? 18),
      taxAmount: Number(l.taxAmount ?? 0),
      netAmount: Number(l.netAmount ?? l.totalAmount ?? 0),
    })),
    subtotal: Number(raw.subtotal ?? 0),
    totalDiscount: Number(raw.totalDiscount ?? 0),
    totalTax: Number(raw.totalTax ?? raw.taxAmount ?? 0),
    totalAmount,
    paidAmount,
    outstandingBalance,
    status: mappedStatus,
    paymentStatus: String(raw.paymentStatus || 'unpaid') as Invoice['paymentStatus'],
    source: mappedSource,
    createdByUserId: String(raw.createdById || raw.createdByUserId || ''),
    createdByUserName: String(raw.createdByUserName || raw.createdByUser?.name || 'System'),
    createdByUserRole: (raw.createdByUserRole || 'admin') as UserRole,
    notes: raw.notes || undefined,
  };
}

export function mapApiLeaveToStore(raw: Record<string, any>): LeaveRequest {
  return {
    id: String(raw.id),
    userId: String(raw.userId || ''),
    employeeId: String(raw.user?.employeeCode || raw.employeeCode || ''),
    employeeName: String(raw.user?.name || raw.employeeName || 'Employee'),
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    roleTitle: String(raw.user?.designation || raw.roleTitle || 'Staff'),
    department: String(raw.user?.departmentName || raw.department || 'Operations'),
    leaveType: (raw.leaveType || 'casual') as LeaveRequest['leaveType'],
    startDate: raw.startDate ? String(raw.startDate).split('T')[0] : '',
    endDate: raw.endDate ? String(raw.endDate).split('T')[0] : '',
    durationDays: Number(raw.daysCount ?? raw.durationDays ?? 1),
    reason: String(raw.reason || ''),
    submittedAt: raw.createdAt ? String(raw.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
    status: (raw.status || 'pending') as LeaveRequest['status'],
    decision:
      raw.status && raw.status !== 'pending'
        ? {
            decidedBy: String(raw.decidedByName || 'Manager'),
            decidedAt: raw.decidedAt ? String(raw.decidedAt) : '',
            status: raw.status === 'rejected' ? 'rejected' : 'approved',
            comment: raw.decisionNote || undefined,
          }
        : undefined,
  };
}

function normalizeExpenseStatus(rawStatus: unknown): ExpenseClaim['status'] {
  const value = typeof rawStatus === 'string' ? rawStatus.trim().toLowerCase() : '';
  if (value === 'pending' || value === 'submitted') return 'submitted';
  if (value === 'draft' || value === 'approved' || value === 'rejected' || value === 'paid') {
    return value;
  }
  return 'submitted';
}

export function mapApiExpenseToStore(raw: Record<string, any>): ExpenseClaim {
  return {
    id: String(raw.id),
    claimNumber: String(raw.claimNo || raw.claimNumber || raw.id),
    userId: String(raw.userId || ''),
    userName: String(raw.user?.name || raw.userName || 'Employee'),
    userRole: String(raw.userRole || 'sales') as UserRole,
    regionId: String(raw.regionId || 'reg-north'),
    date: raw.expenseDate ? String(raw.expenseDate).split('T')[0] : new Date().toISOString().split('T')[0],
    category: (raw.category || 'travel') as ExpenseClaim['category'],
    amount: Number(raw.amount ?? 0),
    description: String(raw.description || ''),
    status: normalizeExpenseStatus(raw.status),
    submittedAt: raw.createdAt || raw.submittedAt || undefined,
    rejectionReason: raw.rejectionReason || undefined,
    paidAt: raw.paidAt || undefined,
  };
}

export function mapApiAuditLogToStore(raw: Record<string, any>): AuditLog {
  return {
    id: String(raw.id),
    timestamp: raw.createdAt || raw.timestamp || new Date().toISOString(),
    userId: String(raw.actorUserId || raw.userId || ''),
    userName: String(raw.actorName || raw.userName || 'System'),
    userRole: String(raw.actorRole || raw.userRole || 'admin') as UserRole,
    action: String(raw.action || ''),
    entityType: String(raw.entityType || 'system'),
    entityId: String(raw.entityId || ''),
    details: String(raw.summary || raw.details || ''),
    regionId: raw.regionId || undefined,
  };
}

export function mapApiPaymentToStore(raw: Record<string, any>): SalesRemittanceEntry {
  const rawMode = String(raw.mode || 'neft_rtgs').toLowerCase();
  const paymentMode: SalesRemittanceEntry['paymentMode'] = rawMode.includes('cash')
    ? 'cash'
    : rawMode.includes('cheque')
    ? 'cheque'
    : rawMode.includes('upi')
    ? 'upi'
    : 'neft_rtgs';

  const rawStatus = String(raw.status || 'pending_verification').toLowerCase();
  const status: SalesRemittanceEntry['status'] =
    rawStatus === 'verified'
      ? 'verified'
      : rawStatus === 'discrepancy' || rawStatus === 'flagged' || rawStatus === 'discrepancy_flagged'
      ? 'discrepancy'
      : 'pending_verification';

  return {
    id: String(raw.id),
    entryNumber: String(raw.paymentNumber || raw.paymentNo || raw.id),
    date: raw.paymentDate ? String(raw.paymentDate).split('T')[0] : new Date().toISOString().split('T')[0],
    salesUserId: String(raw.recordedById || raw.recordedByUserId || ''),
    salesUserName: String(raw.recordedByName || raw.recordedBy?.name || 'Staff'),
    userRole: String(raw.recordedByRole || 'sales') as UserRole,
    regionId: String(raw.regionId || 'reg-north'),
    type: 'collection_from_customer',
    customerId: raw.partyId ? String(raw.partyId) : undefined,
    customerName: raw.party?.name || raw.customerName || undefined,
    amount: Number(raw.amount ?? 0),
    paymentMode,
    referenceNumber: String(raw.referenceNo || ''),
    proofAttachmentName: raw.referenceNo ? `ref_${String(raw.referenceNo)}.pdf` : 'payment_receipt.pdf',
    proofType: paymentMode === 'cash' ? 'cash_receipt' : paymentMode === 'cheque' ? 'cheque_photo' : 'deposit_slip',
    status,
    verifiedByUserId: raw.verifiedById ? String(raw.verifiedById) : undefined,
    verifiedAt: raw.verifiedAt ? String(raw.verifiedAt) : undefined,
    discrepancyReason: raw.discrepancyReason || undefined,
    notes: raw.notes || undefined,
  };
}
