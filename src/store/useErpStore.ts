import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Organization,
  SubscriptionPlan,
  PLAN_TIERS,
  User,
  UserRole,
  Region,
  Warehouse,
  ProductCategory,
  Product,
  Batch,
  StockMovement,
  InwardReceipt,
  Customer,
  SalesOrder,
  SalesOrderItem,
  BatchAllocation,
  FieldVisit,
  MarketSurvey,
  ExpenseClaim,
  WalletTransaction,
  SalesTarget,
  MarketingTarget,
  StockAdjustment,
  Notification,
  AuditLog,
  Quotation,
  SalesRemittanceEntry,
  Supplier,
  PurchaseOrder,
  TransportChargePolicy,
  ReceivingDiscrepancy,
  TransitDamageIncident,
  CustomerReturnRecord,
  EmployeeAttendanceRecord,
  PlanOfActionItem,
  LeaveRequest,
  RoleQueryTicket,
  ChatMessage,
  QueryCategory,
  QueryPriority,
  QueryStatus,
  CustomerDispatch,
  CustomerDispatchItem,
  ExpenseCategory,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  InvoicePaymentStatus,
  InvoiceSource,
  MarketingBudgetRequest,
  FinanceRefundClaim,
  PayrollRecord,
  IncentiveSettlement,
  AccountHead,
  JournalEntry,
} from '../types';
import {
  SEED_MARKETING_BUDGET_REQUESTS,
  SEED_FINANCE_CLAIMS,
  SEED_PAYROLL_RECORDS,
  SEED_INCENTIVE_SETTLEMENTS,
  SEED_CHART_OF_ACCOUNTS,
  SEED_JOURNAL_ENTRIES,
} from '../mock-data/financeSeed';
import {
  SEED_ORGANIZATIONS,
  SEED_USERS,
  SEED_REGIONS,
  SEED_WAREHOUSES,
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  SEED_BATCHES,
  SEED_CUSTOMERS,
  SEED_SALES_ORDERS,
  SEED_CUSTOMER_DISPATCHES,
  SEED_INWARD_RECEIPTS,
  SEED_STOCK_MOVEMENTS,
  SEED_FIELD_VISITS,
  SEED_MARKET_SURVEYS,
  SEED_EXPENSE_CLAIMS,
  SEED_WALLET_TRANSACTIONS,
  SEED_SALES_TARGETS,
  SEED_MARKETING_TARGETS,
  SEED_STOCK_ADJUSTMENTS,
  SEED_NOTIFICATIONS,
  SEED_AUDIT_LOGS,
  SEED_QUOTATIONS,
  SEED_SALES_REMITTANCES,
  SEED_SUPPLIERS,
  SEED_PURCHASE_ORDERS,
  SEED_TRANSPORT_POLICIES,
  SEED_RECEIVING_DISCREPANCIES,
  SEED_TRANSIT_INCIDENTS,
  SEED_CUSTOMER_RETURNS,
  SEED_ATTENDANCE_RECORDS,
  SEED_LEAVE_REQUESTS,
  SEED_ROLE_QUERIES,
  SEED_INVOICES,
} from '../mock-data/seed';

interface ErpState {
  // Auth & Multi-Tenant Organization / Team
  isAuthenticated: boolean;
  currentUser: User;
  currentRole: UserRole;
  organizations: Organization[];
  currentOrganization: Organization;
  selectedRegionId: string; // 'all' or specific region
  users: User[];
  regions: Region[];
  warehouses: Warehouse[];
  categories: ProductCategory[];
  products: Product[];
  batches: Batch[];
  customers: Customer[];
  salesOrders: SalesOrder[];
  customerDispatches: CustomerDispatch[];
  inwardReceipts: InwardReceipt[];
  stockMovements: StockMovement[];
  fieldVisits: FieldVisit[];
  marketSurveys: MarketSurvey[];
  expenseClaims: ExpenseClaim[];
  walletTransactions: WalletTransaction[];
  salesTargets: SalesTarget[];
  marketingTargets: MarketingTarget[];
  stockAdjustments: StockAdjustment[];
  quotations: Quotation[];
  salesRemittances: SalesRemittanceEntry[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  transportPolicies: TransportChargePolicy[];
  receivingDiscrepancies: ReceivingDiscrepancy[];
  transitDamageIncidents: TransitDamageIncident[];
  customerReturns: CustomerReturnRecord[];
  attendanceRecords: EmployeeAttendanceRecord[];
  leaveRequests: LeaveRequest[];
  roleQueries: RoleQueryTicket[];
  invoices: Invoice[];
  budgetRequests: MarketingBudgetRequest[];
  financeClaims: FinanceRefundClaim[];
  payrollRecords: PayrollRecord[];
  incentiveSettlements: IncentiveSettlement[];
  chartOfAccounts: AccountHead[];
  journalEntries: JournalEntry[];
  theme: 'light' | 'dark';

  // Role Queries & Helpdesk Chat Actions
  addRoleQuery: (queryData: {
    title: string;
    category: QueryCategory;
    priority: QueryPriority;
    referenceId?: string;
    referenceType?: RoleQueryTicket['referenceType'];
    initialMessage: string;
  }) => RoleQueryTicket;
  addChatMessage: (ticketId: string, message: string, isInternalNote?: boolean, attachmentName?: string) => void;
  updateQueryStatus: (ticketId: string, status: QueryStatus) => void;
  assignQuery: (ticketId: string, assignedToId: string, assignedToName: string) => void;

  // Attendance, Plan of Action & Leaves Actions
  approveLeaveRequest: (leaveId: string, comment?: string) => void;
  rejectLeaveRequest: (leaveId: string, comment?: string) => void;
  submitLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'status' | 'submittedAt'>) => void;
  markAttendancePunch: (record: Omit<EmployeeAttendanceRecord, 'id'>) => void;
  updatePlanOfAction: (
    recordId: string,
    updates: {
      planOfAction?: string;
      planOfActionItems?: PlanOfActionItem[];
      planStatus?: EmployeeAttendanceRecord['planStatus'];
      poaProgressPercent?: number;
      supervisorFeedback?: string;
    }
  ) => void;
  togglePoaItem: (recordId: string, itemId: string) => void;

  // Theme Actions
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // Supplier & Purchasing Actions
  createSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Supplier;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber'>) => PurchaseOrder;
  updatePurchaseOrderStatus: (id: string, status: PurchaseOrder['status']) => void;
  approvePurchaseOrder: (poId: string, approverName: string, notes?: string) => void;
  rejectPurchaseOrder: (poId: string, approverName: string, reason: string) => void;
  sendPurchaseOrderToSupplier: (poId: string) => void;

  // Transit Damage Incident Review Actions
  updateTransitIncident: (id: string, updates: Partial<TransitDamageIncident>) => void;
  addTransitIncident: (incident: Omit<TransitDamageIncident, 'id' | 'incidentNumber'>) => TransitDamageIncident;
  recordAdminInspectionDecision: (
    receiptId: string,
    decision: 'partial_acceptance' | 'full_rejection' | 'hold_for_clarification',
    notes: string
  ) => { success: boolean; message: string; returnGatePassNumber?: string };
  addCustomerReturn: (record: Omit<CustomerReturnRecord, 'id' | 'returnNumber'>) => CustomerReturnRecord;

  // Inward & Shortage Discrepancy Lifecycle
  planIncomingGoods: (params: {
    poId?: string;
    poNumber?: string;
    supplierId?: string;
    supplierName: string;
    productId: string;
    regionId: string;
    warehouseId: string;
    expectedQuantity: number;
    expectedDate: string;
    actualUnitCost: number;
    transportExpense?: number;
    notes?: string;
  }) => InwardReceipt;
  recordGoodsReceiptCount: (
    receiptId: string,
    params: {
      actualCountedQuantity: number;
      acceptedQuantity: number;
      damagedQuantity: number;
      notes?: string;
      storageLocationId?: string;
    }
  ) => { shortageQuantity: number; excessQuantity: number; discrepancyCreated: boolean };
  resolveDiscrepancy: (
    discrepancyId: string,
    resolution: {
      status: ReceivingDiscrepancy['status'];
      resolutionType?: ReceivingDiscrepancy['resolutionType'];
      resolutionNotes: string;
      creditNoteNumber?: string;
    }
  ) => void;
  reportReceivingDiscrepancy: (discrepancy: {
    receiptId?: string;
    receiptNumber?: string;
    purchaseOrderId?: string;
    poNumber?: string;
    batchId?: string;
    batchNumber?: string;
    supplierId: string;
    supplierName: string;
    productId: string;
    productName: string;
    productSku: string;
    expectedQuantity: number;
    actualCountedQuantity: number;
    shortageQuantity?: number;
    damagedQuantity?: number;
    excessQuantity?: number;
    discrepancyType: ReceivingDiscrepancy['discrepancyType'];
    reason: string;
    evidenceProofUrl?: string;
  }) => { success: boolean; discrepancyId: string; message: string };
  postGoodsReceiptToInventory: (receiptId: string) => { success: boolean; batchNumber?: string; message: string };

  // Transport & Firm Charges Policy
  configureTransportChargePolicy: (policy: Omit<TransportChargePolicy, 'id'>) => TransportChargePolicy;
  updateTransportChargePolicy: (id: string, updates: Partial<TransportChargePolicy>) => void;
  reserveOrderStock: (orderId: string) => { success: boolean; message: string };
  dispatchOrderWithTransport: (
    orderId: string,
    params: {
      companyTransportExpense: number;
      customerDeliveryCharge: number;
      carrierName: string;
      trackingNumber: string;
    }
  ) => { success: boolean; message: string };

  // Action methods
  loginUser: (
    email: string,
    password?: string,
    teamId?: string
  ) => { success: boolean; message?: string; role?: UserRole; user?: User; organization?: Organization };
  logoutUser: () => void;
  switchRole: (role: UserRole) => void;
  switchUser: (userId: string) => void;
  switchOrganization: (teamIdOrOrgId: string) => void;
  registerOrganization: (orgData: Omit<Organization, 'id'>) => void;
  registerOrganizationWithAdmin: (params: {
    organization: {
      teamId: string;
      name: string;
      legalName?: string;
      taxGstNumber?: string;
      industry?: string;
      currency?: string;
      plan: SubscriptionPlan;
    };
    adminUser: {
      name: string;
      email: string;
      password?: string;
      phone?: string;
      assignedRegionId?: string;
    };
    autoLogin?: boolean;
  }) => { success: boolean; message: string; organization?: Organization; user?: User };
  upgradePlan: (teamId: string, newPlan: SubscriptionPlan) => { success: boolean; message: string };
  setSelectedRegionId: (regionId: string) => void;

  // Remittance & Collections Ledger Actions
  verifyRemittance: (id: string, notes?: string) => void;
  flagRemittanceDiscrepancy: (id: string, reason: string) => void;
  addRemittanceEntry: (entry: Omit<SalesRemittanceEntry, 'id' | 'entryNumber'>) => void;

  // Quotation Management Actions
  assignQuotation: (quotationId: string, salesUserId: string, notes?: string) => void;
  batchAssignQuotationsBySender: (senderName: string, salesUserId: string, notes?: string) => void;
  createQuotation: (quotationData: Omit<Quotation, 'id' | 'quotationNo' | 'createdDate'>) => void;
  updateQuotationStatus: (quotationId: string, status: Quotation['status']) => void;

  // Product & Pricing Actions
  addProduct: (product: Omit<Product, 'id'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  updatePricePolicy: (
    productId: string,
    standardSellingPrice: number,
    minAllowedPrice: number,
    defaultMaxDiscountPercent: number
  ) => void;

  // Inward Actions
  createInwardReceipt: (receipt: Omit<InwardReceipt, 'id' | 'receiptNumber' | 'totalCost'>) => InwardReceipt;
  processInwardReceipt: (receiptId: string) => { success: boolean; message: string };

  // Sales Order & Outward Actions
  createSalesOrder: (orderData: {
    customerId: string;
    items: {
      productId: string;
      quantity: number;
      discountPercent: number;
    }[];
    notes?: string;
  }) => { success: boolean; orderId?: string; message: string; requiresApproval?: boolean };
  
  approveDiscount: (orderId: string, reason?: string) => void;
  rejectDiscount: (orderId: string, reason: string) => void;
  
  allocateAndDispatchOrder: (
    orderId: string,
    allocationsByItem: { productId: string; allocations: BatchAllocation[] }[],
    warehouseId: string,
    trackingNumber?: string
  ) => { success: boolean; message: string };
  
  cancelOrder: (orderId: string, reason: string) => void;
  updateSalesOrderStatus: (orderId: string, status: SalesOrder['status']) => void;
  recordOrderPayment: (orderId: string, amount: number) => void;

  // Warehouse Operations
  transferStock: (
    sourceBatchId: string,
    targetWarehouseId: string,
    quantity: number,
    notes: string
  ) => { success: boolean; message: string };
  
  requestStockAdjustment: (
    batchId: string,
    difference: number,
    reason: StockAdjustment['reason'],
    notes: string
  ) => void;
  
  approveStockAdjustment: (adjustmentId: string) => void;

  // Field Marketing Actions
  createFieldVisit: (visit: Omit<FieldVisit, 'id' | 'status' | 'checkInTime'>) => void;
  checkOutFieldVisit: (
    visitId: string,
    outcomeNotes: string,
    followUpDate?: string,
    sampleGiven?: boolean,
    sampleItem?: string
  ) => void;
  createCustomerLead: (customer: Omit<Customer, 'id' | 'onboardingDate' | 'status'>) => void;
  submitMarketSurvey: (survey: Omit<MarketSurvey, 'id' | 'date'>) => void;

  // Expenses & Wallets
  submitExpenseClaim: (claim: Omit<ExpenseClaim, 'id' | 'claimNumber' | 'status' | 'submittedAt'>) => void;
  approveExpenseClaim: (claimId: string) => void;
  rejectExpenseClaim: (claimId: string, reason: string) => void;
  settleExpenseClaim: (
    claimId: string,
    paymentMethod: 'bank_transfer' | 'upi' | 'wallet_credit' | 'petty_cash',
    transactionReference: string,
    settledAmount?: number,
    notes?: string
  ) => void;
  batchSettleClaims: (
    claimIds: string[],
    paymentMethod: 'bank_transfer' | 'upi' | 'wallet_credit' | 'petty_cash',
    transactionReference: string
  ) => void;
  issueWalletAdvance: (userId: string, amount: number, notes: string) => void;
  allocateWalletFunds: (userId: string, amount: number, notes: string) => { success: boolean; message: string };

  // Customer Dispatches
  createCustomerDispatch: (dispatchData: Omit<CustomerDispatch, 'id' | 'dispatchNumber'>) => { success: boolean; dispatch?: CustomerDispatch; message: string };
  updateCustomerDispatchStatus: (id: string, status: CustomerDispatch['deliveryStatus'], notes?: string) => void;
  addDispatchDeliveryExpense: (dispatchId: string, expense: { category: ExpenseCategory; amount: number; description: string; paidByUserId: string; paidByUserName: string; proofType?: 'receipt' | 'invoice' | 'bill' | 'statement'; proofUrl?: string; receiptAttachment?: string }) => void;

  // Target & Policy config
  setUserDiscountLimit: (userId: string, maxDiscountPercent: number) => void;
  setUserSalesTarget: (userId: string, targetAmount: number) => void;
  assignSalesTarget: (target: Omit<SalesTarget, 'id'>) => void;
  assignMarketingTarget: (target: Omit<MarketingTarget, 'id'>) => void;
  updateBatchDiscount: (batchId: string, clearanceDiscountPercent: number) => void;
  applySmartDiscount: (params: {
    targetType: 'batch' | 'product';
    targetIds: string[];
    discountPercent: number;
    reason: string;
    validUntil?: string;
  }) => void;

  // Regions, Warehouses & Users Admin Management
  addUser: (userData: Omit<User, 'id'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  addRegion: (regionData: Omit<Region, 'id' | 'activeWarehousesCount'>) => void;
  addWarehouse: (warehouseData: Omit<Warehouse, 'id' | 'locations'>) => void;

  // Notifications & Audit
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (notif: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;

  // Invoice Management Actions
  createInvoice: (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber'> & { invoiceNumber?: string }) => Invoice;
  recordInvoicePayment: (invoiceId: string, paymentData: {
    amount: number;
    paymentMode?: string;
    referenceNumber?: string;
    paymentDate?: string;
    notes?: string;
  }) => { success: boolean; message: string };
  updateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => void;
  sendInvoiceEmail: (invoiceId: string, recipientEmail?: string) => { success: boolean; message: string };
  sendInvoiceWhatsApp: (invoiceId: string, recipientPhone?: string) => { success: boolean; message: string };

  // Finance Role Domain Actions
  approveBudgetRequest: (id: string, approvedAmount?: number, notes?: string) => void;
  rejectBudgetRequest: (id: string, reason: string) => void;
  partiallyApproveBudgetRequest: (id: string, approvedAmount: number, notes?: string) => void;
  approveFinanceClaim: (id: string, approvedAmount: number, method?: FinanceRefundClaim['refundMethod'], notes?: string) => void;
  rejectFinanceClaim: (id: string, reason: string) => void;
  disburseFinanceClaim: (id: string, reference: string, method?: FinanceRefundClaim['refundMethod']) => void;
  approvePayrollRecord: (id: string) => void;
  disbursePayrollRecord: (id: string, reference: string, mode?: string) => void;
  approveIncentiveSettlement: (id: string, approvedAmount?: number, notes?: string) => void;
  disburseIncentiveSettlement: (id: string, reference: string) => void;
  createJournalEntry: (entry: Omit<JournalEntry, 'id' | 'voucherNumber' | 'createdAt' | 'createdByUserName'> & { voucherNumber?: string; createdByUserName?: string }) => JournalEntry;
  postJournalEntry: (id: string) => void;
  recordSupplierPayment: (supplierId: string, amount: number, paymentMode: string, reference: string, poId?: string, notes?: string) => void;
  recordSupplierDebitCreditNote: (supplierId: string, type: 'credit_note' | 'debit_note', amount: number, reference: string, reason: string) => void;
  verifyCustomerRemittance: (remittanceId: string, verified: boolean, notes?: string) => void;
  recordCustomerPaymentReceipt: (customerId: string, amount: number, paymentMode: string, reference: string, orderId?: string, invoiceId?: string, notes?: string) => void;
  settleEmployeeExpense: (claimId: string, settledAmount: number, paymentMode: string, reference: string) => void;
  rejectEmployeeExpense: (claimId: string, reason: string) => void;

  // Reset
  resetToDemoData: () => void;
}

export const useErpStore = create<ErpState>()(
  persist(
    (set, get) => ({
      isAuthenticated: true,
      currentUser: SEED_USERS[0], // Admin by default
      currentRole: 'admin',
      organizations: SEED_ORGANIZATIONS,
      currentOrganization: SEED_ORGANIZATIONS[0],
      selectedRegionId: 'all',
      users: SEED_USERS,
      regions: SEED_REGIONS,
      warehouses: SEED_WAREHOUSES,
      categories: SEED_CATEGORIES,
      products: SEED_PRODUCTS,
      batches: SEED_BATCHES,
      customers: SEED_CUSTOMERS,
      salesOrders: SEED_SALES_ORDERS,
      customerDispatches: SEED_CUSTOMER_DISPATCHES,
      inwardReceipts: SEED_INWARD_RECEIPTS,
      stockMovements: SEED_STOCK_MOVEMENTS,
      fieldVisits: SEED_FIELD_VISITS,
      marketSurveys: SEED_MARKET_SURVEYS,
      expenseClaims: SEED_EXPENSE_CLAIMS,
      walletTransactions: SEED_WALLET_TRANSACTIONS,
      salesTargets: SEED_SALES_TARGETS,
      marketingTargets: SEED_MARKETING_TARGETS,
      stockAdjustments: SEED_STOCK_ADJUSTMENTS,
      quotations: SEED_QUOTATIONS,
      salesRemittances: SEED_SALES_REMITTANCES,
      notifications: SEED_NOTIFICATIONS,
      auditLogs: SEED_AUDIT_LOGS,
      suppliers: SEED_SUPPLIERS,
      purchaseOrders: SEED_PURCHASE_ORDERS,
      transportPolicies: SEED_TRANSPORT_POLICIES,
      receivingDiscrepancies: SEED_RECEIVING_DISCREPANCIES,
      transitDamageIncidents: SEED_TRANSIT_INCIDENTS,
      customerReturns: SEED_CUSTOMER_RETURNS,
      attendanceRecords: SEED_ATTENDANCE_RECORDS,
      leaveRequests: SEED_LEAVE_REQUESTS,
      roleQueries: SEED_ROLE_QUERIES,
      invoices: SEED_INVOICES,
      budgetRequests: SEED_MARKETING_BUDGET_REQUESTS,
      financeClaims: SEED_FINANCE_CLAIMS,
      payrollRecords: SEED_PAYROLL_RECORDS,
      incentiveSettlements: SEED_INCENTIVE_SETTLEMENTS,
      chartOfAccounts: SEED_CHART_OF_ACCOUNTS,
      journalEntries: SEED_JOURNAL_ENTRIES,
      theme: (typeof window !== 'undefined' && localStorage.getItem('apex_erp_theme') === 'dark') ? 'dark' : 'light',

      // Authentication & Session
      loginUser: (email: string, _password?: string, teamId?: string) => {
        const state = get();
        const cleanEmail = email.trim().toLowerCase();

        // Ensure state.users has all SEED_USERS merged and updated with salesSubRole
        let allUsers = [...(state.users || [])];
        let hasNewUsers = false;
        SEED_USERS.forEach((su) => {
          const existingIdx = allUsers.findIndex((u) => u.id === su.id);
          if (existingIdx >= 0) {
            allUsers[existingIdx] = { ...su, ...allUsers[existingIdx], salesSubRole: su.salesSubRole, name: su.name, email: su.email };
            hasNewUsers = true;
          } else {
            allUsers.push(su);
            hasNewUsers = true;
          }
        });
        if (hasNewUsers) {
          set({ users: allUsers });
        }
        if (!state.roleQueries || state.roleQueries.length === 0) {
          set({ roleQueries: SEED_ROLE_QUERIES });
        }
        if (!state.attendanceRecords || !state.attendanceRecords.some((r) => r.planOfAction)) {
          set({ attendanceRecords: SEED_ATTENDANCE_RECORDS });
        }

        // 1. Direct match by exact email in combined users
        let user = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);

        // 2. Flexible demo aliases (supporting role shortcuts like manager@..., service@..., or specific names)
        if (!user) {
          if (cleanEmail.includes('ananya.roy') || cleanEmail.includes('sales-mgr') || cleanEmail === 'sales_manager') {
            user = allUsers.find((u) => u.id === 'usr-sales-mgr') || SEED_USERS.find((u) => u.id === 'usr-sales-mgr');
          } else if (cleanEmail.includes('sneha') || cleanEmail.includes('sales-coord') || cleanEmail === 'sales_coordinator') {
            user = allUsers.find((u) => u.id === 'usr-sales-coord') || SEED_USERS.find((u) => u.id === 'usr-sales-coord');
          } else if (cleanEmail.includes('aditya') || cleanEmail.includes('sales-jr') || cleanEmail === 'junior_sales') {
            user = allUsers.find((u) => u.id === 'usr-sales-jr') || SEED_USERS.find((u) => u.id === 'usr-sales-jr');
          } else if (
            cleanEmail === 'manager' ||
            cleanEmail === 'manager@apexflow-erp.com' ||
            cleanEmail === 'manager@tzmicha.com' ||
            cleanEmail === 'manager@tzmicha-erp.com' ||
            cleanEmail.includes('pooja')
          ) {
            user = allUsers.find((u) => u.role === 'manager') || SEED_USERS.find((u) => u.role === 'manager');
          } else if (
            cleanEmail === 'service' ||
            cleanEmail === 'service@apexflow-erp.com' ||
            cleanEmail === 'service@tzmicha.com' ||
            cleanEmail === 'service@tzmicha-erp.com' ||
            cleanEmail.includes('deepak') ||
            cleanEmail.includes('service')
          ) {
            user = allUsers.find((u) => u.role === 'service') || SEED_USERS.find((u) => u.role === 'service');
          } else if (
            cleanEmail === 'admin' ||
            cleanEmail === 'admin@apexflow-erp.com' ||
            cleanEmail === 'admin@tzmicha.com' ||
            cleanEmail.includes('rajesh') ||
            cleanEmail.includes('admin')
          ) {
            user = allUsers.find((u) => u.role === 'admin') || SEED_USERS.find((u) => u.role === 'admin');
          } else if (
            cleanEmail === 'sales' ||
            cleanEmail === 'sales@apexflow-erp.com' ||
            cleanEmail.includes('vikram')
          ) {
            user = allUsers.find((u) => u.id === 'usr-sales-01') || allUsers.find((u) => u.role === 'sales') || SEED_USERS.find((u) => u.role === 'sales');
          } else if (
            cleanEmail === 'store' ||
            cleanEmail === 'warehouse' ||
            cleanEmail === 'store@apexflow-erp.com' ||
            cleanEmail.includes('devendra') ||
            cleanEmail.includes('store')
          ) {
            user = allUsers.find((u) => u.role === 'store_manager') || SEED_USERS.find((u) => u.role === 'store_manager');
          } else if (
            cleanEmail === 'marketing' ||
            cleanEmail === 'marketing@apexflow-erp.com' ||
            cleanEmail.includes('ananya.s') ||
            cleanEmail.includes('marketing')
          ) {
            user = allUsers.find((u) => u.role === 'marketing') || SEED_USERS.find((u) => u.role === 'marketing');
          } else if (
            cleanEmail === 'finance' ||
            cleanEmail === 'cfo@apexflow-erp.com' ||
            cleanEmail.includes('suresh') ||
            cleanEmail.includes('finance')
          ) {
            user = allUsers.find((u) => u.role === 'finance') || SEED_USERS.find((u) => u.role === 'finance');
          }
        }

        if (!user) {
          state.addAuditLog({
            userId: 'system',
            userName: 'Security Gate',
            userRole: 'admin',
            action: 'FAILED_LOGIN_ATTEMPT',
            entityType: 'user',
            entityId: cleanEmail,
            details: `Failed authentication attempt for email: ${cleanEmail}. User record not found.`,
          });
          return { success: false, message: 'Invalid credentials. User email not found. Please click any quick demo account above to sign in instantly.' };
        }
        if (user.status === 'suspended') {
          return { success: false, message: 'Account is suspended. Please contact enterprise IT administration.' };
        }

        // Match or resolve Organization / Team
        const cleanTeamId = (teamId || '').trim().toLowerCase();
        let matchedOrg = state.organizations[0];
        if (cleanTeamId) {
          const found = state.organizations.find(
            (o) =>
              o.teamId.toLowerCase() === cleanTeamId ||
              o.id.toLowerCase() === cleanTeamId ||
              o.name.toLowerCase().includes(cleanTeamId)
          );
          if (found) {
            matchedOrg = found;
          } else {
            const limits = PLAN_TIERS.Enterprise;
            matchedOrg = {
              id: `org-${cleanTeamId.replace(/[^a-z0-9]/g, '-')}`,
              teamId: teamId?.toUpperCase() || 'CUSTOM-TEAM',
              name: `${teamId?.toUpperCase()} Workspace`,
              plan: 'Enterprise',
              maxEmployees: limits.maxEmployees,
              maxRegions: limits.maxRegions,
              maxWarehouses: limits.maxWarehouses,
              currency: 'INR (₹)',
              registeredAt: new Date().toISOString().split('T')[0],
              memberCount: 12,
            };
          }
        }

        set({
          currentUser: user,
          currentRole: user.role,
          currentOrganization: matchedOrg,
          isAuthenticated: true,
          selectedRegionId: user.assignedRegionId || 'all',
        });
        state.addAuditLog({
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: 'USER_LOGIN',
          entityType: 'user',
          entityId: user.id,
          details: `User logged in to Team ${matchedOrg.name} [ID: ${matchedOrg.teamId}] as ${user.role.toUpperCase()}.`,
          regionId: user.assignedRegionId,
        });
        return { success: true, role: user.role, user, organization: matchedOrg };
      },

      switchOrganization: (teamIdOrOrgId: string) => {
        const state = get();
        const clean = teamIdOrOrgId.trim().toLowerCase();
        const org = state.organizations.find(
          (o) => o.teamId.toLowerCase() === clean || o.id.toLowerCase() === clean
        );
        if (org) {
          set({ currentOrganization: org });
          state.addNotification({
            type: 'info',
            title: 'Organization Switched',
            message: `Switched active organization to ${org.name} (Team ID: ${org.teamId}).`,
            userId: 'all',
          });
        }
      },

      registerOrganization: (orgData) => {
        const state = get();
        const id = `org-${Date.now()}`;
        const planInfo = PLAN_TIERS[orgData.plan] || PLAN_TIERS.Enterprise;
        const newOrg: Organization = {
          ...orgData,
          id,
          teamId: orgData.teamId.toUpperCase().trim(),
          maxEmployees: orgData.maxEmployees || planInfo.maxEmployees,
          maxRegions: orgData.maxRegions || planInfo.maxRegions,
          maxWarehouses: orgData.maxWarehouses || planInfo.maxWarehouses,
        };
        set({
          organizations: [newOrg, ...state.organizations],
          currentOrganization: newOrg,
        });
        state.addNotification({
          type: 'success',
          title: 'Organization Registered',
          message: `New Organization ${newOrg.name} (Team ID: ${newOrg.teamId}) successfully registered on ${newOrg.plan} tier!`,
          userId: 'all',
        });
      },
       registerOrganizationWithAdmin: (params) => {
        const state = get();
        const cleanTeamId = params.organization.teamId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');

        if (!cleanTeamId) {
          return { success: false, message: 'Please provide a valid unique Team ID.' };
        }

        // Verify Team ID uniqueness
        const existingOrg = state.organizations.find((o) => o.teamId.toUpperCase() === cleanTeamId);
        if (existingOrg) {
          return {
            success: false,
            message: `Team ID "${cleanTeamId}" is already taken by ${existingOrg.name}. Please select another unique code.`,
          };
        }

        // Verify Admin Email uniqueness
        const cleanEmail = params.adminUser.email.trim().toLowerCase();
        const existingUser = state.users.find((u) => u.email.toLowerCase() === cleanEmail);
        if (existingUser) {
          return {
            success: false,
            message: `Corporate email "${cleanEmail}" is already associated with an account. Please sign in or use another email.`,
          };
        }

        const planKey = params.organization.plan || 'Enterprise';
        const planLimits = PLAN_TIERS[planKey] || PLAN_TIERS.Enterprise;
        const orgId = `org-${Date.now()}`;

        const newOrg: Organization = {
          id: orgId,
          teamId: cleanTeamId,
          name: params.organization.name.trim(),
          legalName: params.organization.legalName?.trim() || params.organization.name.trim(),
          taxGstNumber: params.organization.taxGstNumber?.trim(),
          industry: params.organization.industry || 'Chemicals & Manufacturing',
          currency: params.organization.currency || 'INR (₹)',
          plan: planKey,
          maxEmployees: planLimits.maxEmployees,
          maxRegions: planLimits.maxRegions,
          maxWarehouses: planLimits.maxWarehouses,
          registeredAt: new Date().toISOString().split('T')[0],
          memberCount: 1,
          adminEmail: cleanEmail,
          adminName: params.adminUser.name.trim(),
        };

        const adminUserId = `usr-${Date.now()}`;
        const newAdminUser: User = {
          id: adminUserId,
          name: params.adminUser.name.trim(),
          email: cleanEmail,
          phone: params.adminUser.phone?.trim() || '+91 98000 00000',
          role: 'admin',
          teamId: cleanTeamId,
          organizationId: orgId,
          assignedRegionId: params.adminUser.assignedRegionId || 'all',
          maxDiscountPercent: 25,
          walletBalance: 0,
          status: 'active',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        };

        set({
          organizations: [newOrg, ...state.organizations],
          users: [newAdminUser, ...state.users],
          ...(params.autoLogin
            ? {
                currentUser: newAdminUser,
                currentRole: 'admin',
                currentOrganization: newOrg,
                isAuthenticated: true,
                selectedRegionId: 'all',
              }
            : {}),
        });

        state.addAuditLog({
          userId: newAdminUser.id,
          userName: newAdminUser.name,
          userRole: 'admin',
          action: 'ORGANIZATION_REGISTERED',
          entityType: 'user',
          entityId: newOrg.id,
          details: `Organization "${newOrg.name}" registered under Team [${newOrg.teamId}] on ${newOrg.plan} plan (Quota: ${newOrg.maxEmployees} seats, ${newOrg.maxRegions} regions).`,
        });

        state.addNotification({
          type: 'success',
          title: 'Organization Workspace Activated',
          message: `Workspace "${newOrg.name}" (Team ID: ${newOrg.teamId}) successfully activated! Plan: ${newOrg.plan}.`,
          userId: newAdminUser.id,
        });

        return {
          success: true,
          message: `Organization "${newOrg.name}" provisioned successfully with Team ID: ${newOrg.teamId}`,
          organization: newOrg,
          user: newAdminUser,
        };
      },

      upgradePlan: (teamId: string, newPlan: SubscriptionPlan) => {
        const state = get();
        const clean = teamId.trim().toUpperCase();
        const org = state.organizations.find((o) => o.teamId.toUpperCase() === clean);
        if (!org) return { success: false, message: 'Organization not found.' };

        const planLimits = PLAN_TIERS[newPlan];
        const updatedOrg: Organization = {
          ...org,
          plan: newPlan,
          maxEmployees: planLimits.maxEmployees,
          maxRegions: planLimits.maxRegions,
          maxWarehouses: planLimits.maxWarehouses,
        };

        set({
          organizations: state.organizations.map((o) => (o.teamId.toUpperCase() === clean ? updatedOrg : o)),
          currentOrganization: state.currentOrganization.teamId.toUpperCase() === clean ? updatedOrg : state.currentOrganization,
        });

        state.addNotification({
          type: 'success',
          title: 'Subscription Tier Upgraded',
          message: `${org.name} upgraded to ${newPlan}! New limits: ${planLimits.maxEmployees} employees, ${planLimits.maxRegions} territories, ${planLimits.maxWarehouses} depots.`,
          userId: 'all',
        });

        return { success: true, message: `Successfully upgraded to ${newPlan} tier!` };
      },

      logoutUser: () => {
        const user = get().currentUser;
        get().addAuditLog({
          userId: user.id,
          userName: user.name,
          userRole: get().currentRole,
          action: 'USER_LOGOUT',
          entityType: 'user',
          entityId: user.id,
          details: `Session terminated cleanly for ${user.name}.`,
        });
        set({
          isAuthenticated: false,
        });
      },

      // Switch Role & User
      switchRole: (role: UserRole) => {
        const found = get().users.find((u) => u.role === role) || SEED_USERS[0];
        set({
          currentRole: role,
          currentUser: found,
          selectedRegionId: role === 'admin' || role === 'manager' ? 'all' : found.assignedRegionId,
        });
      },

      switchUser: (userId: string) => {
        const found = get().users.find((u) => u.id === userId);
        if (found) {
          set({
            currentUser: found,
            currentRole: found.role,
            selectedRegionId: found.role === 'admin' || found.role === 'manager' ? 'all' : found.assignedRegionId,
          });
        }
      },

      setSelectedRegionId: (regionId: string) => {
        const { currentRole, currentUser } = get();
        // If not admin/manager, restrict to assigned region
        if (currentRole !== 'admin' && currentRole !== 'manager') {
          set({ selectedRegionId: currentUser.assignedRegionId });
        } else {
          set({ selectedRegionId: regionId });
        }
      },

      // Products & Pricing
      addProduct: (productData) => {
        const id = `prod-${Date.now()}`;
        const newProd: Product = { ...productData, id };
        set((state) => ({
          products: [newProd, ...state.products],
          auditLogs: [
            {
              id: `aud-${Date.now()}`,
              timestamp: new Date().toISOString(),
              userId: state.currentUser.id,
              userName: state.currentUser.name,
              userRole: state.currentUser.role,
              action: 'PRODUCT_CREATED',
              entityType: 'product',
              entityId: newProd.sku,
              details: `Added new product ${newProd.name} (${newProd.sku}) with standard price ₹${newProd.standardSellingPrice}.`,
            },
            ...state.auditLogs,
          ],
        }));
        return newProd;
      },

      updateProduct: (id, updates) => {
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
      },

      updatePricePolicy: (productId, standardSellingPrice, minAllowedPrice, defaultMaxDiscountPercent) => {
        set((state) => {
          const product = state.products.find((p) => p.id === productId);
          return {
            products: state.products.map((p) =>
              p.id === productId
                ? {
                    ...p,
                    standardSellingPrice,
                    minAllowedPrice,
                    defaultMaxDiscountPercent,
                  }
                : p
            ),
            auditLogs: [
              {
                id: `aud-${Date.now()}`,
                timestamp: new Date().toISOString(),
                userId: state.currentUser.id,
                userName: state.currentUser.name,
                userRole: state.currentUser.role,
                action: 'PRICING_UPDATED',
                entityType: 'pricing',
                entityId: product?.sku || productId,
                details: `Updated pricing for ${product?.name}: Standard Price ₹${standardSellingPrice}, Floor ₹${minAllowedPrice}, Max Disc ${defaultMaxDiscountPercent}%.`,
              },
              ...state.auditLogs,
            ],
          };
        });
      },

      // Inward Processing
      createInwardReceipt: (receiptData) => {
        const id = `inw-${Date.now()}`;
        const count = get().inwardReceipts.length + 42;
        const receiptNumber = `INW-2026-${String(count).padStart(3, '0')}`;
        const newReceipt: InwardReceipt = {
          ...receiptData,
          id,
          receiptNumber,
          totalCost: receiptData.receivedQuantity * receiptData.actualUnitCost,
        };

        set((state) => ({
          inwardReceipts: [newReceipt, ...state.inwardReceipts],
          notifications: [
            {
              id: `notif-${Date.now()}`,
              userId: 'all',
              title: 'Inward Consignment Scheduled',
              message: `${newReceipt.receiptNumber}: ${newReceipt.receivedQuantity} units of ${newReceipt.productName} expected from ${newReceipt.supplierName}.`,
              type: 'info',
              read: false,
              createdAt: new Date().toISOString(),
              actionUrl: '/store/inward',
            },
            ...state.notifications,
          ],
          auditLogs: [
            {
              id: `aud-${Date.now()}`,
              timestamp: new Date().toISOString(),
              userId: state.currentUser.id,
              userName: state.currentUser.name,
              userRole: state.currentUser.role,
              action: 'INWARD_RECEIPT_CREATED',
              entityType: 'receipt',
              entityId: receiptNumber,
              details: `Goods receipt note created for ${newReceipt.productName} (${newReceipt.receivedQuantity} ${newReceipt.unit}).`,
              regionId: newReceipt.regionId,
            },
            ...state.auditLogs,
          ],
        }));
        return newReceipt;
      },

      processInwardReceipt: (receiptId: string) => {
        const state = get();
        const receipt = state.inwardReceipts.find((r) => r.id === receiptId);
        if (!receipt) return { success: false, message: 'Receipt not found' };
        if (receipt.status === 'stock_available') {
          return { success: false, message: 'Stock already posted into inventory' };
        }

        // Create or update batch
        const existingBatch = state.batches.find(
          (b) =>
            b.batchNumber.toLowerCase() === receipt.batchNumber.toLowerCase() &&
            b.warehouseId === receipt.warehouseId
        );

        let updatedBatches = [...state.batches];
        let targetBatchId = '';

        if (existingBatch) {
          targetBatchId = existingBatch.id;
          updatedBatches = updatedBatches.map((b) =>
            b.id === existingBatch.id
              ? {
                  ...b,
                  availableQuantity: b.availableQuantity + receipt.receivedQuantity,
                  initialQuantity: b.initialQuantity + receipt.receivedQuantity,
                  status: 'active' as const,
                }
              : b
          );
        } else {
          targetBatchId = `batch-${Date.now()}`;
          const newBatch: Batch = {
            id: targetBatchId,
            batchNumber: receipt.batchNumber,
            productId: receipt.productId,
            productSku: receipt.productSku,
            productName: receipt.productName,
            regionId: receipt.regionId,
            warehouseId: receipt.warehouseId,
            locationId: receipt.storageLocationId || 'loc-default',
            initialQuantity: receipt.receivedQuantity,
            availableQuantity: receipt.receivedQuantity,
            reservedQuantity: 0,
            dispatchedQuantity: 0,
            manufacturingDate: receipt.manufacturingDate,
            expiryDate: receipt.expiryDate,
            actualUnitCost: receipt.actualUnitCost,
            status: 'active',
          };
          updatedBatches = [newBatch, ...updatedBatches];
        }

        const warehouse = state.warehouses.find((w) => w.id === receipt.warehouseId);
        const region = state.regions.find((r) => r.id === receipt.regionId);

        const movement: StockMovement = {
          id: `mov-${Date.now()}`,
          timestamp: new Date().toISOString(),
          movementType: 'inward_receipt',
          productId: receipt.productId,
          productName: receipt.productName,
          productSku: receipt.productSku,
          batchId: targetBatchId,
          batchNumber: receipt.batchNumber,
          regionId: receipt.regionId,
          regionName: region?.name || 'Region',
          warehouseId: receipt.warehouseId,
          warehouseName: warehouse?.name || 'Warehouse',
          quantity: receipt.receivedQuantity,
          referenceType: 'inward_receipt',
          referenceId: receipt.receiptNumber,
          performedByUserId: state.currentUser.id,
          performedByUserName: state.currentUser.name,
          unitCostAtMovement: receipt.actualUnitCost,
          remarks: `Physical receipt verified and posted to stock (Batch ${receipt.batchNumber}).`,
        };

        set({
          batches: updatedBatches,
          inwardReceipts: state.inwardReceipts.map((r) =>
            r.id === receiptId ? { ...r, status: 'stock_available' } : r
          ),
          stockMovements: [movement, ...state.stockMovements],
          notifications: [
            {
              id: `notif-${Date.now()}`,
              userId: 'all',
              title: 'Stock Inward Completed',
              message: `Added +${receipt.receivedQuantity} ${receipt.unit} of ${receipt.productName} to ${warehouse?.name}. Now available for sales.`,
              type: 'success',
              read: false,
              createdAt: new Date().toISOString(),
              actionUrl: '/store/stock',
            },
            ...state.notifications,
          ],
          auditLogs: [
            {
              id: `aud-${Date.now()}`,
              timestamp: new Date().toISOString(),
              userId: state.currentUser.id,
              userName: state.currentUser.name,
              userRole: state.currentUser.role,
              action: 'INWARD_POSTED_TO_STOCK',
              entityType: 'batch',
              entityId: receipt.batchNumber,
              details: `Received +${receipt.receivedQuantity} units into ${warehouse?.name}. Stock status updated to available.`,
              regionId: receipt.regionId,
            },
            ...state.auditLogs,
          ],
        });

        return { success: true, message: `Successfully posted ${receipt.receivedQuantity} units into active stock!` };
      },

      // Sales Order Creation with Stock Verification & Discount Permission Check
      createSalesOrder: ({ customerId, items, notes }) => {
        const state = get();
        const customer = state.customers.find((c) => c.id === customerId);
        if (!customer) return { success: false, message: 'Customer not found' };

        const targetRegionId = customer.regionId;
        const repMaxDiscount = state.currentUser.maxDiscountPercent || 0;

        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;
        let requiresApproval = false;
        let approvalReason = '';

        const orderItems: SalesOrderItem[] = [];

        // Verify stock in region and check discount limits
        for (const item of items) {
          const product = state.products.find((p) => p.id === item.productId);
          if (!product) continue;

          // Check regional available quantity
          const regionalBatches = state.batches.filter(
            (b) => b.productId === item.productId && b.regionId === targetRegionId && b.status === 'active'
          );
          const totalAvailable = regionalBatches.reduce((acc, b) => acc + b.availableQuantity, 0);

          if (item.quantity > totalAvailable) {
            return {
              success: false,
              message: `Insufficient stock for ${product.name} in ${targetRegionId}. Requested: ${item.quantity}, Available: ${totalAvailable}.`,
            };
          }

          // Check discount
          if (item.discountPercent > repMaxDiscount) {
            requiresApproval = true;
            approvalReason = `Requested ${item.discountPercent}% discount exceeds authorized limit of ${repMaxDiscount}% on ${product.name}.`;
          }

          const baseLineTotal = item.quantity * product.standardSellingPrice;
          const discountAmt = (baseLineTotal * item.discountPercent) / 100;
          const quotedUnitPrice = product.standardSellingPrice * (1 - item.discountPercent / 100);
          const afterDiscount = baseLineTotal - discountAmt;
          const taxAmt = (afterDiscount * product.taxRatePercent) / 100;
          const lineNetAmount = afterDiscount + taxAmt;

          subtotal += baseLineTotal;
          totalDiscount += discountAmt;
          totalTax += taxAmt;

          orderItems.push({
            productId: product.id,
            productSku: product.sku,
            productName: product.name,
            unit: product.unit,
            quantity: item.quantity,
            standardPrice: product.standardSellingPrice,
            discountPercent: item.discountPercent,
            quotedUnitPrice,
            totalAmount: afterDiscount,
            taxAmount: taxAmt,
            netAmount: lineNetAmount,
            allocations: [],
          });
        }

        const totalAmount = subtotal - totalDiscount + totalTax;
        const count = state.salesOrders.length + 90;
        const orderNumber = `SO-2026-${String(count).padStart(3, '0')}`;
        const orderId = `order-${Date.now()}`;

        // If requires approval, order stays in pending_discount_approval
        // If not, order goes directly to 'reserved' and stock is reserved in batches!
        let updatedBatches = [...state.batches];
        if (!requiresApproval) {
          // Reserve stock across batches
          for (const item of orderItems) {
            let remainingToReserve = item.quantity;
            updatedBatches = updatedBatches.map((batch) => {
              if (
                batch.productId === item.productId &&
                batch.regionId === targetRegionId &&
                batch.status === 'active' &&
                remainingToReserve > 0 &&
                batch.availableQuantity > 0
              ) {
                const reserveFromThis = Math.min(batch.availableQuantity, remainingToReserve);
                remainingToReserve -= reserveFromThis;
                return {
                  ...batch,
                  availableQuantity: batch.availableQuantity - reserveFromThis,
                  reservedQuantity: batch.reservedQuantity + reserveFromThis,
                };
              }
              return batch;
            });
          }
        }

        const newOrder: SalesOrder = {
          id: orderId,
          orderNumber,
          createdAt: new Date().toISOString(),
          customerId: customer.id,
          customerName: customer.businessName || customer.name,
          customerType: customer.type,
          regionId: targetRegionId,
          salesUserId: state.currentUser.id,
          salesUserName: state.currentUser.name,
          items: orderItems,
          subtotal,
          totalDiscount,
          totalTax,
          totalAmount,
          status: requiresApproval ? 'pending_discount_approval' : 'reserved',
          requiresDiscountApproval: requiresApproval,
          discountApprovalStatus: requiresApproval ? 'pending' : 'not_required',
          discountApprovalReason: requiresApproval ? approvalReason : undefined,
          paymentStatus: 'unpaid',
          amountPaid: 0,
          warehouseId: state.warehouses.find((w) => w.regionId === targetRegionId)?.id,
          notes: notes || '',
        };

        // Update sales target achievement if reserved
        let updatedTargets = [...state.salesTargets];
        if (!requiresApproval) {
          updatedTargets = updatedTargets.map((t) =>
            t.userId === state.currentUser.id
              ? {
                  ...t,
                  achievedAmount: t.achievedAmount + totalAmount,
                  ordersCount: t.ordersCount + 1,
                }
              : t
          );
        }

        set({
          salesOrders: [newOrder, ...state.salesOrders],
          batches: updatedBatches,
          salesTargets: updatedTargets,
          notifications: [
            {
              id: `notif-${Date.now()}`,
              userId: requiresApproval ? 'all' : 'usr-store-01',
              title: requiresApproval ? 'Discount Approval Required' : 'New Order Reserved for Dispatch',
              message: requiresApproval
                ? `${state.currentUser.name} requested approval for ${orderNumber} (${approvalReason}).`
                : `Order ${orderNumber} for ${newOrder.customerName} (₹${Math.round(totalAmount).toLocaleString('en-IN')}) is in the picking queue.`,
              type: requiresApproval ? 'warning' : 'info',
              read: false,
              createdAt: new Date().toISOString(),
              actionUrl: requiresApproval ? '/approvals' : '/store/dispatch-queue',
            },
            ...state.notifications,
          ],
          auditLogs: [
            {
              id: `aud-${Date.now()}`,
              timestamp: new Date().toISOString(),
              userId: state.currentUser.id,
              userName: state.currentUser.name,
              userRole: state.currentUser.role,
              action: requiresApproval ? 'ORDER_PENDING_APPROVAL' : 'ORDER_RESERVED',
              entityType: 'order',
              entityId: orderNumber,
              details: requiresApproval
                ? `Created order ${orderNumber} with discount exceeding limit; routed to Admin.`
                : `Created order ${orderNumber} and reserved stock in ${targetRegionId}.`,
              regionId: targetRegionId,
            },
            ...state.auditLogs,
          ],
        });

        return {
          success: true,
          orderId,
          requiresApproval,
          message: requiresApproval
            ? `Order created! Discount exceeds your limit of ${repMaxDiscount}%. Routed to Admin for approval.`
            : `Order ${orderNumber} created and stock reserved! Sent to Store Manager dispatch queue.`,
        };
      },

      approveDiscount: (orderId: string, reason?: string) => {
        const state = get();
        const order = state.salesOrders.find((o) => o.id === orderId);
        if (!order) return;

        // Reserve stock now that discount is approved
        let updatedBatches = [...state.batches];
        for (const item of order.items) {
          let remainingToReserve = item.quantity;
          updatedBatches = updatedBatches.map((batch) => {
            if (
              batch.productId === item.productId &&
              batch.regionId === order.regionId &&
              batch.status === 'active' &&
              remainingToReserve > 0 &&
              batch.availableQuantity > 0
            ) {
              const reserveFromThis = Math.min(batch.availableQuantity, remainingToReserve);
              remainingToReserve -= reserveFromThis;
              return {
                ...batch,
                availableQuantity: batch.availableQuantity - reserveFromThis,
                reservedQuantity: batch.reservedQuantity + reserveFromThis,
              };
            }
            return batch;
          });
        }

        set({
          salesOrders: state.salesOrders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: 'reserved',
                  discountApprovalStatus: 'approved',
                  discountApprovedBy: state.currentUser.name,
                  discountApprovedAt: new Date().toISOString(),
                  discountApprovalReason: reason || 'Approved by Admin',
                }
              : o
          ),
          batches: updatedBatches,
          notifications: [
            {
              id: `notif-${Date.now()}`,
              userId: order.salesUserId,
              title: 'Discount Request Approved!',
              message: `Admin ${state.currentUser.name} approved the special discount on order ${order.orderNumber}. Stock is now reserved.`,
              type: 'success',
              read: false,
              createdAt: new Date().toISOString(),
              actionUrl: '/sales/orders',
            },
            ...state.notifications,
          ],
          auditLogs: [
            {
              id: `aud-${Date.now()}`,
              timestamp: new Date().toISOString(),
              userId: state.currentUser.id,
              userName: state.currentUser.name,
              userRole: state.currentUser.role,
              action: 'DISCOUNT_APPROVED',
              entityType: 'order',
              entityId: order.orderNumber,
              details: `Admin approved discount override on order ${order.orderNumber}.`,
              regionId: order.regionId,
            },
            ...state.auditLogs,
          ],
        });
      },

      rejectDiscount: (orderId: string, reason: string) => {
        const state = get();
        const order = state.salesOrders.find((o) => o.id === orderId);
        if (!order) return;

        set({
          salesOrders: state.salesOrders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: 'cancelled',
                  discountApprovalStatus: 'rejected',
                  discountApprovedBy: state.currentUser.name,
                  discountApprovedAt: new Date().toISOString(),
                  discountApprovalReason: `Rejected: ${reason}`,
                }
              : o
          ),
          notifications: [
            {
              id: `notif-${Date.now()}`,
              userId: order.salesUserId,
              title: 'Discount Request Rejected',
              message: `Special discount on order ${order.orderNumber} was rejected by Admin: ${reason}`,
              type: 'alert',
              read: false,
              createdAt: new Date().toISOString(),
              actionUrl: '/sales/orders',
            },
            ...state.notifications,
          ],
          auditLogs: [
            {
              id: `aud-${Date.now()}`,
              timestamp: new Date().toISOString(),
              userId: state.currentUser.id,
              userName: state.currentUser.name,
              userRole: state.currentUser.role,
              action: 'DISCOUNT_REJECTED',
              entityType: 'order',
              entityId: order.orderNumber,
              details: `Admin rejected discount for order ${order.orderNumber}. Reason: ${reason}`,
              regionId: order.regionId,
            },
            ...state.auditLogs,
          ],
        });
      },

      // Store Manager: Allocate multiple batches & confirm dispatch!
      allocateAndDispatchOrder: (orderId, allocationsByItem, warehouseId, trackingNumber) => {
        const state = get();
        const order = state.salesOrders.find((o) => o.id === orderId);
        if (!order) return { success: false, message: 'Order not found' };

        if (order.status === 'pending_discount_approval') {
          return {
            success: false,
            message: 'Cannot dispatch order while discount approval is pending from Admin!',
          };
        }

        // Validate allocations match item quantities
        let updatedBatches = [...state.batches];
        const newMovements: StockMovement[] = [];
        const updatedItems = order.items.map((item) => {
          const itemAllocations = allocationsByItem.find((a) => a.productId === item.productId);
          const allocations = itemAllocations?.allocations || item.allocations;

          const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedQuantity, 0);
          if (totalAllocated !== item.quantity) {
            // If allocations were not provided manually, auto-allocate from reserved batches
            // (Store manager quick confirm)
          }

          // Deduct reservedQuantity and add to dispatchedQuantity
          for (const alloc of allocations) {
            const batchIndex = updatedBatches.findIndex((b) => b.id === alloc.batchId);
            if (batchIndex >= 0) {
              const b = updatedBatches[batchIndex];
              const reservedDeduction = Math.min(b.reservedQuantity, alloc.allocatedQuantity);
              updatedBatches[batchIndex] = {
                ...b,
                reservedQuantity: Math.max(0, b.reservedQuantity - reservedDeduction),
                dispatchedQuantity: b.dispatchedQuantity + alloc.allocatedQuantity,
                // If this batch was not reserved previously (e.g. newly selected batch), reduce available
                availableQuantity: Math.max(0, b.availableQuantity - (alloc.allocatedQuantity - reservedDeduction)),
              };

              newMovements.push({
                id: `mov-${Date.now()}-${alloc.batchId}`,
                timestamp: new Date().toISOString(),
                movementType: 'outward_dispatch',
                productId: item.productId,
                productName: item.productName,
                productSku: item.productSku,
                batchId: b.id,
                batchNumber: b.batchNumber,
                regionId: order.regionId,
                regionName: state.regions.find((r) => r.id === order.regionId)?.name || 'Region',
                warehouseId,
                warehouseName: state.warehouses.find((w) => w.id === warehouseId)?.name || 'Warehouse',
                quantity: alloc.allocatedQuantity,
                referenceType: 'sales_order',
                referenceId: order.orderNumber,
                performedByUserId: state.currentUser.id,
                performedByUserName: state.currentUser.name,
                unitCostAtMovement: b.actualUnitCost,
                remarks: `Dispatched to ${order.customerName} against ${order.orderNumber}.`,
              });
            }
          }

          return {
            ...item,
            allocations,
          };
        });

        const tracking = trackingNumber || `TRK-EXP-${Math.floor(1000 + Math.random() * 9000)}`;

        set({
          batches: updatedBatches,
          salesOrders: state.salesOrders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: 'dispatched',
                  items: updatedItems,
                  warehouseId,
                  dispatchedAt: new Date().toISOString(),
                  dispatchedByUserId: state.currentUser.id,
                  dispatchedByUserName: state.currentUser.name,
                  dispatchTrackingNumber: tracking,
                }
              : o
          ),
          stockMovements: [...newMovements, ...state.stockMovements],
          notifications: [
            {
              id: `notif-${Date.now()}`,
              userId: order.salesUserId,
              title: 'Order Dispatched Successfully!',
              message: `Order ${order.orderNumber} for ${order.customerName} has been dispatched from warehouse (Tracking: ${tracking}).`,
              type: 'success',
              read: false,
              createdAt: new Date().toISOString(),
              actionUrl: '/sales/orders',
            },
            ...state.notifications,
          ],
          auditLogs: [
            {
              id: `aud-${Date.now()}`,
              timestamp: new Date().toISOString(),
              userId: state.currentUser.id,
              userName: state.currentUser.name,
              userRole: state.currentUser.role,
              action: 'DISPATCH_CONFIRMED',
              entityType: 'order',
              entityId: order.orderNumber,
              details: `Store Manager confirmed outward dispatch for ${order.orderNumber} with tracking ${tracking}.`,
              regionId: order.regionId,
            },
            ...state.auditLogs,
          ],
        });

        return {
          success: true,
          message: `Order ${order.orderNumber} successfully dispatched with tracking number ${tracking}!`,
        };
      },

      cancelOrder: (orderId: string, reason: string) => {
        const state = get();
        const order = state.salesOrders.find((o) => o.id === orderId);
        if (!order) return;

        // Restore reserved stock if was reserved
        let updatedBatches = [...state.batches];
        if (order.status === 'reserved' || order.status === 'stock_verified') {
          for (const item of order.items) {
            let remainingToUnreserve = item.quantity;
            updatedBatches = updatedBatches.map((b) => {
              if (
                b.productId === item.productId &&
                b.regionId === order.regionId &&
                remainingToUnreserve > 0 &&
                b.reservedQuantity > 0
              ) {
                const unreserve = Math.min(b.reservedQuantity, remainingToUnreserve);
                remainingToUnreserve -= unreserve;
                return {
                  ...b,
                  reservedQuantity: b.reservedQuantity - unreserve,
                  availableQuantity: b.availableQuantity + unreserve,
                };
              }
              return b;
            });
          }
        }

        set({
          batches: updatedBatches,
          salesOrders: state.salesOrders.map((o) =>
            o.id === orderId ? { ...o, status: 'cancelled', notes: `${o.notes || ''} [Cancelled: ${reason}]` } : o
          ),
          auditLogs: [
            {
              id: `aud-${Date.now()}`,
              timestamp: new Date().toISOString(),
              userId: state.currentUser.id,
              userName: state.currentUser.name,
              userRole: state.currentUser.role,
              action: 'ORDER_CANCELLED',
              entityType: 'order',
              entityId: order.orderNumber,
              details: `Order cancelled. Reason: ${reason}. Reserved stock released.`,
              regionId: order.regionId,
            },
            ...state.auditLogs,
          ],
        });
      },

      updateSalesOrderStatus: (orderId: string, status: SalesOrder['status']) => {
        set((state) => ({
          salesOrders: state.salesOrders.map((o) =>
            o.id === orderId ? { ...o, status } : o
          ),
        }));
      },

      recordOrderPayment: (orderId: string, amount: number) => {
        const state = get();
        const order = state.salesOrders.find((o) => o.id === orderId);
        if (!order) return;

        const newPaid = (order.amountPaid || 0) + amount;
        const paymentStatus = newPaid >= order.totalAmount ? 'paid' : 'partially_paid';

        set({
          salesOrders: state.salesOrders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  amountPaid: newPaid,
                  paymentStatus,
                }
              : o
          ),
          customers: state.customers.map((c) =>
            c.id === order.customerId
              ? {
                  ...c,
                  currentOutstanding: Math.max(0, c.currentOutstanding - amount),
                }
              : c
          ),
          auditLogs: [
            {
              id: `aud-${Date.now()}`,
              timestamp: new Date().toISOString(),
              userId: state.currentUser.id,
              userName: state.currentUser.name,
              userRole: state.currentUser.role,
              action: 'PAYMENT_RECORDED',
              entityType: 'order',
              entityId: order.orderNumber,
              details: `Recorded payment of ₹${amount.toLocaleString('en-IN')} for order ${order.orderNumber}. Status: ${paymentStatus}.`,
              regionId: order.regionId,
            },
            ...state.auditLogs,
          ],
        });
      },

      // Warehouse Transfer
      transferStock: (sourceBatchId, targetWarehouseId, quantity, notes) => {
        const state = get();
        const sourceBatch = state.batches.find((b) => b.id === sourceBatchId);
        const targetWarehouse = state.warehouses.find((w) => w.id === targetWarehouseId);
        if (!sourceBatch || !targetWarehouse) {
          return { success: false, message: 'Invalid source batch or target warehouse' };
        }

        if (quantity > sourceBatch.availableQuantity) {
          return { success: false, message: `Cannot transfer more than available quantity (${sourceBatch.availableQuantity})` };
        }

        // Deduct from source batch
        let updatedBatches = state.batches.map((b) =>
          b.id === sourceBatchId
            ? { ...b, availableQuantity: b.availableQuantity - quantity }
            : b
        );

        // Check if destination warehouse already has this batch
        const destBatch = updatedBatches.find(
          (b) => b.batchNumber === sourceBatch.batchNumber && b.warehouseId === targetWarehouseId
        );

        let destBatchId = '';
        if (destBatch) {
          destBatchId = destBatch.id;
          updatedBatches = updatedBatches.map((b) =>
            b.id === destBatch.id
              ? { ...b, availableQuantity: b.availableQuantity + quantity }
              : b
          );
        } else {
          destBatchId = `batch-trf-${Date.now()}`;
          const newBatch: Batch = {
            ...sourceBatch,
            id: destBatchId,
            warehouseId: targetWarehouseId,
            regionId: targetWarehouse.regionId,
            locationId: targetWarehouse.locations[0]?.id || 'loc-default',
            initialQuantity: quantity,
            availableQuantity: quantity,
            reservedQuantity: 0,
            dispatchedQuantity: 0,
          };
          updatedBatches.push(newBatch);
        }

        const sourceWarehouse = state.warehouses.find((w) => w.id === sourceBatch.warehouseId);

        const movements: StockMovement[] = [
          {
            id: `mov-${Date.now()}-out`,
            timestamp: new Date().toISOString(),
            movementType: 'transfer_out',
            productId: sourceBatch.productId,
            productName: sourceBatch.productName,
            productSku: sourceBatch.productSku,
            batchId: sourceBatch.id,
            batchNumber: sourceBatch.batchNumber,
            regionId: sourceBatch.regionId,
            regionName: state.regions.find((r) => r.id === sourceBatch.regionId)?.name || '',
            warehouseId: sourceBatch.warehouseId,
            warehouseName: sourceWarehouse?.name || '',
            quantity,
            referenceType: 'transfer',
            referenceId: `TRF-${Date.now()}`,
            performedByUserId: state.currentUser.id,
            performedByUserName: state.currentUser.name,
            remarks: `Transferred to ${targetWarehouse.name}. Notes: ${notes}`,
          },
          {
            id: `mov-${Date.now()}-in`,
            timestamp: new Date().toISOString(),
            movementType: 'transfer_in',
            productId: sourceBatch.productId,
            productName: sourceBatch.productName,
            productSku: sourceBatch.productSku,
            batchId: destBatchId,
            batchNumber: sourceBatch.batchNumber,
            regionId: targetWarehouse.regionId,
            regionName: state.regions.find((r) => r.id === targetWarehouse.regionId)?.name || '',
            warehouseId: targetWarehouseId,
            warehouseName: targetWarehouse.name,
            quantity,
            referenceType: 'transfer',
            referenceId: `TRF-${Date.now()}`,
            performedByUserId: state.currentUser.id,
            performedByUserName: state.currentUser.name,
            remarks: `Received transfer from ${sourceWarehouse?.name}. Notes: ${notes}`,
          },
        ];

        set({
          batches: updatedBatches,
          stockMovements: [...movements, ...state.stockMovements],
          auditLogs: [
            {
              id: `aud-${Date.now()}`,
              timestamp: new Date().toISOString(),
              userId: state.currentUser.id,
              userName: state.currentUser.name,
              userRole: state.currentUser.role,
              action: 'STOCK_TRANSFER',
              entityType: 'stock',
              entityId: sourceBatch.batchNumber,
              details: `Transferred ${quantity} units from ${sourceWarehouse?.name} to ${targetWarehouse.name}.`,
              regionId: targetWarehouse.regionId,
            },
            ...state.auditLogs,
          ],
        });

        return {
          success: true,
          message: `Successfully transferred ${quantity} units to ${targetWarehouse.name}!`,
        };
      },

      requestStockAdjustment: (batchId, difference, reason, notes) => {
        const state = get();
        const batch = state.batches.find((b) => b.id === batchId);
        if (!batch) return;

        const count = state.stockAdjustments.length + 10;
        const adjNumber = `ADJ-2026-${String(count).padStart(3, '0')}`;
        const newAdj: StockAdjustment = {
          id: `adj-${Date.now()}`,
          adjustmentNumber: adjNumber,
          regionId: batch.regionId,
          warehouseId: batch.warehouseId,
          productId: batch.productId,
          productName: batch.productName,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          previousQuantity: batch.availableQuantity,
          newQuantity: batch.availableQuantity + difference,
          difference,
          reason,
          status: 'pending_approval',
          requestedByUserId: state.currentUser.id,
          requestedByUserName: state.currentUser.name,
          date: new Date().toISOString().split('T')[0],
          notes,
        };

        set({
          stockAdjustments: [newAdj, ...state.stockAdjustments],
          notifications: [
            {
              id: `notif-${Date.now()}`,
              userId: 'all',
              title: 'Stock Adjustment Requested',
              message: `${state.currentUser.name} requested adjustment of ${difference} units on Batch ${batch.batchNumber} (${reason}).`,
              type: 'warning',
              read: false,
              createdAt: new Date().toISOString(),
              actionUrl: '/approvals',
            },
            ...state.notifications,
          ],
        });
      },

      approveStockAdjustment: (adjustmentId: string) => {
        const state = get();
        const adj = state.stockAdjustments.find((a) => a.id === adjustmentId);
        if (!adj) return;

        const batch = state.batches.find((b) => b.id === adj.batchId);
        if (!batch) return;

        const updatedQuantity = Math.max(0, batch.availableQuantity + adj.difference);
        const warehouse = state.warehouses.find((w) => w.id === adj.warehouseId);

        const movement: StockMovement = {
          id: `mov-${Date.now()}`,
          timestamp: new Date().toISOString(),
          movementType: adj.difference > 0 ? 'adjustment_positive' : 'adjustment_negative',
          productId: adj.productId,
          productName: adj.productName,
          productSku: batch.productSku,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          regionId: adj.regionId,
          regionName: state.regions.find((r) => r.id === adj.regionId)?.name || '',
          warehouseId: adj.warehouseId,
          warehouseName: warehouse?.name || '',
          quantity: Math.abs(adj.difference),
          referenceType: 'adjustment',
          referenceId: adj.adjustmentNumber,
          performedByUserId: state.currentUser.id,
          performedByUserName: state.currentUser.name,
          remarks: `Stock adjustment approved by Admin: ${adj.notes}`,
        };

        set({
          batches: state.batches.map((b) =>
            b.id === batch.id ? { ...b, availableQuantity: updatedQuantity } : b
          ),
          stockAdjustments: state.stockAdjustments.map((a) =>
            a.id === adjustmentId
              ? {
                  ...a,
                  status: 'approved',
                  approvedByUserId: state.currentUser.id,
                  approvedByUserName: state.currentUser.name,
                }
              : a
          ),
          stockMovements: [movement, ...state.stockMovements],
        });
      },

      // Field Marketing Operations
      createFieldVisit: (visitData) => {
        const id = `vst-${Date.now()}`;
        const newVisit: FieldVisit = {
          ...visitData,
          id,
          status: 'in_progress',
          checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        set((state) => ({
          fieldVisits: [newVisit, ...state.fieldVisits],
          auditLogs: [
            {
              id: `aud-${Date.now()}`,
              timestamp: new Date().toISOString(),
              userId: state.currentUser.id,
              userName: state.currentUser.name,
              userRole: state.currentUser.role,
              action: 'FIELD_VISIT_CHECKIN',
              entityType: 'user',
              entityId: id,
              details: `Field visit checked-in at ${newVisit.locationAddress} for ${newVisit.purpose}.`,
              regionId: newVisit.regionId,
            },
            ...state.auditLogs,
          ],
        }));
      },

      checkOutFieldVisit: (visitId, outcomeNotes, followUpDate, sampleGiven, sampleItem) => {
        const checkOutTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        set((state) => {
          const visit = state.fieldVisits.find((v) => v.id === visitId);
          // Increment marketing target completed visits
          const updatedTargets = state.marketingTargets.map((t) =>
            t.userId === state.currentUser.id ? { ...t, completedVisits: t.completedVisits + 1 } : t
          );

          return {
            fieldVisits: state.fieldVisits.map((v) =>
              v.id === visitId
                ? {
                    ...v,
                    status: 'completed' as const,
                    checkOutTime,
                    outcomeNotes,
                    followUpDate,
                    hasSampleGiven: !!sampleGiven,
                    sampleItemGiven: sampleItem || v.sampleItemGiven,
                  }
                : v
            ),
            marketingTargets: updatedTargets,
            auditLogs: [
              {
                id: `aud-${Date.now()}`,
                timestamp: new Date().toISOString(),
                userId: state.currentUser.id,
                userName: state.currentUser.name,
                userRole: state.currentUser.role,
                action: 'FIELD_VISIT_CHECKOUT',
                entityType: 'user',
                entityId: visitId,
                details: `Checked out from ${visit?.locationAddress}. Notes: ${outcomeNotes}`,
                regionId: visit?.regionId,
              },
              ...state.auditLogs,
            ],
          };
        });
      },

      createCustomerLead: (customerData) => {
        const id = `cust-${Date.now()}`;
        const newCustomer: Customer = {
          ...customerData,
          id,
          onboardingDate: new Date().toISOString().split('T')[0],
          status: 'prospect',
        };

        set((state) => {
          // Increment dealer onboarding count in marketing target
          const updatedTargets = state.marketingTargets.map((t) =>
            t.userId === state.currentUser.id ? { ...t, achievedNewDealers: t.achievedNewDealers + 1 } : t
          );

          return {
            customers: [newCustomer, ...state.customers],
            marketingTargets: updatedTargets,
            notifications: [
              {
                id: `notif-${Date.now()}`,
                userId: 'all',
                title: 'New Dealer Prospect Acquired',
                message: `Field rep ${state.currentUser.name} onboarded prospect: ${newCustomer.businessName || newCustomer.name}.`,
                type: 'success',
                read: false,
                createdAt: new Date().toISOString(),
                actionUrl: '/customers',
              },
              ...state.notifications,
            ],
          };
        });
      },

      submitMarketSurvey: (surveyData) => {
        const newSurvey: MarketSurvey = {
          ...surveyData,
          id: `srv-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
        };

        set((state) => ({
          marketSurveys: [newSurvey, ...state.marketSurveys],
          auditLogs: [
            {
              id: `aud-${Date.now()}`,
              timestamp: new Date().toISOString(),
              userId: state.currentUser.id,
              userName: state.currentUser.name,
              userRole: state.currentUser.role,
              action: 'MARKET_SURVEY_LOGGED',
              entityType: 'pricing',
              entityId: newSurvey.dealerName,
              details: `Recorded competitor price observation: ${newSurvey.competitorBrand} (${newSurvey.competitorProduct}) at ₹${newSurvey.competitorPricePerUnit}.`,
              regionId: newSurvey.regionId,
            },
            ...state.auditLogs,
          ],
        }));
      },

      // Expense & Wallet Actions
      submitExpenseClaim: (claimData) => {
        const count = get().expenseClaims.length + 106;
        const claimNumber = `EXP-2026-${count}`;
        const newClaim: ExpenseClaim = {
          ...claimData,
          id: `exp-${Date.now()}`,
          claimNumber,
          status: 'submitted',
          submittedAt: new Date().toISOString(),
        };

        set((state) => ({
          expenseClaims: [newClaim, ...state.expenseClaims],
          notifications: [
            {
              id: `notif-${Date.now()}`,
              userId: 'all',
              title: 'Expense Claim Submitted',
              message: `${state.currentUser.name} submitted ${newClaim.category} expense claim for ₹${newClaim.amount.toLocaleString('en-IN')}.`,
              type: 'info',
              read: false,
              createdAt: new Date().toISOString(),
              actionUrl: '/approvals',
            },
            ...state.notifications,
          ],
        }));
      },

      approveExpenseClaim: (claimId: string) => {
        const state = get();
        const claim = state.expenseClaims.find((c) => c.id === claimId);
        if (!claim) return;

        const targetUser = state.users.find((u) => u.id === claim.userId);
        const newBalance = (targetUser?.walletBalance || 0) - claim.amount;

        const walletTx: WalletTransaction = {
          id: `wtx-${Date.now()}`,
          userId: claim.userId,
          date: new Date().toISOString(),
          type: 'expense_deduction',
          amount: claim.amount,
          balanceAfter: Math.max(0, newBalance),
          referenceType: 'expense_claim',
          referenceId: claim.claimNumber,
          description: `Settlement for approved ${claim.category} expense (${claim.description}).`,
          processedByUserId: state.currentUser.id,
        };

        set({
          expenseClaims: state.expenseClaims.map((c) =>
            c.id === claimId
              ? {
                  ...c,
                  status: 'approved',
                  reviewedByUserId: state.currentUser.id,
                  reviewedByUserName: state.currentUser.name,
                  reviewedAt: new Date().toISOString(),
                  paidAt: new Date().toISOString(),
                }
              : c
          ),
          users: state.users.map((u) =>
            u.id === claim.userId ? { ...u, walletBalance: Math.max(0, newBalance) } : u
          ),
          currentUser:
            state.currentUser.id === claim.userId
              ? { ...state.currentUser, walletBalance: Math.max(0, newBalance) }
              : state.currentUser,
          walletTransactions: [walletTx, ...state.walletTransactions],
          notifications: [
            {
              id: `notif-${Date.now()}`,
              userId: claim.userId,
              title: 'Expense Claim Approved',
              message: `Your ${claim.category} claim (${claim.claimNumber}) for ₹${claim.amount.toLocaleString('en-IN')} has been approved and settled.`,
              type: 'success',
              read: false,
              createdAt: new Date().toISOString(),
              actionUrl: claim.userRole === 'sales' ? '/sales/wallet' : '/marketing/wallet',
            },
            ...state.notifications,
          ],
        });
      },

      rejectExpenseClaim: (claimId: string, reason: string) => {
        const state = get();
        const claim = state.expenseClaims.find((c) => c.id === claimId);
        if (!claim) return;

        set({
          expenseClaims: state.expenseClaims.map((c) =>
            c.id === claimId
              ? {
                  ...c,
                  status: 'rejected',
                  reviewedByUserId: state.currentUser.id,
                  reviewedByUserName: state.currentUser.name,
                  reviewedAt: new Date().toISOString(),
                  rejectionReason: reason,
                }
              : c
          ),
          notifications: [
            {
              id: `notif-${Date.now()}`,
              userId: claim.userId,
              title: 'Expense Claim Rejected',
              message: `Your claim ${claim.claimNumber} was rejected by Admin. Reason: ${reason}`,
              type: 'alert',
              read: false,
              createdAt: new Date().toISOString(),
              actionUrl: claim.userRole === 'sales' ? '/sales/wallet' : '/marketing/wallet',
            },
            ...state.notifications,
          ],
        });
      },

      settleExpenseClaim: (claimId, paymentMethod, transactionReference, settledAmount, notes) => {
        const state = get();
        const claim = state.expenseClaims.find((c) => c.id === claimId);
        if (!claim) return;

        const amountToPay = settledAmount ?? claim.amount;
        const targetUser = state.users.find((u) => u.id === claim.userId);
        let newBalance = targetUser?.walletBalance || 0;

        if (paymentMethod === 'wallet_credit') {
          newBalance += amountToPay;
        }

        const walletTx: WalletTransaction = {
          id: `wtx-${Date.now()}`,
          userId: claim.userId,
          date: new Date().toISOString(),
          type: 'settlement',
          amount: amountToPay,
          balanceAfter: newBalance,
          referenceType: 'settlement',
          referenceId: transactionReference || `SETTLE-${claim.claimNumber}`,
          description: `Direct payout via ${paymentMethod.replace('_', ' ').toUpperCase()} (${notes || 'Field Claim Settlement'}).`,
          processedByUserId: state.currentUser.id,
        };

        set({
          expenseClaims: state.expenseClaims.map((c) =>
            c.id === claimId
              ? {
                  ...c,
                  status: 'paid',
                  paidAt: new Date().toISOString(),
                  paymentMode: paymentMethod,
                  paymentReference: transactionReference,
                  settledByUserId: state.currentUser.id,
                  settledByUserName: state.currentUser.name,
                  settledAmount: amountToPay,
                }
              : c
          ),
          users: state.users.map((u) =>
            u.id === claim.userId ? { ...u, walletBalance: newBalance } : u
          ),
          walletTransactions: [walletTx, ...state.walletTransactions],
          notifications: [
            {
              id: `notif-${Date.now()}`,
              userId: claim.userId,
              title: 'Claim Payment Settled & Reimbursed',
              message: `Your ${claim.category} claim (${claim.claimNumber}) for ₹${amountToPay.toLocaleString('en-IN')} has been settled via ${paymentMethod.replace('_', ' ')}. Ref: ${transactionReference || 'N/A'}.`,
              type: 'success',
              read: false,
              createdAt: new Date().toISOString(),
            },
            ...state.notifications,
          ],
        });
      },

      batchSettleClaims: (claimIds, paymentMethod, transactionReference) => {
        const state = get();
        const now = new Date().toISOString();
        const updatedClaims = state.expenseClaims.map((c) => {
          if (claimIds.includes(c.id)) {
            return {
              ...c,
              status: 'paid' as const,
              paidAt: now,
              paymentMode: paymentMethod,
              paymentReference: transactionReference,
              settledByUserId: state.currentUser.id,
              settledByUserName: state.currentUser.name,
              settledAmount: c.amount,
            };
          }
          return c;
        });

        set({
          expenseClaims: updatedClaims,
          notifications: [
            {
              id: `notif-${Date.now()}`,
              userId: 'usr-admin-1',
              title: 'Batch Claims Settled',
              message: `${claimIds.length} expense claims were successfully settled via ${paymentMethod.replace('_', ' ')}.`,
              type: 'success',
              read: false,
              createdAt: now,
            },
            ...state.notifications,
          ],
        });
      },

      issueWalletAdvance: (userId: string, amount: number, notes: string) => {
        const state = get();
        const targetUser = state.users.find((u) => u.id === userId);
        if (!targetUser) return;

        const newBalance = targetUser.walletBalance + amount;
        const tx: WalletTransaction = {
          id: `wtx-${Date.now()}`,
          userId,
          date: new Date().toISOString(),
          type: 'advance_issued',
          amount,
          balanceAfter: newBalance,
          referenceType: 'admin_advance',
          referenceId: `ADV-${Date.now()}`,
          description: `Company field funds advance: ${notes}`,
          processedByUserId: state.currentUser.id,
        };

        set({
          users: state.users.map((u) => (u.id === userId ? { ...u, walletBalance: newBalance } : u)),
          currentUser:
            state.currentUser.id === userId
              ? { ...state.currentUser, walletBalance: newBalance }
              : state.currentUser,
          walletTransactions: [tx, ...state.walletTransactions],
          notifications: [
            {
              id: `notif-${Date.now()}`,
              userId,
              title: 'Wallet Advance Credited',
              message: `Admin credited ₹${amount.toLocaleString('en-IN')} travel & expense advance to your wallet.`,
              type: 'success',
              read: false,
              createdAt: new Date().toISOString(),
              actionUrl: targetUser.role === 'sales' ? '/sales/wallet' : '/marketing/wallet',
            },
            ...state.notifications,
          ],
        });
      },

      allocateWalletFunds: (userId: string, amount: number, notes: string) => {
        const state = get();
        if (amount <= 0) {
          return { success: false, message: 'Allocation amount must be greater than zero.' };
        }
        const targetUser = state.users.find((u) => u.id === userId);
        if (!targetUser) {
          return { success: false, message: 'Employee user not found.' };
        }

        const newBalance = (targetUser.walletBalance || 0) + amount;
        const txId = `wtx-alloc-${Date.now()}`;
        const refId = `WAL-ALLOC-${Math.floor(1000 + Math.random() * 9000)}`;

        const tx: WalletTransaction = {
          id: txId,
          userId,
          date: new Date().toISOString(),
          type: 'advance_issued',
          amount,
          balanceAfter: newBalance,
          referenceType: 'admin_advance',
          referenceId: refId,
          description: `Admin wallet allocation: ${notes || 'Operational funds allotment'}`,
          processedByUserId: state.currentUser.id,
        };

        set({
          users: state.users.map((u) => (u.id === userId ? { ...u, walletBalance: newBalance } : u)),
          currentUser:
            state.currentUser.id === userId
              ? { ...state.currentUser, walletBalance: newBalance }
              : state.currentUser,
          walletTransactions: [tx, ...state.walletTransactions],
        });

        state.addNotification({
          userId,
          title: `Wallet Funds Allocated: ₹${amount.toLocaleString('en-IN')}`,
          message: `Admin ${state.currentUser.name} allocated ₹${amount.toLocaleString('en-IN')} to your expense wallet. Ref: ${refId}.`,
          type: 'success',
        });

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'WALLET_FUNDS_ALLOCATED',
          entityType: 'wallet',
          entityId: refId,
          details: `Allocated ₹${amount.toLocaleString('en-IN')} to ${targetUser.name} (${targetUser.employeeId || targetUser.role}). New balance: ₹${newBalance.toLocaleString('en-IN')}. Note: ${notes}`,
        });

        return { success: true, message: `Successfully allocated ₹${amount.toLocaleString('en-IN')} to ${targetUser.name}'s wallet.` };
      },

      createCustomerDispatch: (dispatchData) => {
        const state = get();

        // Validation: Verify requested quantity does not exceed accepted available stock for each batch
        for (const item of dispatchData.items) {
          const batch = state.batches.find((b) => b.id === item.batchId);
          if (!batch) {
            return { success: false, message: `Batch ${item.batchNumber} was not found.` };
          }
          if (batch.availableQuantity < item.quantity) {
            return {
              success: false,
              message: `Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.availableQuantity}, requested: ${item.quantity}.`,
            };
          }
        }

        const randNum = Math.floor(1000 + Math.random() * 9000);
        const dispatchNumber = `DSP-2026-${randNum}`;
        const id = `dsp-${Date.now().toString().slice(-4)}`;

        const newDispatch: CustomerDispatch = {
          ...dispatchData,
          id,
          dispatchNumber,
        };

        // Update batch quantities: decrement availableQuantity, increment dispatchedQuantity
        const updatedBatches = state.batches.map((b) => {
          const item = dispatchData.items.find((i) => i.batchId === b.id);
          if (item) {
            return {
              ...b,
              availableQuantity: b.availableQuantity - item.quantity,
              dispatchedQuantity: (b.dispatchedQuantity || 0) + item.quantity,
            };
          }
          return b;
        });

        // Log stock movements for each item
        const movements: StockMovement[] = dispatchData.items.map((item) => ({
          id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          movementType: 'dispatch' as const,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          batchId: item.batchId,
          batchNumber: item.batchNumber,
          regionId: dispatchData.regionId,
          warehouseId: dispatchData.originatingWarehouseId,
          quantity: item.quantity,
          referenceType: 'sales_order' as const,
          referenceId: dispatchNumber,
          performedByUserId: state.currentUser.id,
          performedByUserName: state.currentUser.name,
          remarks: `Customer dispatch ${dispatchNumber} to ${dispatchData.customerName} (${item.quantity} ${item.unit}) from batch ${item.batchNumber}.`,
        }));

        // Update sales order status if matching
        const updatedOrders = state.salesOrders.map((so) => {
          if (so.id === dispatchData.salesOrderId || so.orderNumber === dispatchData.orderNumber) {
            return {
              ...so,
              status: 'dispatched' as const,
              trackingNumber: dispatchData.trackingNumber,
            };
          }
          return so;
        });

        set({
          customerDispatches: [newDispatch, ...state.customerDispatches],
          batches: updatedBatches,
          stockMovements: [...movements, ...state.stockMovements],
          salesOrders: updatedOrders,
        });

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'CUSTOMER_DISPATCH_CREATED',
          entityType: 'dispatch',
          entityId: dispatchNumber,
          details: `Dispatched ${dispatchData.items.reduce((acc, i) => acc + i.quantity, 0)} units to ${dispatchData.customerName} under ${dispatchNumber} via ${dispatchData.transporterName || 'carrier'}.`,
        });

        state.addNotification({
          userId: 'role:admin',
          title: `Outward Dispatch: ${dispatchNumber}`,
          message: `Storekeeper ${dispatchData.assignedStorekeeperName || state.currentUser.name} issued outward dispatch ${dispatchNumber} for ${dispatchData.customerName}.`,
          type: 'success',
        });

        return { success: true, dispatch: newDispatch, message: `Dispatch ${dispatchNumber} created successfully.` };
      },

      updateCustomerDispatchStatus: (id, status, notes) => {
        const state = get();
        const dispatch = state.customerDispatches.find((d) => d.id === id || d.dispatchNumber === id);
        if (!dispatch) return;

        set({
          customerDispatches: state.customerDispatches.map((d) =>
            d.id === id || d.dispatchNumber === id
              ? { ...d, deliveryStatus: status, notes: notes ? `${d.notes ? `${d.notes} | ` : ''}${notes}` : d.notes }
              : d
          ),
        });

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'CUSTOMER_DISPATCH_STATUS_UPDATED',
          entityType: 'dispatch',
          entityId: dispatch.dispatchNumber,
          details: `Updated dispatch ${dispatch.dispatchNumber} status to '${status}'. ${notes || ''}`,
        });
      },

      addDispatchDeliveryExpense: (dispatchId, expense) => {
        const state = get();
        const dispatch = state.customerDispatches.find((d) => d.id === dispatchId || d.dispatchNumber === dispatchId);
        if (!dispatch) return;

        const claimId = `exp-dsp-${Date.now().toString().slice(-4)}`;
        const claimNumber = `EXP-DSP-${Math.floor(1000 + Math.random() * 9000)}`;

        const newClaim: ExpenseClaim = {
          id: claimId,
          claimNumber,
          userId: expense.paidByUserId,
          userName: expense.paidByUserName,
          userRole: state.currentUser.role,
          regionId: dispatch.regionId,
          date: new Date().toISOString().split('T')[0],
          category: expense.category,
          amount: expense.amount,
          description: expense.description,
          status: 'approved',
          submittedAt: new Date().toISOString(),
          reviewedByUserId: state.currentUser.id,
          reviewedByUserName: state.currentUser.name,
          reviewedAt: new Date().toISOString(),
          linkedDispatchId: dispatch.id,
          linkedOrderId: dispatch.salesOrderId,
          linkedCustomerId: dispatch.customerId,
          proofType: expense.proofType || 'receipt',
          proofUrl: expense.proofUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
          receiptAttachment: expense.receiptAttachment || 'dispatch_delivery_voucher.pdf',
        };

        const updatedDispatches = state.customerDispatches.map((d) =>
          d.id === dispatch.id
            ? { ...d, totalDeliveryExpenses: (d.totalDeliveryExpenses || 0) + expense.amount }
            : d
        );

        set({
          expenseClaims: [newClaim, ...state.expenseClaims],
          customerDispatches: updatedDispatches,
        });

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'DISPATCH_DELIVERY_EXPENSE_RECORDED',
          entityType: 'expense',
          entityId: claimNumber,
          details: `Recorded ₹${expense.amount} delivery expense (${expense.category}) for dispatch ${dispatch.dispatchNumber}.`,
        });
      },

      // Policy & Target Controls
      setUserDiscountLimit: (userId, maxDiscountPercent) => {
        set((state) => ({
          users: state.users.map((u) => (u.id === userId ? { ...u, maxDiscountPercent } : u)),
          currentUser:
            state.currentUser.id === userId
              ? { ...state.currentUser, maxDiscountPercent }
              : state.currentUser,
        }));
      },

      setUserSalesTarget: (userId, targetAmount) => {
        set((state) => ({
          salesTargets: state.salesTargets.map((t) => (t.userId === userId ? { ...t, targetAmount } : t)),
          users: state.users.map((u) => (u.id === userId ? { ...u, monthlySalesTarget: targetAmount } : u)),
        }));
      },

      assignSalesTarget: (targetData) => {
        const state = get();
        const existingIdx = state.salesTargets.findIndex(
          (t) => t.userId === targetData.userId && t.period === targetData.period
        );

        if (existingIdx >= 0) {
          const updated = [...state.salesTargets];
          updated[existingIdx] = { ...updated[existingIdx], ...targetData };
          set({
            salesTargets: updated,
            users: state.users.map((u) =>
              u.id === targetData.userId ? { ...u, monthlySalesTarget: targetData.targetAmount } : u
            ),
          });
        } else {
          const newTarget: SalesTarget = {
            ...targetData,
            id: `stg-${Date.now()}`,
          };
          set({
            salesTargets: [newTarget, ...state.salesTargets],
            users: state.users.map((u) =>
              u.id === targetData.userId ? { ...u, monthlySalesTarget: targetData.targetAmount } : u
            ),
          });
        }

        get().addNotification({
          type: 'success',
          title: 'Sales Quota Assigned',
          message: `Sales quota of ₹${targetData.targetAmount.toLocaleString('en-IN')} assigned to ${targetData.userName} for ${targetData.period}.`,
          userId: 'usr-admin-1',
        });
      },

      assignMarketingTarget: (targetData) => {
        const state = get();
        const existingIdx = state.marketingTargets.findIndex(
          (t) => t.userId === targetData.userId && t.period === targetData.period
        );

        if (existingIdx >= 0) {
          const updated = [...state.marketingTargets];
          updated[existingIdx] = { ...updated[existingIdx], ...targetData };
          set({
            marketingTargets: updated,
            users: state.users.map((u) =>
              u.id === targetData.userId ? { ...u, monthlyVisitTarget: targetData.targetVisits } : u
            ),
          });
        } else {
          const newTarget: MarketingTarget = {
            ...targetData,
            id: `mtg-${Date.now()}`,
          };
          set({
            marketingTargets: [newTarget, ...state.marketingTargets],
            users: state.users.map((u) =>
              u.id === targetData.userId ? { ...u, monthlyVisitTarget: targetData.targetVisits } : u
            ),
          });
        }

        get().addNotification({
          type: 'success',
          title: 'Marketing Target Assigned',
          message: `Monthly field visit target (${targetData.targetVisits} visits) assigned to ${targetData.userName} for ${targetData.period}.`,
          userId: 'usr-admin-1',
        });
      },

      updateBatchDiscount: (batchId, clearanceDiscountPercent) => {
        set((state) => ({
          batches: state.batches.map((b) =>
            b.id === batchId ? { ...b, clearanceDiscountPercent } : b
          ),
        }));
        get().addNotification({
          type: 'info',
          title: 'Batch Discount Updated',
          message: `Batch discount policy updated to ${clearanceDiscountPercent}% clearance markdown.`,
          userId: 'all',
        });
      },

      applySmartDiscount: ({ targetType, targetIds, discountPercent, reason, validUntil }) => {
        const state = get();
        if (targetType === 'batch') {
          set({
            batches: state.batches.map((b) =>
              targetIds.includes(b.id)
                ? {
                    ...b,
                    clearanceDiscountPercent: discountPercent,
                    discountReason: reason,
                    discountValidUntil: validUntil,
                  }
                : b
            ),
          });
          state.addNotification({
            type: 'success',
            title: 'Smart Batch Markdown Applied',
            message: `Applied ${discountPercent}% clearance discount across ${targetIds.length} batch(es) for: ${reason}.`,
            userId: 'all',
          });
          state.addAuditLog({
            userId: state.currentUser.id,
            userName: state.currentUser.name,
            userRole: state.currentUser.role,
            action: 'DISCOUNT_MATRIX_UPDATED',
            entityType: 'batch',
            entityId: targetIds.join(', '),
            details: `Smart markdown of ${discountPercent}% assigned to ${targetIds.length} batch(es). Campaign: ${reason}.`,
          });
        } else {
          set({
            products: state.products.map((p) =>
              targetIds.includes(p.id)
                ? {
                    ...p,
                    promotionalDiscountPercent: discountPercent,
                    discountReason: reason,
                    discountValidUntil: validUntil,
                  }
                : p
            ),
          });
          state.addNotification({
            type: 'success',
            title: 'Smart Product Promotion Activated',
            message: `Activated ${discountPercent}% promotional discount across ${targetIds.length} product(s) for: ${reason}.`,
            userId: 'all',
          });
          state.addAuditLog({
            userId: state.currentUser.id,
            userName: state.currentUser.name,
            userRole: state.currentUser.role,
            action: 'DISCOUNT_MATRIX_UPDATED',
            entityType: 'product',
            entityId: targetIds.join(', '),
            details: `Smart promotional discount of ${discountPercent}% applied to ${targetIds.length} product(s). Campaign: ${reason}.`,
          });
        }
      },

      addUser: (userData) => {
        const state = get();
        const currentOrg = state.currentOrganization;
        const targetTeamId = userData.teamId || currentOrg?.teamId || 'APEX-2026';
        const matchedOrg = state.organizations.find((o) => o.teamId === targetTeamId) || currentOrg;
        const orgUsers = state.users.filter((u) => (u.teamId || 'APEX-2026') === targetTeamId);
        const maxAllowed = matchedOrg?.maxEmployees || 999;

        if (orgUsers.length >= maxAllowed) {
          state.addNotification({
            type: 'alert',
            title: 'Plan Quota Exceeded',
            message: `Cannot register user ${userData.name}. Organization "${matchedOrg?.name}" has reached its limit of ${maxAllowed} members on the ${matchedOrg?.plan} plan. Upgrade your plan to add more personnel.`,
            userId: 'all',
          });
          return;
        }

        const newId = `usr-${Date.now()}`;
        const newUser: User = {
          ...userData,
          id: newId,
          teamId: targetTeamId,
          organizationId: userData.organizationId || matchedOrg?.id || 'org-apex',
          status: userData.status || 'active',
          avatar: userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        };
        set((prev) => ({
          users: [newUser, ...prev.users],
        }));
        state.addNotification({
          type: 'success',
          title: 'New User Registered',
          message: `User ${newUser.name} assigned role "${newUser.role}" in Team ${newUser.teamId} (${orgUsers.length + 1}/${maxAllowed} seats used).`,
          userId: 'usr-admin-1',
        });
      },

      updateUser: (id, updates) => {
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
          currentUser: state.currentUser.id === id ? { ...state.currentUser, ...updates } : state.currentUser,
        }));
      },

      addRegion: (regionData) => {
        const state = get();
        const currentOrg = state.currentOrganization;
        const maxRegions = currentOrg?.maxRegions || 999;

        if (state.regions.length >= maxRegions) {
          state.addNotification({
            type: 'alert',
            title: 'Territory Limit Reached',
            message: `Cannot establish new region. Your ${currentOrg?.plan} plan allows up to ${maxRegions} territories. Please upgrade your subscription to expand coverage.`,
            userId: 'all',
          });
          return;
        }

        const newId = `reg-${Date.now()}`;
        const newRegion: Region = {
          ...regionData,
          id: newId,
          activeWarehousesCount: 0,
        };
        set((prev) => ({
          regions: [...prev.regions, newRegion],
        }));
        state.addNotification({
          type: 'success',
          title: 'New Region Established',
          message: `Territory "${newRegion.name}" added to enterprise operational matrix (${state.regions.length + 1}/${maxRegions} active).`,
          userId: 'usr-admin-1',
        });
      },

      addWarehouse: (warehouseData) => {
        const state = get();
        const currentOrg = state.currentOrganization;
        const maxWarehouses = currentOrg?.maxWarehouses || 999;

        if (state.warehouses.length >= maxWarehouses) {
          state.addNotification({
            type: 'alert',
            title: 'Depot Limit Reached',
            message: `Cannot commission warehouse. Your ${currentOrg?.plan} plan allows a maximum of ${maxWarehouses} depots. Upgrade your subscription to add more warehouse hubs.`,
            userId: 'all',
          });
          return;
        }

        const newId = `wh-${Date.now()}`;
        const newWarehouse: Warehouse = {
          ...warehouseData,
          id: newId,
          locations: [
            { id: `loc-${newId}-1`, warehouseId: newId, code: 'Zone-A-Rack-01', zone: 'Primary Fast Pick' },
            { id: `loc-${newId}-2`, warehouseId: newId, code: 'Zone-B-Bay-04', zone: 'Bulk Pallet Storage' },
          ],
        };
        set((prev) => ({
          warehouses: [...prev.warehouses, newWarehouse],
          regions: prev.regions.map((r) =>
            r.id === warehouseData.regionId
              ? { ...r, activeWarehousesCount: (r.activeWarehousesCount || 0) + 1 }
              : r
          ),
        }));
        state.addNotification({
          type: 'success',
          title: 'New Warehouse Commissioned',
          message: `Warehouse "${newWarehouse.name}" commissioned under region ${warehouseData.regionId} (${state.warehouses.length + 1}/${maxWarehouses} depots used).`,
          userId: 'usr-admin-1',
        });
      },

      // Quotation Management Actions
      assignQuotation: (quotationId: string, salesUserId: string, notes?: string) => {
        const salesUser = get().users.find((u) => u.id === salesUserId);
        const quote = get().quotations.find((q) => q.id === quotationId);
        if (!quote) return;

        const assignedName = salesUser ? salesUser.name : 'Unassigned';
        const now = new Date().toISOString();

        set((state) => ({
          quotations: state.quotations.map((q) =>
            q.id === quotationId
              ? {
                  ...q,
                  assignedSalesUserId: salesUserId,
                  assignedSalesUserName: assignedName,
                  status: q.status === 'Unassigned' ? 'Draft' : q.status,
                  notes: notes ? `${q.notes ? q.notes + ' | ' : ''}Assigned Note: ${notes}` : q.notes,
                  assignedAt: now,
                  assignedByUserId: state.currentUser.id,
                }
              : q
          ),
        }));

        if (salesUser) {
          get().addNotification({
            userId: salesUser.id,
            title: `Quotation Assigned: ${quote.quotationNo}`,
            message: `Quotation from sender ${quote.senderName} (${quote.senderCompany}) worth ₹${quote.grandTotal.toLocaleString('en-IN')} assigned to you.`,
            type: 'info',
            actionUrl: `/admin/quotations`,
          });
        }

        get().addAuditLog({
          userId: get().currentUser.id,
          userName: get().currentUser.name,
          userRole: get().currentRole,
          action: 'QUOTATION_ASSIGNED',
          entityType: 'quotation',
          entityId: quote.quotationNo,
          details: `Quotation ${quote.quotationNo} from sender "${quote.senderName}" assigned to Sales Rep ${assignedName}.`,
          regionId: quote.regionId,
        });
      },

      batchAssignQuotationsBySender: (senderName: string, salesUserId: string, notes?: string) => {
        const salesUser = get().users.find((u) => u.id === salesUserId);
        const assignedName = salesUser ? salesUser.name : 'Unassigned';
        const now = new Date().toISOString();

        let affectedCount = 0;
        set((state) => ({
          quotations: state.quotations.map((q) => {
            if (q.senderName.trim().toLowerCase() === senderName.trim().toLowerCase()) {
              affectedCount++;
              return {
                ...q,
                assignedSalesUserId: salesUserId,
                assignedSalesUserName: assignedName,
                status: q.status === 'Unassigned' ? 'Draft' : q.status,
                notes: notes ? `${q.notes ? q.notes + ' | ' : ''}Sender Batch Assign: ${notes}` : q.notes,
                assignedAt: now,
                assignedByUserId: state.currentUser.id,
              };
            }
            return q;
          }),
        }));

        if (salesUser && affectedCount > 0) {
          get().addNotification({
            userId: salesUser.id,
            title: `Batch Quotations Assigned: ${senderName}`,
            message: `${affectedCount} quotations from sender ${senderName} allocated to your portfolio.`,
            type: 'info',
            actionUrl: `/admin/quotations`,
          });
        }

        get().addAuditLog({
          userId: get().currentUser.id,
          userName: get().currentUser.name,
          userRole: get().currentRole,
          action: 'BATCH_QUOTATIONS_ASSIGNED_BY_SENDER',
          entityType: 'quotation',
          entityId: `SENDER-${senderName.toUpperCase().replace(/\s+/g, '_')}`,
          details: `Batch assigned ${affectedCount} quotation(s) from sender "${senderName}" to Sales Rep ${assignedName}.`,
        });
      },

      createQuotation: (quotationData) => {
        const quoteId = `qt-2026-${Date.now().toString().slice(-4)}`;
        const quoteNo = `QT-2026-${Math.floor(100 + Math.random() * 900)}`;
        const now = new Date().toISOString();

        const newQuote: Quotation = {
          ...quotationData,
          id: quoteId,
          quotationNo: quoteNo,
          createdDate: now.split('T')[0],
          status: quotationData.assignedSalesUserId ? 'Draft' : 'Unassigned',
        };

        set((state) => ({
          quotations: [newQuote, ...state.quotations],
        }));

        if (newQuote.assignedSalesUserId) {
          get().addNotification({
            userId: newQuote.assignedSalesUserId,
            title: `New Quotation Assigned: ${quoteNo}`,
            message: `New inward quotation from ${newQuote.senderName} (${newQuote.senderCompany}) assigned to you.`,
            type: 'info',
            actionUrl: `/admin/quotations`,
          });
        }

        get().addAuditLog({
          userId: get().currentUser.id,
          userName: get().currentUser.name,
          userRole: get().currentRole,
          action: 'QUOTATION_CREATED',
          entityType: 'quotation',
          entityId: quoteNo,
          details: `Created quotation ${quoteNo} for sender "${newQuote.senderName}" (${newQuote.senderCompany}) value ₹${newQuote.grandTotal.toLocaleString('en-IN')}`,
          regionId: newQuote.regionId,
        });
      },

      updateQuotationStatus: (quotationId: string, status: Quotation['status']) => {
        set((state) => ({
          quotations: state.quotations.map((q) =>
            q.id === quotationId ? { ...q, status } : q
          ),
        }));
      },

      // Remittance & Collection Ledger Actions
      verifyRemittance: (id: string, notes?: string) => {
        const entry = get().salesRemittances.find((r) => r.id === id);
        if (!entry) return;

        const now = new Date().toISOString();
        const adminUser = get().currentUser;

        set((state) => ({
          salesRemittances: state.salesRemittances.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'verified',
                  verifiedByUserId: adminUser.id,
                  verifiedByUserName: adminUser.name,
                  verifiedAt: now,
                  notes: notes ? `${r.notes ? r.notes + ' | ' : ''}Verification Note: ${notes}` : r.notes,
                }
              : r
          ),
        }));

        get().addNotification({
          userId: entry.salesUserId,
          title: `Remittance Verified: ${entry.entryNumber}`,
          message: `Your company remittance of ₹${entry.amount.toLocaleString('en-IN')} has been verified and officially credited.`,
          type: 'success',
          actionUrl: `/admin/sales-ledger`,
        });

        get().addAuditLog({
          userId: adminUser.id,
          userName: adminUser.name,
          userRole: get().currentRole,
          action: 'REMITTANCE_VERIFIED',
          entityType: 'remittance',
          entityId: entry.entryNumber,
          details: `Verified payment remittance ${entry.entryNumber} of ₹${entry.amount.toLocaleString('en-IN')} submitted by ${entry.salesUserName}.`,
          regionId: entry.regionId,
        });
      },

      flagRemittanceDiscrepancy: (id: string, reason: string) => {
        const entry = get().salesRemittances.find((r) => r.id === id);
        if (!entry) return;

        set((state) => ({
          salesRemittances: state.salesRemittances.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'discrepancy',
                  discrepancyReason: reason,
                }
              : r
          ),
        }));

        get().addNotification({
          userId: entry.salesUserId,
          title: `Remittance Discrepancy: ${entry.entryNumber}`,
          message: `Action required for payment ${entry.entryNumber}: ${reason}`,
          type: 'alert',
          actionUrl: `/admin/sales-ledger`,
        });

        get().addAuditLog({
          userId: get().currentUser.id,
          userName: get().currentUser.name,
          userRole: get().currentRole,
          action: 'REMITTANCE_DISCREPANCY_FLAGGED',
          entityType: 'remittance',
          entityId: entry.entryNumber,
          details: `Flagged discrepancy on remittance ${entry.entryNumber} for ${entry.salesUserName}: ${reason}`,
          regionId: entry.regionId,
        });
      },

      addRemittanceEntry: (entryData) => {
        const isRemit = entryData.type === 'remittance_to_company';
        const prefix = isRemit ? 'REM' : 'COL';
        const entryNum = `${prefix}-2026-${Math.floor(100 + Math.random() * 900)}`;
        const newId = `rem-${Date.now().toString().slice(-4)}`;

        const newEntry: SalesRemittanceEntry = {
          ...entryData,
          id: newId,
          entryNumber: entryNum,
        };

        set((state) => ({
          salesRemittances: [newEntry, ...state.salesRemittances],
        }));

        get().addAuditLog({
          userId: get().currentUser.id,
          userName: get().currentUser.name,
          userRole: get().currentRole,
          action: isRemit ? 'COMPANY_REMITTANCE_RECORDED' : 'CUSTOMER_COLLECTION_RECORDED',
          entityType: 'remittance',
          entityId: entryNum,
          details: `Recorded ${entryData.type} of ₹${entryData.amount.toLocaleString('en-IN')} for sales person ${entryData.salesUserName}. Reference: ${entryData.referenceNumber}`,
          regionId: entryData.regionId,
        });
      },

      // Notifications & Audit
      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
      },

      markAllNotificationsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      addNotification: (notif) => {
        set((state) => ({
          notifications: [
            {
              ...notif,
              id: `notif-${Date.now()}`,
              createdAt: new Date().toISOString(),
              read: false,
            },
            ...state.notifications,
          ],
        }));
      },

      addAuditLog: (log) => {
        set((state) => ({
          auditLogs: [
            {
              ...log,
              id: `aud-${Date.now()}`,
              timestamp: new Date().toISOString(),
            },
            ...state.auditLogs,
          ],
        }));
      },

      // Theme Management
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        if (typeof window !== 'undefined') {
          localStorage.setItem('apex_erp_theme', next);
          if (next === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
        set({ theme: next });
      },

      setTheme: (theme: 'light' | 'dark') => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('apex_erp_theme', theme);
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
        set({ theme });
      },

      // Attendance & Leave Actions
      approveLeaveRequest: (leaveId, comment) => {
        const state = get();
        const targetReq = state.leaveRequests.find((r) => r.id === leaveId);
        if (!targetReq) return;

        const nowStr = new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const updatedRequests = state.leaveRequests.map((r) =>
          r.id === leaveId
            ? {
                ...r,
                status: 'approved' as const,
                decision: {
                  decidedBy: `${state.currentUser.name} (Admin)`,
                  decidedAt: nowStr,
                  status: 'approved' as const,
                  comment: comment || 'Approved by Executive Administration.',
                },
              }
            : r
        );

        // Synchronize with attendance records for the dates of the leave
        const updatedAttendance = state.attendanceRecords.map((att) => {
          if (att.userId === targetReq.userId || att.employeeId === targetReq.employeeId) {
            if (att.date >= targetReq.startDate && att.date <= targetReq.endDate) {
              return {
                ...att,
                status: 'on_leave' as const,
                linkedLeaveId: leaveId,
                notes: `On Approved ${targetReq.leaveType} (${targetReq.startDate} – ${targetReq.endDate})`,
              };
            }
          }
          return att;
        });

        set({
          leaveRequests: updatedRequests,
          attendanceRecords: updatedAttendance,
        });

        state.addNotification({
          title: `Leave Request Approved: ${targetReq.employeeName}`,
          message: `${targetReq.leaveType} for ${targetReq.employeeName} (${targetReq.durationDays} days) has been approved.`,
          userId: 'all',
          type: 'success',
        });

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'LEAVE_REQUEST_APPROVED',
          entityType: 'user',
          entityId: leaveId,
          details: `Approved ${targetReq.leaveType} for ${targetReq.employeeName} (${targetReq.startDate} to ${targetReq.endDate}, ${targetReq.durationDays} days). Note: ${comment || 'No comment'}`,
        });
      },

      rejectLeaveRequest: (leaveId, comment) => {
        const state = get();
        const targetReq = state.leaveRequests.find((r) => r.id === leaveId);
        if (!targetReq) return;

        const nowStr = new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const updatedRequests = state.leaveRequests.map((r) =>
          r.id === leaveId
            ? {
                ...r,
                status: 'rejected' as const,
                decision: {
                  decidedBy: `${state.currentUser.name} (Admin)`,
                  decidedAt: nowStr,
                  status: 'rejected' as const,
                  comment: comment || 'Declined due to operational coverage requirements.',
                },
              }
            : r
        );

        // If previously linked to this leave, revert status back to present
        const updatedAttendance = state.attendanceRecords.map((att) => {
          if (att.linkedLeaveId === leaveId) {
            return {
              ...att,
              status: 'present' as const,
              linkedLeaveId: undefined,
              notes: 'Leave request rejected by administration.',
            };
          }
          return att;
        });

        set({
          leaveRequests: updatedRequests,
          attendanceRecords: updatedAttendance,
        });

        state.addNotification({
          title: `Leave Request Declined: ${targetReq.employeeName}`,
          message: `${targetReq.leaveType} for ${targetReq.employeeName} was declined. Reason: ${comment || 'Operational coverage'}`,
          userId: 'all',
          type: 'warning',
        });

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'LEAVE_REQUEST_REJECTED',
          entityType: 'user',
          entityId: leaveId,
          details: `Declined ${targetReq.leaveType} for ${targetReq.employeeName}. Reason: ${comment || 'Operational constraints'}`,
        });
      },

      submitLeaveRequest: (reqData) => {
        const state = get();
        const randId = `LV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
        const todayStr = new Date().toISOString().split('T')[0];

        const newLeave: LeaveRequest = {
          ...reqData,
          id: randId,
          submittedAt: todayStr,
          status: 'pending',
        };

        set({
          leaveRequests: [newLeave, ...state.leaveRequests],
        });

        state.addNotification({
          title: `New Leave Request Submitted`,
          message: `${newLeave.employeeName} requested ${newLeave.durationDays} days ${newLeave.leaveType}.`,
          userId: 'all',
          type: 'info',
        });
      },

      markAttendancePunch: (punchData) => {
        const state = get();
        const randId = `att-${Date.now().toString().slice(-6)}`;
        const newRecord: EmployeeAttendanceRecord = {
          ...punchData,
          id: randId,
        };

        const existingIdx = state.attendanceRecords.findIndex(
          (r) => r.userId === punchData.userId && r.date === punchData.date
        );

        let nextRecords: EmployeeAttendanceRecord[];
        if (existingIdx >= 0) {
          nextRecords = [...state.attendanceRecords];
          nextRecords[existingIdx] = newRecord;
        } else {
          nextRecords = [newRecord, ...state.attendanceRecords];
        }

        set({
          attendanceRecords: nextRecords,
        });
      },

      updatePlanOfAction: (recordId, updates) => {
        const state = get();
        const updated = state.attendanceRecords.map((r) => {
          if (r.id === recordId) {
            return {
              ...r,
              ...updates,
            };
          }
          return r;
        });
        set({ attendanceRecords: updated });
      },

      togglePoaItem: (recordId, itemId) => {
        const state = get();
        const updated = state.attendanceRecords.map((r) => {
          if (r.id === recordId) {
            const items = (r.planOfActionItems || []).map((it) =>
              it.id === itemId ? { ...it, completed: !it.completed } : it
            );
            const total = items.length;
            const completedCount = items.filter((it) => it.completed).length;
            const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;
            const status: EmployeeAttendanceRecord['planStatus'] =
              progress === 100
                ? 'completed'
                : progress > 0
                ? 'in_progress'
                : 'planned';

            return {
              ...r,
              planOfActionItems: items,
              poaProgressPercent: progress,
              planStatus: status,
            };
          }
          return r;
        });
        set({ attendanceRecords: updated });
      },

      // Role Queries & Helpdesk Chat Actions
      addRoleQuery: (queryData) => {
        const state = get();
        const randNum = Math.floor(10 + Math.random() * 90);
        const ticketNo = `QRY-${new Date().getFullYear()}-0${randNum}`;
        const newTicketId = `qry-${Date.now().toString().slice(-6)}`;
        const nowIso = new Date().toISOString();
        const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today';

        const initialMsg: ChatMessage = {
          id: `msg-${Date.now()}-1`,
          senderId: state.currentUser.id,
          senderName: state.currentUser.name,
          senderRole: state.currentUser.role,
          senderAvatar: state.currentUser.avatar,
          message: queryData.initialMessage,
          timestamp: timeFormatted,
        };

        const newTicket: RoleQueryTicket = {
          id: newTicketId,
          ticketNo,
          title: queryData.title,
          category: queryData.category,
          priority: queryData.priority,
          status: 'open',
          requesterId: state.currentUser.id,
          requesterName: state.currentUser.name,
          requesterRole: state.currentUser.role,
          requesterDepartment: state.currentUser.department || 'Operations',
          requesterAvatar: state.currentUser.avatar,
          assignedToId: 'usr-admin-01',
          assignedToName: 'Rajesh Verma (Managing Director)',
          createdAt: nowIso,
          updatedAt: nowIso,
          referenceId: queryData.referenceId,
          referenceType: queryData.referenceType,
          messages: [initialMsg],
        };

        set({
          roleQueries: [newTicket, ...(state.roleQueries || [])],
        });

        state.addNotification({
          title: `New Query Raised: ${ticketNo}`,
          message: `${state.currentUser.name} (${state.currentUser.role.toUpperCase()}) raised: "${queryData.title}"`,
          userId: 'all',
          type: 'info',
        });

        return newTicket;
      },

      addChatMessage: (ticketId, messageText, isInternalNote, attachmentName) => {
        const state = get();
        const nowIso = new Date().toISOString();
        const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today';

        const newMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          senderId: state.currentUser.id,
          senderName: state.currentUser.name,
          senderRole: state.currentUser.role,
          senderAvatar: state.currentUser.avatar,
          message: messageText,
          timestamp: timeFormatted,
          isInternalNote: Boolean(isInternalNote),
          attachmentName,
        };

        const updatedQueries = (state.roleQueries || []).map((t) => {
          if (t.id === ticketId) {
            return {
              ...t,
              status: t.status === 'open' && (state.currentUser.role === 'admin' || state.currentUser.role === 'manager')
                ? ('in_progress' as const)
                : t.status,
              updatedAt: nowIso,
              messages: [...t.messages, newMsg],
            };
          }
          return t;
        });

        set({ roleQueries: updatedQueries });
      },

      updateQueryStatus: (ticketId, newStatus) => {
        const state = get();
        const nowIso = new Date().toISOString();
        const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today';

        const updatedQueries = (state.roleQueries || []).map((t) => {
          if (t.id === ticketId) {
            const systemMsg: ChatMessage = {
              id: `sys-${Date.now()}`,
              senderId: 'system',
              senderName: 'System Gate',
              senderRole: 'admin',
              senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
              message: `Status updated to "${newStatus.replace('_', ' ').toUpperCase()}" by ${state.currentUser.name} (${state.currentUser.role.toUpperCase()}).`,
              timestamp: timeFormatted,
              isInternalNote: true,
            };

            return {
              ...t,
              status: newStatus,
              updatedAt: nowIso,
              messages: [...t.messages, systemMsg],
            };
          }
          return t;
        });

        set({ roleQueries: updatedQueries });

        state.addNotification({
          title: `Query Status Updated`,
          message: `Ticket status set to ${newStatus.replace('_', ' ')} by ${state.currentUser.name}.`,
          userId: 'all',
          type: 'info',
        });
      },

      assignQuery: (ticketId, assignedToId, assignedToName) => {
        const state = get();
        const nowIso = new Date().toISOString();
        const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today';

        const updatedQueries = (state.roleQueries || []).map((t) => {
          if (t.id === ticketId) {
            const systemMsg: ChatMessage = {
              id: `sys-${Date.now()}`,
              senderId: 'system',
              senderName: 'System Gate',
              senderRole: 'admin',
              senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
              message: `Ticket assigned to ${assignedToName} by ${state.currentUser.name}.`,
              timestamp: timeFormatted,
              isInternalNote: true,
            };

            return {
              ...t,
              assignedToId,
              assignedToName,
              updatedAt: nowIso,
              messages: [...t.messages, systemMsg],
            };
          }
          return t;
        });

        set({ roleQueries: updatedQueries });
      },

      // Supplier & Purchasing Actions
      createSupplier: (supplierData) => {
        const id = `sup-${Date.now().toString().slice(-4)}`;
        const newSupplier: Supplier = {
          ...supplierData,
          id,
          createdAt: new Date().toISOString().split('T')[0],
          totalPurchasesAmount: 0,
          outstandingPayable: 0,
        };
        set((state) => ({ suppliers: [newSupplier, ...state.suppliers] }));
        get().addAuditLog({
          userId: get().currentUser.id,
          userName: get().currentUser.name,
          userRole: get().currentRole,
          action: 'SUPPLIER_CREATED',
          entityType: 'supplier',
          entityId: id,
          details: `Provisioned vendor supplier account: ${newSupplier.name} (${newSupplier.code})`,
        });
        return newSupplier;
      },

      updateSupplier: (id, updates) => {
        set((state) => ({
          suppliers: state.suppliers.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        }));
        get().addAuditLog({
          userId: get().currentUser.id,
          userName: get().currentUser.name,
          userRole: get().currentRole,
          action: 'SUPPLIER_UPDATED',
          entityType: 'supplier',
          entityId: id,
          details: `Updated supplier profile fields for ID ${id}`,
        });
      },

      createPurchaseOrder: (poData) => {
        const randNum = Math.floor(1000 + Math.random() * 9000);
        const poNumber = `PO-2026-${randNum}`;
        const id = `po-${Date.now().toString().slice(-4)}`;
        const newPo: PurchaseOrder = {
          ...poData,
          id,
          poNumber,
        };
        set((state) => ({ purchaseOrders: [newPo, ...state.purchaseOrders] }));
        get().addAuditLog({
          userId: get().currentUser.id,
          userName: get().currentUser.name,
          userRole: get().currentRole,
          action: 'PURCHASE_ORDER_CREATED',
          entityType: 'purchase_order',
          entityId: poNumber,
          details: `Generated Purchase Order ${poNumber} for vendor ${newPo.supplierName} with total cost ₹${(newPo.totalCost || newPo.totalAmount || 0).toLocaleString('en-IN')}`,
          regionId: newPo.destinationRegionId,
        });
        return newPo;
      },

      updatePurchaseOrderStatus: (id, status) => {
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((po) =>
            po.id === id || po.poNumber === id ? { ...po, status } : po
          ),
        }));
      },

      approvePurchaseOrder: (poId, approverName, notes) => {
        const state = get();
        const po = state.purchaseOrders.find((p) => p.id === poId || p.poNumber === poId);
        if (!po) return;

        const now = new Date().toISOString();
        const historyEntry = {
          date: now,
          action: 'Order Approved',
          performedBy: approverName || state.currentUser.name,
          notes: notes || 'Purchase order approved by Admin; authorized for vendor dispatch.',
        };

        set({
          purchaseOrders: state.purchaseOrders.map((p) =>
            p.id === po.id
              ? {
                  ...p,
                  status: 'approved' as const,
                  approvedByUserId: state.currentUser.id,
                  approvedByUserName: approverName || state.currentUser.name,
                  approvedAt: now,
                  activityHistory: [...(p.activityHistory || []), historyEntry],
                }
              : p
          ),
        });

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'PURCHASE_ORDER_APPROVED',
          entityType: 'purchase_order',
          entityId: po.poNumber,
          details: `Approved Purchase Order ${po.poNumber} for ${po.supplierName} (Total: ₹${(po.totalCost || 0).toLocaleString('en-IN')}).`,
        });

        state.addNotification({
          userId: po.assignedStorekeeperId || 'role:store_manager',
          title: `PO Approved: ${po.poNumber}`,
          message: `Purchase Order ${po.poNumber} for ${po.supplierName} was approved. Awaiting inward arrival.`,
          type: 'info',
        });
      },

      rejectPurchaseOrder: (poId, approverName, reason) => {
        const state = get();
        const po = state.purchaseOrders.find((p) => p.id === poId || p.poNumber === poId);
        if (!po) return;

        const now = new Date().toISOString();
        const historyEntry = {
          date: now,
          action: 'Order Rejected',
          performedBy: approverName || state.currentUser.name,
          notes: reason || 'PO rejected by Admin.',
        };

        set({
          purchaseOrders: state.purchaseOrders.map((p) =>
            p.id === po.id
              ? {
                  ...p,
                  status: 'rejected' as const,
                  activityHistory: [...(p.activityHistory || []), historyEntry],
                }
              : p
          ),
        });

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'PURCHASE_ORDER_REJECTED',
          entityType: 'purchase_order',
          entityId: po.poNumber,
          details: `Rejected Purchase Order ${po.poNumber}. Reason: ${reason}`,
        });
      },

      sendPurchaseOrderToSupplier: (poId) => {
        const state = get();
        const po = state.purchaseOrders.find((p) => p.id === poId || p.poNumber === poId);
        if (!po) return;

        const now = new Date().toISOString();
        const historyEntry = {
          date: now,
          action: 'Sent to Supplier',
          performedBy: state.currentUser.name,
          notes: `PO issued and transmitted to supplier ${po.supplierName}.`,
        };

        set({
          purchaseOrders: state.purchaseOrders.map((p) =>
            p.id === po.id
              ? {
                  ...p,
                  status: 'sent_to_supplier' as const,
                  activityHistory: [...(p.activityHistory || []), historyEntry],
                }
              : p
          ),
        });

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'PURCHASE_ORDER_SENT_TO_SUPPLIER',
          entityType: 'purchase_order',
          entityId: po.poNumber,
          details: `Purchase Order ${po.poNumber} sent to supplier ${po.supplierName}.`,
        });
      },

      updateTransitIncident: (id, updates) => {
        set((state) => ({
          transitDamageIncidents: state.transitDamageIncidents.map((t) =>
            t.id === id || t.incidentNumber === id ? { ...t, ...updates } : t
          ),
        }));
        get().addAuditLog({
          userId: get().currentUser.id,
          userName: get().currentUser.name,
          userRole: get().currentRole,
          action: 'TRANSIT_INCIDENT_UPDATED',
          entityType: 'inward_receipt',
          entityId: id,
          details: `Updated transit damage incident review status for ${id}`,
        });
      },

      addTransitIncident: (incidentData) => {
        const rand = Math.floor(100 + Math.random() * 900);
        const incidentNumber = `TDI-2026-${rand}`;
        const id = `tdi-${Date.now().toString().slice(-4)}`;
        const newIncident: TransitDamageIncident = {
          ...incidentData,
          id,
          incidentNumber,
        };
        set((state) => ({
          transitDamageIncidents: [newIncident, ...state.transitDamageIncidents],
        }));
        get().addAuditLog({
          userId: get().currentUser.id,
          userName: get().currentUser.name,
          userRole: get().currentRole,
          action: 'TRANSIT_INCIDENT_LOGGED',
          entityType: 'inward_receipt',
          entityId: incidentNumber,
          details: `Reported freight transit damage incident ${incidentNumber} with carrier ${newIncident.transporterName}`,
        });
        return newIncident;
      },

      addCustomerReturn: (returnData) => {
        const rand = Math.floor(100 + Math.random() * 900);
        const returnNumber = `RET-2026-${rand}`;
        const id = `ret-${Date.now().toString().slice(-4)}`;
        const newRecord: CustomerReturnRecord = {
          ...returnData,
          id,
          returnNumber,
        };
        set((state) => ({
          customerReturns: [newRecord, ...state.customerReturns],
        }));
        get().addAuditLog({
          userId: get().currentUser.id,
          userName: get().currentUser.name,
          userRole: get().currentRole,
          action: 'CUSTOMER_RETURN_LOGGED',
          entityType: 'order',
          entityId: returnNumber,
          details: `Logged customer RMA return claim ${returnNumber} for ${newRecord.customerName} (Product: ${newRecord.productName})`,
        });
        return newRecord;
      },

      recordAdminInspectionDecision: (receiptId, decision, notes) => {
        const state = get();
        const receipt = state.inwardReceipts.find(
          (r) => r.id === receiptId || r.receiptNumber === receiptId
        );
        if (!receipt) {
          return { success: false, message: `Receipt ${receiptId} not found.` };
        }

        const now = new Date().toISOString();
        let newStatus: InwardReceipt['status'] = 'partially_accepted';
        let returnGatePass: string | undefined = undefined;

        if (decision === 'partial_acceptance') {
          newStatus = 'partially_accepted';
          returnGatePass = `RGP-PART-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        } else if (decision === 'full_rejection') {
          newStatus = 'rejected';
          returnGatePass = `RGP-REJ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        } else {
          newStatus = 'awaiting_inspection';
        }

        set((prev) => ({
          inwardReceipts: prev.inwardReceipts.map((r) => {
            if (r.id === receipt.id) {
              return {
                ...r,
                status: newStatus,
                adminDecision: decision,
                adminDecisionNotes: notes,
                adminDecisionDate: now,
                returnGatePassNumber: returnGatePass,
              };
            }
            return r;
          }),
        }));

        get().addAuditLog({
          userId: get().currentUser.id,
          userName: get().currentUser.name,
          userRole: get().currentRole,
          action: 'ADMIN_DAMAGE_DECISION',
          entityType: 'inward_receipt',
          entityId: receipt.receiptNumber,
          details: `Admin recorded disposition '${decision}' for receipt ${receipt.receiptNumber}. Gate Pass: ${returnGatePass || 'N/A'}. Reason: ${notes}`,
          regionId: receipt.regionId,
        });

        return {
          success: true,
          message:
            decision === 'partial_acceptance'
              ? `Partial Acceptance approved. Eligible good units posted/accepted. Return Gate Pass ${returnGatePass} issued for damaged cargo.`
              : decision === 'full_rejection'
              ? `Consignment completely rejected. Return Gate Pass ${returnGatePass} issued. Zero inventory posted.`
              : 'Consignment placed on quarantine hold for supplier clarification.',
          returnGatePassNumber: returnGatePass,
        };
      },

      // Inward & Shortage Discrepancy Lifecycle
      planIncomingGoods: (params) => {
        const product = get().products.find((p) => p.id === params.productId);
        const randReceipt = Math.floor(100 + Math.random() * 900);
        const receiptNumber = `INW-2026-${randReceipt}`;
        const id = `inw-${Date.now().toString().slice(-4)}`;
        const batchNum = `B-${new Date().toISOString().slice(2, 7).replace('-', '')}-${randReceipt}`;

        const newReceipt: InwardReceipt = {
          id,
          receiptNumber,
          date: params.expectedDate,
          purchaseOrderId: params.poId,
          purchaseOrderNumber: params.poNumber,
          supplierId: params.supplierId,
          supplierName: params.supplierName,
          supplierInvoiceNumber: params.poNumber || `DN-${randReceipt}`,
          regionId: params.regionId,
          warehouseId: params.warehouseId,
          storageLocationId: 'loc-bay-01',
          productId: params.productId,
          productName: product?.name || 'Industrial Material',
          productSku: product?.sku || 'SKU-GEN',
          batchNumber: batchNum,
          manufacturingDate: new Date().toISOString().split('T')[0],
          expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          expectedQuantity: params.expectedQuantity,
          receivedQuantity: 0,
          actualCountedQuantity: 0,
          acceptedQuantity: 0,
          shortageQuantity: 0,
          damagedQuantity: 0,
          excessQuantity: 0,
          unit: product?.unit || 'Units',
          actualUnitCost: params.actualUnitCost,
          totalCost: params.expectedQuantity * params.actualUnitCost,
          transportExpensePaidByCompany: params.transportExpense || 0,
          discrepancyStatus: 'none',
          status: 'expected',
          receivedByUserId: get().currentUser.id,
          receivedByUserName: get().currentUser.name,
          notes: params.notes,
        };

        set((state) => ({
          inwardReceipts: [newReceipt, ...state.inwardReceipts],
        }));

        get().addNotification({
          userId: 'role:store_manager',
          title: 'Incoming Inward Consignment Scheduled',
          message: `${params.expectedQuantity} units of ${newReceipt.productName} scheduled to arrive on ${params.expectedDate} from ${params.supplierName}.`,
          type: 'info',
          actionUrl: '/store-manager/receiving',
        });

        get().addAuditLog({
          userId: get().currentUser.id,
          userName: get().currentUser.name,
          userRole: get().currentRole,
          action: 'INWARD_SHIPMENT_PLANNED',
          entityType: 'receipt',
          entityId: receiptNumber,
          details: `Planned incoming shipment of ${params.expectedQuantity} ${newReceipt.unit} for warehouse ${params.warehouseId}`,
          regionId: params.regionId,
        });

        return newReceipt;
      },

      recordGoodsReceiptCount: (receiptId, params) => {
        const state = get();
        const receipt = state.inwardReceipts.find((r) => r.id === receiptId || r.receiptNumber === receiptId);
        if (!receipt) {
          return { shortageQuantity: 0, excessQuantity: 0, discrepancyCreated: false };
        }

        const expected = receipt.expectedQuantity || 0;
        const counted = params.actualCountedQuantity;
        const accepted = params.acceptedQuantity;
        const damaged = params.damagedQuantity || 0;

        const shortage = Math.max(0, expected - counted);
        const excess = Math.max(0, counted - expected);

        const hasDiscrepancy = shortage > 0 || damaged > 0 || excess > 0;
        let discId: string | undefined = undefined;

        if (hasDiscrepancy) {
          discId = `disc-${Date.now().toString().slice(-4)}`;
          const discType = shortage > 0 ? 'shortage' : damaged > 0 ? 'damaged' : 'excess';
          const newDisc: ReceivingDiscrepancy = {
            id: discId,
            receiptId: receipt.id,
            receiptNumber: receipt.receiptNumber,
            poId: receipt.purchaseOrderId,
            poNumber: receipt.purchaseOrderNumber,
            supplierId: receipt.supplierId,
            supplierName: receipt.supplierName,
            productId: receipt.productId,
            productName: receipt.productName,
            productSku: receipt.productSku,
            expectedQuantity: expected,
            actualCountedQuantity: counted,
            shortageQuantity: shortage,
            damagedQuantity: damaged,
            excessQuantity: excess,
            discrepancyType: discType,
            status: 'pending_review',
            reportedByUserId: state.currentUser.id,
            reportedByUserName: state.currentUser.name,
            reportedAt: new Date().toISOString(),
            reason: params.notes || `Discrepancy identified during receiving: ${shortage} shortage, ${damaged} damaged.`,
          };

          set((s) => ({
            receivingDiscrepancies: [newDisc, ...s.receivingDiscrepancies],
          }));

          state.addNotification({
            userId: 'role:admin',
            title: `Receiving Shortage/Discrepancy: ${receipt.receiptNumber}`,
            message: `Store Keeper reported ${shortage > 0 ? `${shortage} units shortage` : `${damaged} damaged units`} on inward from ${receipt.supplierName}.`,
            type: 'alert',
            actionUrl: '/admin/inward-receipts',
          });
        }

        set((s) => ({
          inwardReceipts: s.inwardReceipts.map((r) =>
            r.id === receipt.id
              ? {
                  ...r,
                  actualCountedQuantity: counted,
                  receivedQuantity: counted,
                  acceptedQuantity: accepted,
                  shortageQuantity: shortage,
                  damagedQuantity: damaged,
                  excessQuantity: excess,
                  storageLocationId: params.storageLocationId || r.storageLocationId,
                  discrepancyId: discId || r.discrepancyId,
                  discrepancyStatus: hasDiscrepancy ? 'pending_review' : 'none',
                  status: 'received',
                  notes: params.notes || r.notes,
                }
              : r
          ),
        }));

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentRole,
          action: 'GOODS_RECEIPT_COUNTED',
          entityType: 'receipt',
          entityId: receipt.receiptNumber,
          details: `Physical count completed: Expected ${expected}, Counted ${counted}, Accepted ${accepted}, Shortage ${shortage}, Damaged ${damaged}`,
          regionId: receipt.regionId,
        });

        return { shortageQuantity: shortage, excessQuantity: excess, discrepancyCreated: hasDiscrepancy };
      },

      resolveDiscrepancy: (discrepancyId, resolution) => {
        const state = get();
        const disc = state.receivingDiscrepancies.find((d) => d.id === discrepancyId);
        if (!disc) return;

        const resolvedAt = new Date().toISOString();
        const resolvedByUserId = state.currentUser.id;
        const resolvedByUserName = state.currentUser.name;

        set((s) => ({
          receivingDiscrepancies: s.receivingDiscrepancies.map((d) =>
            d.id === discrepancyId
              ? {
                  ...d,
                  status: resolution.status,
                  resolutionType: resolution.resolutionType,
                  resolutionNotes: resolution.resolutionNotes,
                  creditNoteNumber: resolution.creditNoteNumber,
                  resolvedByUserId,
                  resolvedByUserName,
                  resolvedAt,
                }
              : d
          ),
          inwardReceipts: s.inwardReceipts.map((r) =>
            r.id === disc.receiptId
              ? {
                  ...r,
                  discrepancyStatus: resolution.status,
                }
              : r
          ),
        }));

        state.addAuditLog({
          userId: resolvedByUserId,
          userName: resolvedByUserName,
          userRole: state.currentRole,
          action: 'DISCREPANCY_RESOLVED',
          entityType: 'discrepancy',
          entityId: disc.receiptNumber,
          details: `Resolved receiving discrepancy for ${disc.supplierName}: Status '${resolution.status}', Resolution '${resolution.resolutionType || 'Standard'}'. Notes: ${resolution.resolutionNotes}`,
        });

        state.addNotification({
          userId: 'role:store_manager',
          title: `Discrepancy Resolved: ${disc.receiptNumber}`,
          message: `Admin resolved discrepancy with ${disc.supplierName} (${resolution.status}). ${resolution.resolutionNotes}`,
          type: 'success',
          actionUrl: '/store-manager/receiving',
        });
      },

      reportReceivingDiscrepancy: (discrepancyData) => {
        const state = get();
        const discId = `DISC-${Date.now().toString().slice(-4)}`;
        const reportedAt = new Date().toISOString();
        const reportedByUserId = state.currentUser.id;
        const reportedByUserName = state.currentUser.name;

        const newDisc: ReceivingDiscrepancy = {
          id: discId,
          receiptId: discrepancyData.receiptId || `GRN-${Date.now().toString().slice(-4)}`,
          receiptNumber: discrepancyData.receiptNumber || `GRN-${Date.now().toString().slice(-4)}`,
          supplierId: discrepancyData.supplierId,
          supplierName: discrepancyData.supplierName,
          productId: discrepancyData.productId,
          productName: discrepancyData.productName,
          productSku: discrepancyData.productSku,
          expectedQuantity: discrepancyData.expectedQuantity,
          actualCountedQuantity: discrepancyData.actualCountedQuantity,
          shortageQuantity: discrepancyData.shortageQuantity || 0,
          damagedQuantity: discrepancyData.damagedQuantity || 0,
          excessQuantity: discrepancyData.excessQuantity || 0,
          discrepancyType: discrepancyData.discrepancyType,
          status: 'pending_review',
          reportedByUserId,
          reportedByUserName,
          reportedAt,
          reason: discrepancyData.reason,
          financialImpact: (discrepancyData.shortageQuantity || 0) * 1200 + (discrepancyData.damagedQuantity || 0) * 1200,
          evidenceDocUrl: discrepancyData.evidenceProofUrl,
        };

        // If damaged units reported on a batch, update batch damagedQuantity
        let updatedBatches = state.batches;
        if (discrepancyData.batchId && (discrepancyData.damagedQuantity || 0) > 0) {
          const dmg = discrepancyData.damagedQuantity || 0;
          updatedBatches = state.batches.map((b) => {
            if (b.id === discrepancyData.batchId || b.batchNumber === discrepancyData.batchNumber) {
              const newDamaged = (b.damagedQuantity || 0) + dmg;
              const newAvailable = Math.max(0, b.availableQuantity - dmg);
              return {
                ...b,
                damagedQuantity: newDamaged,
                availableQuantity: newAvailable,
                inspectionStatus: newAvailable === 0 ? 'quarantined' : b.inspectionStatus,
              };
            }
            return b;
          });
        }

        set({
          receivingDiscrepancies: [newDisc, ...state.receivingDiscrepancies],
          batches: updatedBatches,
        });

        state.addNotification({
          userId: 'role:admin',
          title: `Physical Discrepancy Reported: ${discrepancyData.productSku}`,
          message: `${reportedByUserName} reported ${discrepancyData.discrepancyType} (${discrepancyData.shortageQuantity || 0} shortage, ${discrepancyData.damagedQuantity || 0} damaged) on SKU ${discrepancyData.productSku}.`,
          type: 'alert',
          actionUrl: '/admin/approvals',
        });

        state.addAuditLog({
          userId: reportedByUserId,
          userName: reportedByUserName,
          userRole: state.currentUser.role,
          action: 'DISCREPANCY_REPORTED',
          entityType: 'discrepancy',
          entityId: discId,
          details: `Storekeeper reported ${discrepancyData.discrepancyType} on ${discrepancyData.productName} (${discrepancyData.productSku}). Reason: ${discrepancyData.reason}`,
        });

        return { success: true, discrepancyId: discId, message: `Discrepancy ${discId} recorded and submitted to Admin for resolution.` };
      },

      postGoodsReceiptToInventory: (receiptId) => {
        const state = get();
        const receipt = state.inwardReceipts.find((r) => r.id === receiptId || r.receiptNumber === receiptId);
        if (!receipt) {
          return { success: false, message: 'Receipt not found.' };
        }

        // Single posting guard: prevent duplicate stock posting
        if (receipt.stockPostedAt || receipt.status === 'stock_available') {
          return { success: false, message: 'Stock already posted to inventory for this goods receipt.' };
        }

        const eligibleQty = receipt.acceptedQuantity ?? receipt.receivedQuantity ?? 0;
        if (eligibleQty <= 0) {
          return { success: false, message: 'No accepted eligible quantity available to post to inventory.' };
        }

        const batchNumber = receipt.batchNumber || `B-${new Date().toISOString().slice(2, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`;
        const batchId = `batch-${receipt.regionId}-${Date.now().toString().slice(-4)}`;

        const newBatch: Batch = {
          id: batchId,
          batchNumber,
          productId: receipt.productId,
          productSku: receipt.productSku,
          productName: receipt.productName,
          regionId: receipt.regionId,
          warehouseId: receipt.warehouseId,
          locationId: receipt.storageLocationId || 'loc-bay-01',
          initialQuantity: eligibleQty,
          availableQuantity: eligibleQty,
          reservedQuantity: 0,
          dispatchedQuantity: 0,
          manufacturingDate: receipt.manufacturingDate || new Date().toISOString().split('T')[0],
          expiryDate: receipt.expiryDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          actualUnitCost: receipt.actualUnitCost || 1000,
          status: 'active',
          supplierId: receipt.supplierId,
          supplierName: receipt.supplierName,
          purchaseOrderId: receipt.purchaseOrderId || receipt.poId,
          poNumber: receipt.purchaseOrderNumber || receipt.poNumber,
          grnId: receipt.id,
          grnNumber: receipt.receiptNumber,
          expectedQuantity: receipt.expectedQuantity,
          receivedQuantity: receipt.receivedQuantity,
          acceptedQuantity: eligibleQty,
          damagedQuantity: receipt.damagedQuantity || 0,
          shortageQuantity: receipt.shortageQuantity || 0,
          batchValue: eligibleQty * (receipt.actualUnitCost || 1000),
          assignedStorekeeperId: receipt.receivedByUserId || state.currentUser.id,
          inspectionStatus: 'accepted',
        };

        const movement: StockMovement = {
          id: `mov-${Date.now()}`,
          timestamp: new Date().toISOString(),
          movementType: 'inward_receipt',
          productId: receipt.productId,
          productName: receipt.productName,
          productSku: receipt.productSku,
          batchId,
          batchNumber,
          regionId: receipt.regionId,
          regionName: state.regions.find((r) => r.id === receipt.regionId)?.name || 'Regional Depot',
          warehouseId: receipt.warehouseId,
          warehouseName: state.warehouses.find((w) => w.id === receipt.warehouseId)?.name || 'Central Hub',
          quantity: eligibleQty,
          referenceType: 'inward_receipt',
          referenceId: receipt.receiptNumber,
          performedByUserId: state.currentUser.id,
          performedByUserName: state.currentUser.name,
          unitCostAtMovement: receipt.actualUnitCost,
          remarks: `Accepted ${eligibleQty} units posted into sellable stock after inspection.`,
        };

        const postedAt = new Date().toISOString();
        set((s) => ({
          batches: [newBatch, ...s.batches],
          stockMovements: [movement, ...s.stockMovements],
          inwardReceipts: s.inwardReceipts.map((r) =>
            r.id === receipt.id
              ? {
                  ...r,
                  status: 'stock_available',
                  stockPostedAt: postedAt,
                  stockPostedByUserId: state.currentUser.id,
                }
              : r
          ),
        }));

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentRole,
          action: 'STOCK_POSTED_TO_INVENTORY',
          entityType: 'batch',
          entityId: batchNumber,
          details: `Posted ${eligibleQty} units of ${receipt.productName} into Batch ${batchNumber} at warehouse ${receipt.warehouseId}`,
          regionId: receipt.regionId,
        });

        state.addNotification({
          userId: 'all',
          title: 'New Sellable Stock Available',
          message: `${eligibleQty} units of ${receipt.productName} (Batch ${batchNumber}) released to available inventory.`,
          type: 'success',
          actionUrl: '/sales/products',
        });

        return { success: true, batchNumber, message: `Successfully posted ${eligibleQty} units to inventory!` };
      },

      // Transport & Firm Charges Policy
      configureTransportChargePolicy: (policyData) => {
        const id = `tcp-${Date.now().toString().slice(-4)}`;
        const newPolicy: TransportChargePolicy = {
          ...policyData,
          id,
        };
        set((state) => ({ transportPolicies: [newPolicy, ...state.transportPolicies] }));
        get().addAuditLog({
          userId: get().currentUser.id,
          userName: get().currentUser.name,
          userRole: get().currentRole,
          action: 'TRANSPORT_POLICY_CONFIGURED',
          entityType: 'transport',
          entityId: id,
          details: `Configured freight policy '${newPolicy.name}' (${newPolicy.calculationMethod}, base rate ₹${newPolicy.defaultRate})`,
        });
        return newPolicy;
      },

      updateTransportChargePolicy: (id, updates) => {
        set((state) => ({
          transportPolicies: state.transportPolicies.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
      },

      reserveOrderStock: (orderId) => {
        const state = get();
        const order = state.salesOrders.find((o) => o.id === orderId || o.orderNumber === orderId);
        if (!order) return { success: false, message: 'Order not found' };

        // Verify available stock in target warehouse
        for (const item of order.items) {
          const warehouseBatches = state.batches.filter(
            (b) => b.productId === item.productId && (order.warehouseId ? b.warehouseId === order.warehouseId : b.regionId === order.regionId) && b.status === 'active'
          );
          const totalAvail = warehouseBatches.reduce((sum, b) => sum + b.availableQuantity, 0);
          if (totalAvail < item.quantity) {
            return {
              success: false,
              message: `Insufficient stock for ${item.productName}. Required: ${item.quantity}, Available: ${totalAvail} in specified warehouse.`,
            };
          }
        }

        // Allocate from oldest eligible FIFO batches
        const updatedBatches = [...state.batches];
        const updatedItems = order.items.map((item) => {
          let needed = item.quantity;
          const allocations: BatchAllocation[] = [];

          // Sort batches by expiry/mfg date (FIFO)
          const eligibleBatches = updatedBatches
            .filter((b) => b.productId === item.productId && (order.warehouseId ? b.warehouseId === order.warehouseId : b.regionId === order.regionId) && b.availableQuantity > 0)
            .sort((a, b) => new Date(a.manufacturingDate).getTime() - new Date(b.manufacturingDate).getTime());

          for (const batch of eligibleBatches) {
            if (needed <= 0) break;
            const take = Math.min(batch.availableQuantity, needed);
            batch.availableQuantity -= take;
            batch.reservedQuantity += take;
            needed -= take;
            allocations.push({
              batchId: batch.id,
              batchNumber: batch.batchNumber,
              allocatedQuantity: take,
            });
          }

          return { ...item, allocations };
        });

        set((s) => ({
          batches: updatedBatches,
          salesOrders: s.salesOrders.map((o) =>
            o.id === order.id
              ? {
                  ...o,
                  status: 'reserved',
                  items: updatedItems,
                }
              : o
          ),
        }));

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentRole,
          action: 'ORDER_STOCK_RESERVED',
          entityType: 'order',
          entityId: order.orderNumber,
          details: `Reserved stock across FIFO batches for Sales Order ${order.orderNumber}. Picking list ready.`,
          regionId: order.regionId,
        });

        state.addNotification({
          userId: 'role:store_manager',
          title: `New Dispatch Order Reserved: ${order.orderNumber}`,
          message: `Sales Order for ${order.customerName} (₹${order.totalAmount.toLocaleString('en-IN')}) confirmed. Ready for picking.`,
          type: 'info',
          actionUrl: '/store-manager/sales-fulfilment',
        });

        return { success: true, message: `Stock successfully reserved for ${order.orderNumber}!` };
      },

      dispatchOrderWithTransport: (orderId, params) => {
        const state = get();
        const order = state.salesOrders.find((o) => o.id === orderId || o.orderNumber === orderId);
        if (!order) return { success: false, message: 'Order not found' };

        const updatedBatches = [...state.batches];
        const newMovements: StockMovement[] = [];

        for (const item of order.items) {
          for (const alloc of item.allocations || []) {
            const batch = updatedBatches.find((b) => b.id === alloc.batchId);
            if (batch) {
              batch.reservedQuantity = Math.max(0, batch.reservedQuantity - alloc.allocatedQuantity);
              batch.dispatchedQuantity += alloc.allocatedQuantity;

              newMovements.push({
                id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                timestamp: new Date().toISOString(),
                movementType: 'outward_dispatch',
                productId: item.productId,
                productName: item.productName,
                productSku: item.productSku,
                batchId: batch.id,
                batchNumber: batch.batchNumber,
                regionId: order.regionId,
                regionName: state.regions.find((r) => r.id === order.regionId)?.name || 'Region',
                warehouseId: order.warehouseId || batch.warehouseId,
                warehouseName: state.warehouses.find((w) => w.id === (order.warehouseId || batch.warehouseId))?.name || 'Warehouse Hub',
                quantity: alloc.allocatedQuantity,
                referenceType: 'sales_order',
                referenceId: order.orderNumber,
                performedByUserId: state.currentUser.id,
                performedByUserName: state.currentUser.name,
                unitCostAtMovement: batch.actualUnitCost,
                remarks: `Dispatched to ${order.customerName}. Carrier: ${params.carrierName}, Tracking: ${params.trackingNumber}`,
              });
            }
          }
        }

        const recoveryVariance = params.customerDeliveryCharge - params.companyTransportExpense;

        set((s) => ({
          batches: updatedBatches,
          stockMovements: [...newMovements, ...s.stockMovements],
          salesOrders: s.salesOrders.map((o) =>
            o.id === order.id
              ? {
                  ...o,
                  status: 'dispatched',
                  dispatchedAt: new Date().toISOString(),
                  dispatchedByUserId: state.currentUser.id,
                  dispatchedByUserName: state.currentUser.name,
                  dispatchTrackingNumber: params.trackingNumber,
                  carrierName: params.carrierName,
                  companyTransportExpense: params.companyTransportExpense,
                  customerDeliveryCharge: params.customerDeliveryCharge,
                  transportRecoveryVariance: recoveryVariance,
                }
              : o
          ),
          customers: s.customers.map((c) =>
            c.id === order.customerId
              ? { ...c, currentOutstanding: c.currentOutstanding + order.totalAmount + params.customerDeliveryCharge }
              : c
          ),
        }));

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentRole,
          action: 'ORDER_DISPATCHED_WITH_FREIGHT',
          entityType: 'order',
          entityId: order.orderNumber,
          details: `Dispatched ${order.orderNumber} via ${params.carrierName} (${params.trackingNumber}). Company freight: ₹${params.companyTransportExpense}, Customer freight: ₹${params.customerDeliveryCharge}`,
          regionId: order.regionId,
        });

        state.addNotification({
          userId: order.salesUserId,
          title: `Order Dispatched: ${order.orderNumber}`,
          message: `Your order for ${order.customerName} has been dispatched via ${params.carrierName}. Waybill: ${params.trackingNumber}`,
          type: 'success',
          actionUrl: '/sales/dispatch',
        });

        return { success: true, message: `Order ${order.orderNumber} dispatched successfully!` };
      },

      // Invoice Management Actions
      createInvoice: (invoiceData) => {
        const state = get();
        const nextNum = (state.invoices?.length || 0) + 1;
        const formattedNum = String(nextNum).padStart(3, '0');
        const invoiceNumber = invoiceData.invoiceNumber || `INV-2026-${formattedNum}`;
        const id = `inv-2026-${formattedNum}`;

        const totalAmount = Number(invoiceData.totalAmount) || 0;
        const paidAmount = Number(invoiceData.paidAmount) || 0;
        const outstandingBalance = Math.max(0, totalAmount - paidAmount);

        let initialStatus: InvoiceStatus = invoiceData.status || 'issued';
        let initialPayStatus: InvoicePaymentStatus = invoiceData.paymentStatus || 'unpaid';

        if (paidAmount >= totalAmount && totalAmount > 0) {
          initialStatus = 'paid';
          initialPayStatus = 'paid';
        } else if (paidAmount > 0) {
          initialStatus = 'partially_paid';
          initialPayStatus = 'partially_paid';
        }

        const newInvoice: Invoice = {
          ...invoiceData,
          id,
          invoiceNumber,
          totalAmount,
          paidAmount,
          outstandingBalance,
          status: initialStatus,
          paymentStatus: initialPayStatus,
        };

        // Update customer currentOutstanding if there is an unpaid balance
        const updatedCustomers = (state.customers || []).map((c) => {
          if (c.id === newInvoice.customerId) {
            return {
              ...c,
              currentOutstanding: (c.currentOutstanding || 0) + outstandingBalance,
            };
          }
          return c;
        });

        // Audit log
        const auditEntry: AuditLog = {
          id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: new Date().toISOString(),
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'create_invoice',
          entityType: 'invoice',
          entityId: newInvoice.id,
          details: `Generated tax invoice ${newInvoice.invoiceNumber} for ${newInvoice.customerName} (₹${newInvoice.totalAmount.toLocaleString('en-IN')}). Source: ${newInvoice.source}. Paid: ₹${paidAmount.toLocaleString('en-IN')}, Outstanding: ₹${outstandingBalance.toLocaleString('en-IN')}.`,
          regionId: newInvoice.regionId,
        };

        // Notification for admin/finance
        const notif: Notification = {
          id: `notif-${Date.now()}`,
          userId: 'all',
          title: `New Tax Invoice Issued: ${newInvoice.invoiceNumber}`,
          message: `Invoice ${newInvoice.invoiceNumber} created for ${newInvoice.customerName} (₹${newInvoice.totalAmount.toLocaleString('en-IN')}) by ${newInvoice.createdByUserName}.`,
          type: 'info',
          read: false,
          createdAt: new Date().toISOString(),
        };

        set({
          invoices: [newInvoice, ...(state.invoices || [])],
          customers: updatedCustomers,
          auditLogs: [auditEntry, ...(state.auditLogs || [])],
          notifications: [notif, ...(state.notifications || [])],
        });

        return newInvoice;
      },

      recordInvoicePayment: (invoiceId, paymentData) => {
        const state = get();
        const invoice = (state.invoices || []).find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId);
        if (!invoice) return { success: false, message: 'Invoice not found.' };

        const payAmount = Number(paymentData.amount);
        if (isNaN(payAmount) || payAmount <= 0) {
          return { success: false, message: 'Payment amount must be greater than zero.' };
        }
        if (payAmount > invoice.outstandingBalance) {
          return {
            success: false,
            message: `Payment amount (₹${payAmount.toLocaleString('en-IN')}) cannot exceed remaining balance (₹${invoice.outstandingBalance.toLocaleString('en-IN')}).`,
          };
        }

        const newPaid = (invoice.paidAmount || 0) + payAmount;
        const newBalance = Math.max(0, invoice.totalAmount - newPaid);
        const newStatus: InvoiceStatus = newBalance === 0 ? 'paid' : 'partially_paid';
        const newPayStatus: InvoicePaymentStatus = newBalance === 0 ? 'paid' : 'partially_paid';

        const updatedInvoices = (state.invoices || []).map((i) => {
          if (i.id === invoice.id) {
            return {
              ...i,
              paidAmount: newPaid,
              outstandingBalance: newBalance,
              status: newStatus,
              paymentStatus: newPayStatus,
              paymentMode: paymentData.paymentMode || i.paymentMode || 'Bank Transfer / NEFT',
              paymentReference: paymentData.referenceNumber || i.paymentReference,
              paymentDate: paymentData.paymentDate || new Date().toISOString().split('T')[0],
              notes: paymentData.notes ? `${i.notes || ''} [Payment: ₹${payAmount} - ${paymentData.notes}]`.trim() : i.notes,
            };
          }
          return i;
        });

        // Also update linked sales order paymentStatus if present
        const updatedOrders = (state.salesOrders || []).map((o) => {
          if (invoice.orderNumber && (o.orderNumber === invoice.orderNumber || o.id === invoice.orderId)) {
            const orderPaid = (o.amountPaid || 0) + payAmount;
            return {
              ...o,
              amountPaid: orderPaid,
              paymentStatus: (orderPaid >= o.totalAmount ? 'paid' : 'partially_paid') as 'paid' | 'partially_paid',
            };
          }
          return o;
        });

        // Reduce customer outstanding
        const updatedCustomers = (state.customers || []).map((c) => {
          if (c.id === invoice.customerId) {
            return {
              ...c,
              currentOutstanding: Math.max(0, (c.currentOutstanding || 0) - payAmount),
            };
          }
          return c;
        });

        // Record audit
        const auditEntry: AuditLog = {
          id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: new Date().toISOString(),
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'record_invoice_payment',
          entityType: 'invoice',
          entityId: invoice.id,
          details: `Recorded remittance of ₹${payAmount.toLocaleString('en-IN')} against invoice ${invoice.invoiceNumber}. Remaining balance: ₹${newBalance.toLocaleString('en-IN')}.`,
          regionId: invoice.regionId,
        };

        set({
          invoices: updatedInvoices,
          salesOrders: updatedOrders,
          customers: updatedCustomers,
          auditLogs: [auditEntry, ...(state.auditLogs || [])],
        });

        return { success: true, message: `Successfully recorded payment of ₹${payAmount.toLocaleString('en-IN')} for ${invoice.invoiceNumber}.` };
      },

      updateInvoiceStatus: (invoiceId, status) => {
        const state = get();
        set({
          invoices: (state.invoices || []).map((i) =>
            i.id === invoiceId || i.invoiceNumber === invoiceId ? { ...i, status } : i
          ),
        });
      },

      sendInvoiceEmail: (invoiceId, recipientEmail) => {
        const state = get();
        const invoice = (state.invoices || []).find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId);
        if (!invoice) return { success: false, message: 'Invoice not found.' };

        const targetEmail = recipientEmail || invoice.customerEmail || 'accounts@clientdomain.com';
        const now = new Date().toISOString();

        set({
          invoices: (state.invoices || []).map((i) =>
            i.id === invoice.id ? { ...i, emailSent: true, emailSentAt: now, emailRecipient: targetEmail } : i
          ),
        });

        return { success: true, message: `Simulated Email dispatched to ${targetEmail} with tax invoice PDF link.` };
      },

      sendInvoiceWhatsApp: (invoiceId, recipientPhone) => {
        const state = get();
        const invoice = (state.invoices || []).find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId);
        if (!invoice) return { success: false, message: 'Invoice not found.' };

        const targetPhone = recipientPhone || invoice.customerPhone || '+91 98000 00000';
        const now = new Date().toISOString();

        set({
          invoices: (state.invoices || []).map((i) =>
            i.id === invoice.id ? { ...i, whatsAppSent: true, whatsAppSentAt: now, whatsAppRecipient: targetPhone } : i
          ),
        });

        return { success: true, message: `Simulated WhatsApp message dispatched to ${targetPhone} with digital invoice card.` };
      },

      // ─── Finance Role Domain Action Implementations ───

      approveBudgetRequest: (id, approvedAmount, notes) => {
        const state = get();
        const req = (state.budgetRequests || []).find((b) => b.id === id);
        if (!req) return;
        const finalAmount = approvedAmount !== undefined ? approvedAmount : req.requestedAmount;
        const now = new Date().toISOString();
        set({
          budgetRequests: (state.budgetRequests || []).map((b) =>
            b.id === id
              ? {
                  ...b,
                  status: 'approved',
                  approvedAmount: finalAmount,
                  reviewNotes: notes || b.reviewNotes || 'Approved by Finance Controller',
                  reviewedByUserId: state.currentUser.id,
                  reviewedByUserName: state.currentUser.name,
                  reviewedAt: now,
                }
              : b
          ),
        });
        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'APPROVE_BUDGET_REQUEST',
          entityType: 'budget_request',
          entityId: id,
          details: `Approved marketing campaign budget of ₹${finalAmount.toLocaleString('en-IN')} for "${req.campaignName}".`,
        });
        state.addNotification({
          userId: req.requestingUserId,
          title: 'Marketing Budget Approved',
          message: `Your campaign budget request for "${req.campaignName}" has been approved for ₹${finalAmount.toLocaleString('en-IN')}.`,
          type: 'success',
        });
      },

      rejectBudgetRequest: (id, reason) => {
        const state = get();
        const req = (state.budgetRequests || []).find((b) => b.id === id);
        if (!req) return;
        const now = new Date().toISOString();
        set({
          budgetRequests: (state.budgetRequests || []).map((b) =>
            b.id === id
              ? {
                  ...b,
                  status: 'rejected',
                  reviewNotes: reason,
                  reviewedByUserId: state.currentUser.id,
                  reviewedByUserName: state.currentUser.name,
                  reviewedAt: now,
                }
              : b
          ),
        });
        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'REJECT_BUDGET_REQUEST',
          entityType: 'budget_request',
          entityId: id,
          details: `Rejected budget request for "${req.campaignName}". Reason: ${reason}`,
        });
        state.addNotification({
          userId: req.requestingUserId,
          title: 'Budget Request Declined',
          message: `Campaign budget for "${req.campaignName}" was not approved. Note: ${reason}`,
          type: 'alert',
        });
      },

      partiallyApproveBudgetRequest: (id, approvedAmount, notes) => {
        const state = get();
        const req = (state.budgetRequests || []).find((b) => b.id === id);
        if (!req) return;
        const now = new Date().toISOString();
        set({
          budgetRequests: (state.budgetRequests || []).map((b) =>
            b.id === id
              ? {
                  ...b,
                  status: 'partially_approved',
                  approvedAmount,
                  reviewNotes: notes || 'Partially approved with revised budget allocation',
                  reviewedByUserId: state.currentUser.id,
                  reviewedByUserName: state.currentUser.name,
                  reviewedAt: now,
                }
              : b
          ),
        });
        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'PARTIALLY_APPROVE_BUDGET',
          entityType: 'budget_request',
          entityId: id,
          details: `Partially approved budget request for "${req.campaignName}" at ₹${approvedAmount.toLocaleString('en-IN')}.`,
        });
        state.addNotification({
          userId: req.requestingUserId,
          title: 'Budget Partially Approved',
          message: `Your campaign budget for "${req.campaignName}" was approved for a revised amount of ₹${approvedAmount.toLocaleString('en-IN')}.`,
          type: 'info',
        });
      },

      approveFinanceClaim: (id, approvedAmount, method, notes) => {
        const state = get();
        const claim = (state.financeClaims || []).find((c) => c.id === id);
        if (!claim) return;
        const now = new Date().toISOString();
        set({
          financeClaims: (state.financeClaims || []).map((c) =>
            c.id === id
              ? {
                  ...c,
                  refundStatus: 'approved',
                  approvedAmount: approvedAmount !== undefined ? approvedAmount : c.requestedAmount,
                  refundMethod: method || c.refundMethod || 'credit_note',
                  reviewNotes: notes || c.reviewNotes || 'Claim verified and authorized by Finance',
                  reviewedByUserId: state.currentUser.id,
                  reviewedByUserName: state.currentUser.name,
                  reviewedAt: now,
                }
              : c
          ),
        });
        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'APPROVE_FINANCE_CLAIM',
          entityType: 'finance_claim',
          entityId: id,
          details: `Authorized claim ${id} (${claim.type}) for ₹${approvedAmount.toLocaleString('en-IN')} via ${method || 'credit note'}.`,
        });
      },

      rejectFinanceClaim: (id, reason) => {
        const state = get();
        const claim = (state.financeClaims || []).find((c) => c.id === id);
        if (!claim) return;
        const now = new Date().toISOString();
        set({
          financeClaims: (state.financeClaims || []).map((c) =>
            c.id === id
              ? {
                  ...c,
                  refundStatus: 'rejected',
                  rejectionReason: reason,
                  reviewedByUserId: state.currentUser.id,
                  reviewedByUserName: state.currentUser.name,
                  reviewedAt: now,
                }
              : c
          ),
        });
        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'REJECT_FINANCE_CLAIM',
          entityType: 'finance_claim',
          entityId: id,
          details: `Rejected claim ${id}. Reason: ${reason}`,
        });
      },

      disburseFinanceClaim: (id, reference, method) => {
        const state = get();
        const claim = (state.financeClaims || []).find((c) => c.id === id);
        if (!claim) return;
        set({
          financeClaims: (state.financeClaims || []).map((c) =>
            c.id === id
              ? {
                  ...c,
                  refundStatus: 'disbursed',
                  payoutStatus: 'paid',
                  refundReference: reference,
                  refundMethod: method || c.refundMethod || 'bank_transfer',
                }
              : c
          ),
        });
        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'DISBURSE_FINANCE_CLAIM',
          entityType: 'finance_claim',
          entityId: id,
          details: `Disbursed claim payout of ₹${(claim.approvedAmount || claim.requestedAmount).toLocaleString('en-IN')} (Ref: ${reference}).`,
        });
      },

      approvePayrollRecord: (id) => {
        const state = get();
        const rec = (state.payrollRecords || []).find((p) => p.id === id);
        if (!rec) return;
        set({
          payrollRecords: (state.payrollRecords || []).map((p) =>
            p.id === id ? { ...p, status: 'approved' } : p
          ),
        });
        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'APPROVE_PAYROLL',
          entityType: 'payroll',
          entityId: id,
          details: `Approved monthly payroll calculation for ${rec.employeeName} (${rec.month}): Net ₹${rec.netPayableSalary.toLocaleString('en-IN')}.`,
        });
      },

      disbursePayrollRecord: (id, reference, mode) => {
        const state = get();
        const rec = (state.payrollRecords || []).find((p) => p.id === id);
        if (!rec) return;
        const today = new Date().toISOString().split('T')[0];
        set({
          payrollRecords: (state.payrollRecords || []).map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: 'paid',
                  paymentDate: today,
                  paymentReference: reference,
                  paymentMode: mode || 'Bank Transfer (NEFT/RTGS)',
                }
              : p
          ),
        });
        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'DISBURSE_PAYROLL',
          entityType: 'payroll',
          entityId: id,
          details: `Disbursed salary of ₹${rec.netPayableSalary.toLocaleString('en-IN')} to ${rec.employeeName} (Ref: ${reference}).`,
        });
        state.addNotification({
          userId: rec.userId,
          title: 'Salary Disbursed',
          message: `Your salary for ${rec.month} of ₹${rec.netPayableSalary.toLocaleString('en-IN')} has been disbursed via ${mode || 'Bank Transfer'}. Ref: ${reference}`,
          type: 'success',
        });
      },

      approveIncentiveSettlement: (id, approvedAmount, notes) => {
        const state = get();
        const inc = (state.incentiveSettlements || []).find((i) => i.id === id);
        if (!inc) return;
        const now = new Date().toISOString();
        const finalAmount = approvedAmount !== undefined ? approvedAmount : inc.calculatedIncentive;
        set({
          incentiveSettlements: (state.incentiveSettlements || []).map((i) =>
            i.id === id
              ? {
                  ...i,
                  status: 'approved',
                  approvedIncentive: finalAmount,
                  reviewNotes: notes || 'Authorized by Finance Controller',
                  reviewedByUserId: state.currentUser.id,
                  reviewedByUserName: state.currentUser.name,
                  reviewedAt: now,
                }
              : i
          ),
        });
        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'APPROVE_INCENTIVE',
          entityType: 'incentive',
          entityId: id,
          details: `Approved incentive of ₹${finalAmount.toLocaleString('en-IN')} for ${inc.employeeName} (${inc.period}).`,
        });
      },

      disburseIncentiveSettlement: (id, reference) => {
        const state = get();
        const inc = (state.incentiveSettlements || []).find((i) => i.id === id);
        if (!inc) return;
        const now = new Date().toISOString();
        set({
          incentiveSettlements: (state.incentiveSettlements || []).map((i) =>
            i.id === id
              ? {
                  ...i,
                  status: 'paid',
                  paidIncentive: i.approvedIncentive || i.calculatedIncentive,
                  paymentReference: reference,
                  paidAt: now,
                }
              : i
          ),
        });
        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'DISBURSE_INCENTIVE',
          entityType: 'incentive',
          entityId: id,
          details: `Disbursed performance incentive of ₹${(inc.approvedIncentive || inc.calculatedIncentive).toLocaleString('en-IN')} to ${inc.employeeName} (Ref: ${reference}).`,
        });
        state.addNotification({
          userId: inc.userId,
          title: 'Incentive Disbursed',
          message: `Your approved commission of ₹${(inc.approvedIncentive || inc.calculatedIncentive).toLocaleString('en-IN')} has been cleared. Ref: ${reference}`,
          type: 'success',
        });
      },

      createJournalEntry: (entryData) => {
        const state = get();
        const nextNum = (state.journalEntries || []).length + 1;
        const voucherNumber = entryData.voucherNumber || `JV-2026-${String(nextNum).padStart(3, '0')}`;
        const newEntry: JournalEntry = {
          id: `jv-${String(nextNum).padStart(3, '0')}`,
          voucherNumber,
          date: entryData.date || new Date().toISOString().split('T')[0],
          referenceType: entryData.referenceType,
          referenceId: entryData.referenceId,
          description: entryData.description,
          lines: entryData.lines,
          totalDebit: entryData.totalDebit,
          totalCredit: entryData.totalCredit,
          status: entryData.status || 'posted',
          createdByUserName: state.currentUser.name,
          createdAt: new Date().toISOString(),
        };

        // If posted, update accounts in chartOfAccounts
        let updatedAccounts = [...(state.chartOfAccounts || [])];
        if (newEntry.status === 'posted') {
          newEntry.lines.forEach((line) => {
            updatedAccounts = updatedAccounts.map((acc) => {
              if (acc.code === line.accountCode) {
                // Asset / Expense: debit increases, credit decreases
                if (acc.type === 'asset' || acc.type === 'expense') {
                  return { ...acc, currentBalance: acc.currentBalance + line.debit - line.credit };
                }
                // Liability / Equity / Revenue: credit increases, debit decreases
                return { ...acc, currentBalance: acc.currentBalance + line.credit - line.debit };
              }
              return acc;
            });
          });
        }

        set({
          journalEntries: [newEntry, ...(state.journalEntries || [])],
          chartOfAccounts: updatedAccounts,
        });

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'POST_JOURNAL_VOUCHER',
          entityType: 'journal_entry',
          entityId: newEntry.id,
          details: `Created Journal Voucher ${voucherNumber} with ${newEntry.lines.length} lines. Total: ₹${newEntry.totalDebit.toLocaleString('en-IN')}`,
        });

        return newEntry;
      },

      postJournalEntry: (id) => {
        const state = get();
        const entry = (state.journalEntries || []).find((j) => j.id === id);
        if (!entry || entry.status === 'posted') return;
        set({
          journalEntries: (state.journalEntries || []).map((j) =>
            j.id === id ? { ...j, status: 'posted' } : j
          ),
        });
        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'POST_JOURNAL_ENTRY',
          entityType: 'journal_entry',
          entityId: id,
          details: `Posted Journal Voucher ${entry.voucherNumber}.`,
        });
      },

      recordSupplierPayment: (supplierId, amount, paymentMode, reference, poId, notes) => {
        const state = get();
        const supplier = (state.suppliers || []).find((s) => s.id === supplierId);
        if (!supplier) return;
        const validAmount = Number(amount) || 0;

        set({
          suppliers: (state.suppliers || []).map((s) => {
            if (s.id === supplierId) {
              const currentBal = s.outstandingPayable ?? s.outstandingBalance ?? 0;
              const newBal = Math.max(0, currentBal - validAmount);
              return { ...s, outstandingPayable: newBal, outstandingBalance: newBal };
            }
            return s;
          }),
        });

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'RECORD_SUPPLIER_PAYMENT',
          entityType: 'supplier',
          entityId: supplierId,
          details: `Recorded supplier payment of ₹${validAmount.toLocaleString('en-IN')} to ${supplier.name} via ${paymentMode}. Ref: ${reference}${poId ? ` (PO: ${poId})` : ''}`,
        });

        state.addNotification({
          userId: 'all',
          title: 'Supplier Payment Disbursed',
          message: `Disbursed ₹${validAmount.toLocaleString('en-IN')} to ${supplier.name}. Ref: ${reference}`,
          type: 'info',
        });
      },

      recordSupplierDebitCreditNote: (supplierId, type, amount, reference, reason) => {
        const state = get();
        const supplier = (state.suppliers || []).find((s) => s.id === supplierId);
        if (!supplier) return;
        const validAmount = Number(amount) || 0;
        const balanceChange = type === 'credit_note' ? -validAmount : validAmount;

        set({
          suppliers: (state.suppliers || []).map((s) => {
            if (s.id === supplierId) {
              const currentBal = s.outstandingPayable ?? s.outstandingBalance ?? 0;
              const newBal = Math.max(0, currentBal + balanceChange);
              return { ...s, outstandingPayable: newBal, outstandingBalance: newBal };
            }
            return s;
          }),
        });

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: type === 'credit_note' ? 'RECORD_SUPPLIER_CREDIT_NOTE' : 'RECORD_SUPPLIER_DEBIT_NOTE',
          entityType: 'supplier',
          entityId: supplierId,
          details: `Issued ${type.replace('_', ' ')} of ₹${validAmount.toLocaleString('en-IN')} for ${supplier.name}. Ref: ${reference}. Reason: ${reason}`,
        });
      },

      verifyCustomerRemittance: (remittanceId, verified, notes) => {
        const state = get();
        const rem = (state.salesRemittances || []).find((r) => r.id === remittanceId);
        if (!rem) return;
        const now = new Date().toISOString();

        set({
          salesRemittances: (state.salesRemittances || []).map((r) =>
            r.id === remittanceId
              ? {
                  ...r,
                  status: verified ? 'verified' : 'discrepancy',
                  verifiedByUserId: state.currentUser.id,
                  verifiedByUserName: state.currentUser.name,
                  verifiedAt: now,
                  notes: notes || r.notes,
                }
              : r
          ),
        });

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: verified ? 'VERIFY_CUSTOMER_REMITTANCE' : 'FLAG_REMITTANCE_DISCREPANCY',
          entityType: 'remittance',
          entityId: remittanceId,
          details: `${verified ? 'Verified' : 'Flagged discrepancy for'} customer remittance of ₹${rem.amount.toLocaleString('en-IN')} from ${rem.customerName || rem.salesUserName}.`,
        });

        state.addNotification({
          userId: rem.salesUserId,
          title: verified ? 'Payment Remittance Cleared' : 'Remittance Discrepancy Flagged',
          message: verified
            ? `Finance verified your customer collection receipt for ₹${rem.amount.toLocaleString('en-IN')}.`
            : `Discrepancy noted in remittance ${rem.entryNumber}: ${notes || 'Please provide updated bank counterfoil.'}`,
          type: verified ? 'success' : 'alert',
        });
      },

      recordCustomerPaymentReceipt: (customerId, amount, paymentMode, reference, orderId, invoiceId, notes) => {
        const state = get();
        const customer = (state.customers || []).find((c) => c.id === customerId);
        if (!customer) return;
        const validAmount = Number(amount) || 0;
        const now = new Date().toISOString();

        // 1. Update customer balance
        const updatedCustomers = (state.customers || []).map((c) =>
          c.id === customerId
            ? { ...c, currentOutstanding: Math.max(0, c.currentOutstanding - validAmount) }
            : c
        );

        // 2. Update linked order if provided
        let updatedOrders = [...(state.salesOrders || [])];
        if (orderId) {
          updatedOrders = updatedOrders.map((o) => {
            if (o.id === orderId || o.orderNumber === orderId) {
              const currentPaid = Number(o.amountPaid) || 0;
              const newPaid = currentPaid + validAmount;
              const newPayStatus = newPaid >= o.totalAmount ? 'paid' : 'partially_paid';
              return { ...o, amountPaid: newPaid, paymentStatus: newPayStatus };
            }
            return o;
          });
        }

        // 3. Update linked invoice if provided
        let updatedInvoices = [...(state.invoices || [])];
        if (invoiceId) {
          updatedInvoices = updatedInvoices.map((inv) => {
            if (inv.id === invoiceId || inv.invoiceNumber === invoiceId) {
              const currentPaid = Number(inv.paidAmount) || 0;
              const newPaid = currentPaid + validAmount;
              const newOutstanding = Math.max(0, inv.totalAmount - newPaid);
              const newPayStatus = newPaid >= inv.totalAmount ? 'paid' : 'partially_paid';
              return {
                ...inv,
                paidAmount: newPaid,
                outstandingBalance: newOutstanding,
                paymentStatus: newPayStatus,
                status: newPaid >= inv.totalAmount ? 'paid' : 'partially_paid',
                paymentDate: now.split('T')[0],
                paymentMode,
                paymentReference: reference,
              };
            }
            return inv;
          });
        }

        // 4. Add remittance record
        const nextRemNo = `COL-2026-${String((state.salesRemittances || []).length + 1).padStart(3, '0')}`;
        const newRemittance: SalesRemittanceEntry = {
          id: `rem-${Date.now()}`,
          entryNumber: nextRemNo,
          date: now.split('T')[0],
          salesUserId: state.currentUser.id,
          salesUserName: state.currentUser.name,
          userRole: state.currentUser.role,
          regionId: customer.regionId,
          type: 'collection_from_customer',
          customerId: customer.id,
          customerName: customer.name,
          companyBankAccount: 'HDFC Bank Ltd - A/c 502000889921',
          amount: validAmount,
          paymentMode: (paymentMode.toLowerCase().includes('neft')
            ? 'neft_rtgs'
            : paymentMode.toLowerCase().includes('cheque')
            ? 'cheque'
            : paymentMode.toLowerCase().includes('cash')
            ? 'cash'
            : 'upi') as any,
          referenceNumber: reference,
          proofAttachmentName: 'digital_bank_credit_advice.pdf',
          proofType: 'deposit_slip',
          status: 'verified',
          verifiedByUserId: state.currentUser.id,
          verifiedByUserName: state.currentUser.name,
          verifiedAt: now,
          notes,
        };

        set({
          customers: updatedCustomers,
          salesOrders: updatedOrders,
          invoices: updatedInvoices,
          salesRemittances: [newRemittance, ...(state.salesRemittances || [])],
        });

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'RECORD_CUSTOMER_RECEIPT',
          entityType: 'remittance',
          entityId: newRemittance.id,
          details: `Recorded receipt of ₹${validAmount.toLocaleString('en-IN')} from ${customer.name} via ${paymentMode}. Ref: ${reference}`,
        });

        state.addNotification({
          userId: customer.assignedSalesUserId || 'all',
          title: 'Payment Credited',
          message: `Customer ${customer.name} paid ₹${validAmount.toLocaleString('en-IN')}. Receipt Ref: ${reference}.`,
          type: 'success',
        });
      },

      settleEmployeeExpense: (claimId, settledAmount, paymentMode, reference) => {
        const state = get();
        const claim = (state.expenseClaims || []).find((e) => e.id === claimId);
        if (!claim) return;
        const now = new Date().toISOString();
        const finalAmount = Number(settledAmount) || claim.amount;

        set({
          expenseClaims: (state.expenseClaims || []).map((e) =>
            e.id === claimId
              ? {
                  ...e,
                  status: 'paid',
                  settledAmount: finalAmount,
                  paymentMode: paymentMode as any,
                  paymentReference: reference,
                  settledByUserId: state.currentUser.id,
                  settledByUserName: state.currentUser.name,
                  paidAt: now,
                }
              : e
          ),
        });

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'SETTLE_EMPLOYEE_EXPENSE',
          entityType: 'expense',
          entityId: claimId,
          details: `Settled expense claim ${claim.claimNumber} of ₹${finalAmount.toLocaleString('en-IN')} for ${claim.userName} via ${paymentMode}. Ref: ${reference}`,
        });

        state.addNotification({
          userId: claim.userId,
          title: 'Expense Claim Reimbursed',
          message: `Your claim ${claim.claimNumber} of ₹${finalAmount.toLocaleString('en-IN')} has been reimbursed via ${paymentMode}. Ref: ${reference}`,
          type: 'success',
        });
      },

      rejectEmployeeExpense: (claimId, reason) => {
        const state = get();
        const claim = (state.expenseClaims || []).find((e) => e.id === claimId);
        if (!claim) return;
        const now = new Date().toISOString();

        set({
          expenseClaims: (state.expenseClaims || []).map((e) =>
            e.id === claimId
              ? {
                  ...e,
                  status: 'rejected',
                  rejectionReason: reason,
                  reviewedByUserId: state.currentUser.id,
                  reviewedByUserName: state.currentUser.name,
                  reviewedAt: now,
                }
              : e
          ),
        });

        state.addAuditLog({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          userRole: state.currentUser.role,
          action: 'REJECT_EXPENSE_CLAIM',
          entityType: 'expense',
          entityId: claimId,
          details: `Rejected expense claim ${claim.claimNumber} for ${claim.userName}. Reason: ${reason}`,
        });

        state.addNotification({
          userId: claim.userId,
          title: 'Expense Claim Rejected',
          message: `Your claim ${claim.claimNumber} was not approved by Finance. Reason: ${reason}`,
          type: 'alert',
        });
      },

      // Reset to Seed Data
      resetToDemoData: () => {
        set({
          organizations: SEED_ORGANIZATIONS,
          currentOrganization: SEED_ORGANIZATIONS[0],
          currentUser: SEED_USERS[0],
          currentRole: 'admin',
          selectedRegionId: 'all',
          users: SEED_USERS,
          regions: SEED_REGIONS,
          warehouses: SEED_WAREHOUSES,
          categories: SEED_CATEGORIES,
          products: SEED_PRODUCTS,
          batches: SEED_BATCHES,
          customers: SEED_CUSTOMERS,
          salesOrders: SEED_SALES_ORDERS,
          customerDispatches: SEED_CUSTOMER_DISPATCHES,
          inwardReceipts: SEED_INWARD_RECEIPTS,
          stockMovements: SEED_STOCK_MOVEMENTS,
          fieldVisits: SEED_FIELD_VISITS,
          marketSurveys: SEED_MARKET_SURVEYS,
          expenseClaims: SEED_EXPENSE_CLAIMS,
          walletTransactions: SEED_WALLET_TRANSACTIONS,
          salesTargets: SEED_SALES_TARGETS,
          marketingTargets: SEED_MARKETING_TARGETS,
          stockAdjustments: SEED_STOCK_ADJUSTMENTS,
          quotations: SEED_QUOTATIONS,
          salesRemittances: SEED_SALES_REMITTANCES,
          notifications: SEED_NOTIFICATIONS,
          auditLogs: SEED_AUDIT_LOGS,
          suppliers: SEED_SUPPLIERS,
          purchaseOrders: SEED_PURCHASE_ORDERS,
          transportPolicies: SEED_TRANSPORT_POLICIES,
          receivingDiscrepancies: SEED_RECEIVING_DISCREPANCIES,
          transitDamageIncidents: SEED_TRANSIT_INCIDENTS,
          customerReturns: SEED_CUSTOMER_RETURNS,
          attendanceRecords: SEED_ATTENDANCE_RECORDS,
          leaveRequests: SEED_LEAVE_REQUESTS,
          roleQueries: SEED_ROLE_QUERIES,
          invoices: SEED_INVOICES,
      budgetRequests: SEED_MARKETING_BUDGET_REQUESTS,
      financeClaims: SEED_FINANCE_CLAIMS,
      payrollRecords: SEED_PAYROLL_RECORDS,
      incentiveSettlements: SEED_INCENTIVE_SETTLEMENTS,
      chartOfAccounts: SEED_CHART_OF_ACCOUNTS,
      journalEntries: SEED_JOURNAL_ENTRIES,
        });
      },
    }),
    {
      name: 'tzmicha-erp-storage-v3',
    }
  )
);
