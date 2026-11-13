// Comprehensive Domain Type Definitions for ApexFlow Manufacturing & Regional ERP

export type UserRole = 'admin' | 'sales' | 'marketing' | 'store_manager' | 'finance' | 'service' | 'hr';

export type SubscriptionPlan = 'Standard' | 'Professional' | 'Enterprise';

export interface PlanLimits {
  title: string;
  price: string;
  description: string;
  maxEmployees: number; // e.g. 5, 20, 999 (unlimited)
  maxRegions: number;   // e.g. 1, 3, 999 (unlimited)
  maxWarehouses: number;// e.g. 1, 5, 999 (unlimited)
  features: string[];
}

export const PLAN_TIERS: Record<SubscriptionPlan, PlanLimits> = {
  Standard: {
    title: 'Standard Growth',
    price: '₹14,999 / mo',
    description: 'Ideal for emerging regional distributors & single-depot hubs.',
    maxEmployees: 5,
    maxRegions: 1,
    maxWarehouses: 1,
    features: [
      'Up to 5 Team Members',
      '1 Operational Territory',
      '1 Central Depot Hub',
      'Standard Sales & Quotations',
      'Basic Inward Receipts & GRN',
    ],
  },
  Professional: {
    title: 'Professional Multi-Depot',
    price: '₹34,999 / mo',
    description: 'Built for scaling manufacturers with distributed regional sales teams.',
    maxEmployees: 20,
    maxRegions: 3,
    maxWarehouses: 5,
    features: [
      'Up to 20 Team Members',
      '3 Regional Territories',
      '5 Distributed Warehouses',
      'Inter-Depot Cargo Transfers',
      'Sales Performance & Tiered Commissions',
      'Dynamic Discount Authorization Matrix',
    ],
  },
  Enterprise: {
    title: 'Enterprise Multi-Tenant',
    price: '₹79,999 / mo',
    description: 'Unlimited multi-tenant governance with full audit & custom limits.',
    maxEmployees: 999,
    maxRegions: 999,
    maxWarehouses: 999,
    features: [
      'Unlimited Team Members',
      'Unlimited Regional Territories',
      'Unlimited Warehouse Depots',
      'QC Quarantine & Lab Releases',
      'Physical Cycle Audits & Shrinkage Write-offs',
      'Customer Credit Risk Freezes',
      'Multi-Tenant Data Partitioning',
    ],
  },
};

export interface Organization {
  id: string;
  teamId: string; // Tenant Team / Organization Code (e.g. 'APEX-2026', 'TITAN-IND')
  name: string;
  legalName?: string;
  taxGstNumber?: string;
  industry?: string;
  currency?: string;
  logo?: string;
  plan: SubscriptionPlan;
  maxEmployees: number;
  maxRegions: number;
  maxWarehouses: number;
  registeredAt?: string;
  memberCount?: number;
  adminEmail?: string;
  adminName?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  salesSubRole?: 'sales_manager' | 'sales_coordinator' | 'sales_rep' | 'junior_sales';
  marketingSubRole?: 'marketing_manager' | 'marketing_senior' | 'marketing_junior';
  serviceSubRole?: 'manager' | 'coordinator' | 'engineer' | 'employee';
  avatar: string;
  phone: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  joiningDate?: string;
  reportingManager?: string;
  responsibilities?: string[];
  permissions?: string[];
  status?: 'active' | 'suspended' | 'invited' | 'inactive';
  organizationId?: string;
  teamId?: string; // Tenant Team ID
  assignedRegionId: string; // 'all' for admin or specific region id
  assignedWarehouseIds?: string[]; // For store managers
  maxDiscountPercent: number; // For sales users (e.g. 5, 8, 12%)
  monthlySalesTarget?: number; // In currency
  monthlyVisitTarget?: number; // In count
  walletBalance: number;
}

export interface Region {
  id: string;
  name: string;
  code: string;
  state: string;
  currency: string;
  headquarters: string;
  activeWarehousesCount: number;
  managerName?: string;
  targetRevenue?: number;
  coveredStates?: string[];
}

export interface Warehouse {
  id: string;
  regionId: string;
  name: string;
  code: string;
  address: string;
  capacitySqFt: number;
  managerId?: string;
  managerName?: string;
  locations: StorageLocation[];
}

export interface StorageLocation {
  id: string;
  warehouseId: string;
  code: string; // e.g. Aisle-1-Bay-A, Cold-Zone-1, Rack-03
  zone: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  code: string;
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  supplierCode?: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstin?: string;
  pan?: string;
  paymentTerms: string; // e.g. 'Net 30', 'Advance 50%', 'Net 15'
  rating?: number; // 1 to 5
  status: 'active' | 'inactive' | 'blacklisted';
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branch: string;
  };
  totalPurchasesAmount?: number;
  outstandingPayable?: number;
  outstandingBalance?: number;
  suppliedProductIds?: string[];
  suppliedProductNames?: string[];
  createdAt: string;
}

export interface PurchaseOrderLine {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  orderedQty: number;
  orderedQuantity?: number;
  receivedQty: number;
  acceptedQty: number;
  shortageQty: number;
  unit: string;
  purchaseUnitPrice: number;
  expectedLandedUnitCost?: number;
  taxRatePercent: number;
  taxAmount: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  createdAt?: string;
  expectedDeliveryDate: string;
  destinationRegionId: string;
  destinationWarehouseId: string;
  destinationWarehouseName?: string;
  lines: PurchaseOrderLine[];
  subtotal: number;
  expectedTransportCharges: number;
  taxAmount: number;
  totalCost: number;
  totalAmount?: number;
  status:
    | 'draft'
    | 'pending_approval'
    | 'approved'
    | 'sent_to_supplier'
    | 'partially_received'
    | 'fully_received'
    | 'rejected'
    | 'cancelled'
    | 'closed';
  notes?: string;
  createdByUserId: string;
  createdByUserName: string;
  assignedStorekeeperId?: string;
  assignedStorekeeperName?: string;
  approvedByUserId?: string;
  approvedAt?: string;
  rejectionReason?: string;
  activityHistory?: {
    timestamp?: string;
    date?: string;
    action: string;
    actor?: string;
    performedBy?: string;
    notes?: string;
  }[];
  inwardReceiptIds?: string[];
}

export type TransportCalculationMethod =
  | 'fixed_per_shipment'
  | 'per_unit'
  | 'per_kg'
  | 'percentage'
  | 'manual_actual';

export interface TransportChargePolicy {
  id: string;
  name: string;
  chargeType: 'freight' | 'loading_unloading' | 'packing' | 'handling' | 'delivery' | 'insurance';
  calculationMethod: TransportCalculationMethod;
  defaultRate: number;
  applicableRegionId?: string;
  applicableWarehouseId?: string;
  chargeTarget: 'company_expense' | 'customer_charge' | 'both';
  isTaxable: boolean;
  taxRatePercent: number;
  status: 'active' | 'inactive';
  description?: string;
}

export interface ReceivingDiscrepancy {
  id: string;
  discrepancyNumber?: string;
  receiptId: string;
  receiptNumber: string;
  poId?: string;
  poNumber?: string;
  supplierId?: string;
  supplierName: string;
  productId: string;
  productName: string;
  productSku: string;
  expectedQuantity: number;
  actualCountedQuantity: number;
  shortageQuantity: number;
  damagedQuantity: number;
  excessQuantity: number;
  unit?: string;
  unitCost?: number;
  financialValueAffected?: number;
  financialImpact?: number;
  financialImpactAmount?: number;
  discrepancyType:
    | 'shortage'
    | 'damaged'
    | 'excess'
    | 'quality_rejected'
    | 'Damaged Goods'
    | 'Shortage'
    | 'Excess Delivery'
    | 'Quality Failure'
    | 'Wrong SKU';
  type?: string;
  status:
    | 'pending_review'
    | 'open'
    | 'under_investigation'
    | 'supplier_confirmed'
    | 'replacement_expected'
    | 'credit_note_requested'
    | 'credit_note_received'
    | 'resolved'
    | 'closed';
  reportedByUserId: string;
  reportedByUserName: string;
  reportedAt: string;
  reason?: string;
  batchId?: string;
  batchNumber?: string;
  assignedStorekeeperName?: string;
  evidenceDocument?: string;
  evidenceDocUrl?: string;
  resolutionType?:
    | 'accept_available'
    | 'quarantine_damaged'
    | 'supplier_credit_note'
    | 'supplier_return'
    | 'supplier_replacement'
    | 'inventory_writeoff'
    | 'clarification_requested';
  resolutionNotes?: string;
  creditNoteNumber?: string;
  replacementReceiptId?: string;
  resolvedByUserId?: string;
  resolvedByUserName?: string;
  resolvedAt?: string;
  resolutionDecisionHistory?: { timestamp: string; action: string; reviewer: string; comments: string }[];
}

export type TransitResponsibility =
  | 'under_review'
  | 'supplier_responsibility'
  | 'transporter_responsibility'
  | 'company_responsibility'
  | 'undetermined';

export interface TransitDamageIncident {
  id: string;
  incidentNumber: string;
  receiptId: string;
  receiptNumber: string;
  poNumber?: string;
  supplierId?: string;
  supplierName: string;
  productId: string;
  productName: string;
  productSku: string;
  batchNumber?: string;
  damagedQuantity: number;
  unit: string;
  unitCost: number;
  totalDamageValue: number;
  transporterName: string;
  vehicleNumber: string;
  consignmentNoteNumber: string; // LR / Waybill #
  route: string;
  damageLocationDescription: string;
  reportedDate: string;
  reportedByUserName: string;
  evidenceAttachments?: string[];
  responsibilityStatus: TransitResponsibility;
  responsibilityNotes?: string;
  resolutionStatus: 'unresolved' | 'transporter_claim_filed' | 'supplier_credit_requested' | 'insurance_claim_filed' | 'absorbed_by_company';
  resolutionNotes?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  unit: string; // Base unit e.g. 'Drums (200L)', 'Units', 'Bags (50kg)'
  purchaseUnit?: string; // Purchase unit e.g. 'Cartons (12 Pcs)'
  salesUnit?: string; // Sales unit e.g. 'Individual Pcs'
  conversionFactor?: number; // e.g. 12 (1 purchase unit = 12 base units)
  description: string;
  minOrderQuantity: number;
  lowStockThreshold: number;
  
  // Product Sourcing Classification (Phase 1)
  productSource?: 'supplier_sourced' | 'self_manufactured';
  supplierId?: string; // Referenced when productSource === 'supplier_sourced'
  supplierName?: string;
  manufacturingFacility?: string; // Referenced when productSource === 'self_manufactured'
  
  // Itemized Costing Breakdowns (Product Costing & Pricing Engine)
  supplierCostBreakdown?: SupplierCostBreakdown;
  manufacturingCostBreakdown?: ManufacturingCostBreakdown;
  isTaxInclusive?: boolean; // false = base price + GST; true = base price includes GST
  inputTaxRecoverable?: boolean; // true = input tax credit (ITC) eligible, not capitalized into product cost
  nonRecoverableTaxAmount?: number; // optional tax capitalized if ITC not applicable
  estimatedMonthlySalesVolume?: number; // mock sales volume for projected profit analysis

  // Pricing policies (Actual cost is strictly ADMIN-ONLY)
  actualCost: number; // Secret Landed/Manufacturing Cost (Admin only)
  standardPurchaseCost?: number; // Quoted supplier purchase cost
  actualLandedCost?: number; // Realized landed cost inclusive of freight & duties
  manufacturingCost?: number; // Factory manufacturing cost
  standardSellingPrice: number; // Base selling price
  dealerPrice?: number; // Tier-1 Dealer wholesale price
  minAllowedPrice: number; // Absolute floor price
  defaultMaxDiscountPercent: number; // Company default limit (e.g. 10%)
  promotionalDiscountPercent?: number; // Smart promotional discount configured by Admin
  discountReason?: string; // e.g. "Festive Clearance", "Volume Dealer Offer"
  discountValidUntil?: string;
  hsnCode: string;
  taxRatePercent: number; // e.g. 18% GST
  image?: string;
}

export interface SupplierCostBreakdown {
  purchasePrice: number; // Supplier invoice base cost
  freightTransportation: number; // Inbound transit & transport
  loadingUnloading: number; // Hamali / labor for offloading
  handlingCharges: number; // Warehouse handling & repacking
  packagingCost: number; // Secondary protective packaging
  otherAcquisitionCosts: number; // Insurance, octroi, clearance fees
}

export interface ManufacturingCostBreakdown {
  rawMaterialCost: number; // Direct active chemical & polymer ingredients
  directLaborCost: number; // Plant operators & formulation technicians
  packagingCost: number; // Drums, containers, seals, warning labels
  manufacturingOverhead: number; // Power/electricity, reactor runtime, machinery wear
  qualityTestingCost: number; // QA/QC lab batch assays & compliance certificates
  wastageScrapCost: number; // Formulation yield losses & residue scrap
  otherProductionCosts: number; // Safety PPE, plant environmental compliance
}

export interface Batch {
  id: string;
  batchNumber: string;
  productId: string;
  productSku: string;
  productName: string;
  regionId: string;
  warehouseId: string;
  locationId: string;
  initialQuantity: number;
  totalQuantity?: number;
  availableQuantity: number;
  reservedQuantity: number;
  dispatchedQuantity: number;
  manufacturingDate: string;
  expiryDate: string;
  actualUnitCost: number; // Admin only
  clearanceDiscountPercent?: number; // Special liquidation / near-expiry discount allowed for reps
  discountReason?: string;
  discountValidUntil?: string;
  status: 'active' | 'exhausted' | 'near_expiry' | 'expired';
  // Enhanced Supplier Inward & Inspection Traceability
  supplierId?: string;
  supplierName?: string;
  purchaseOrderId?: string;
  poNumber?: string;
  grnId?: string;
  grnNumber?: string;
  receivedAt?: string;
  expectedQuantity?: number;
  receivedQuantity?: number;
  acceptedQuantity?: number;
  damagedQuantity?: number;
  shortageQuantity?: number;
  batchValue?: number;
  assignedStorekeeperId?: string;
  assignedStorekeeperName?: string;
  inspectionStatus?: 'pending_inspection' | 'accepted' | 'quarantined' | 'rejected' | 'partially_accepted';
  remarks?: string;
  documents?: string[];
}

export interface StockMovement {
  id: string;
  timestamp: string;
  movementType: 'inward_receipt' | 'outward_dispatch' | 'transfer_in' | 'transfer_out' | 'adjustment_positive' | 'adjustment_negative' | 'return' | 'dispatch';
  productId: string;
  productName: string;
  productSku: string;
  batchId?: string;
  batchNumber?: string;
  regionId: string;
  regionName?: string;
  warehouseId: string;
  warehouseName?: string;
  quantity: number;
  referenceType: 'inward_receipt' | 'sales_order' | 'transfer' | 'adjustment' | 'return' | 'dispatch';
  referenceId: string;
  performedByUserId: string;
  performedByUserName: string;
  unitCostAtMovement?: number; // Admin visible only
  remarks: string;
}

export interface InwardReceipt {
  id: string;
  receiptNumber: string;
  date: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  poId?: string;
  poNumber?: string;
  supplierId?: string;
  supplierName: string;
  supplierInvoiceNumber: string;
  regionId: string;
  warehouseId: string;
  storageLocationId: string;
  productId: string;
  productName: string;
  productSku: string;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  expectedQuantity?: number; // Planned inward count from PO
  receivedQuantity: number; // Gross physical count
  actualCountedQuantity?: number; // Verified physical count
  acceptedQuantity?: number; // Passed QC / eligible for sellable inventory
  shortageQuantity?: number; // Expected - Received (if > 0)
  damagedQuantity?: number; // Physically broken or leaked
  excessQuantity?: number; // Received - Expected (if > 0)
  unit: string;
  actualUnitCost: number; // Admin restricted landed unit cost
  totalCost: number;
  transportExpensePaidByCompany?: number; // Inward freight paid by enterprise
  discrepancyId?: string;
  discrepancyStatus?: 'none' | 'pending_review' | 'open' | 'under_investigation' | 'supplier_confirmed' | 'replacement_expected' | 'credit_note_requested' | 'credit_note_received' | 'resolved' | 'closed';
  status:
    | 'draft'
    | 'expected'
    | 'received'
    | 'awaiting_inspection'
    | 'pending_admin_approval'
    | 'partially_accepted'
    | 'accepted'
    | 'rejected'
    | 'returned'
    | 'batch_recorded'
    | 'stock_available';
  goodQuantity?: number;
  inspectionNotes?: string;
  adminDecision?:
    | 'accept_good_return_damaged'
    | 'partial_acceptance'
    | 'reject_full_shipment'
    | 'full_rejection'
    | 'hold_for_clarification';
  adminDecisionNotes?: string;
  adminDecisionDate?: string;
  transporterName?: string;
  consignmentNoteNumber?: string;
  vehicleNumber?: string;
  damageEvidenceAttachments?: string[];
  returnGatePassNumber?: string;
  stockPostedAt?: string;
  stockPostedByUserId?: string;
  receivedByUserId: string;
  receivedByUserName: string;
  attachmentFileName?: string;
  notes?: string;
}

export interface CustomerDispatchItem {
  productId: string;
  productSku: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface CustomerDispatch {
  id: string; // e.g. DSP-2026-001
  dispatchNumber: string;
  salesOrderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  originatingWarehouseId: string;
  regionId: string;
  assignedStorekeeperId: string;
  assignedStorekeeperName: string;
  dispatchDate: string;
  deliveryStatus: 'preparing' | 'in_transit' | 'delivered' | 'returned';
  items: CustomerDispatchItem[];
  trackingNumber: string;
  transporterName?: string;
  vehicleNumber?: string;
  totalDeliveryExpenses?: number;
  notes?: string;
}

export interface CustomerReturnRecord {
  id: string;
  returnNumber: string; // e.g. 'RET-2026-001'
  salesOrderId: string;
  salesOrderNumber: string;
  invoiceNumber?: string;
  customerId: string;
  customerName: string;
  returnDate: string;
  productId: string;
  productName: string;
  productSku: string;
  returnedQuantity: number;
  unit: string;
  refundOrCreditAmount: number;
  returnReason: string;
  status:
    | 'pending_service_inspection'
    | 'inspected_approved'
    | 'restocked_to_inventory'
    | 'credit_note_issued'
    | 'rejected_by_service';
  serviceInspectionNotes?: string;
  inspectedByUserName?: string;
  creditNoteNumber?: string;
  creditNoteDate?: string;
}

export interface Customer {
  id: string;
  code?: string;
  name: string;
  businessName: string;
  type: 'dealer' | 'distributor' | 'retailer' | 'direct_customer';
  regionId: string;
  assignedSalesUserId?: string;
  assignedMarketingUserId?: string;
  contactPerson?: string;
  phone: string;
  email: string;
  address: string;
  billingAddress?: string;
  shippingAddress?: string;
  gstin?: string;
  paymentTerms?: string; // e.g. 'Net 30', 'Net 45', 'Immediate'
  creditLimit: number;
  currentOutstanding: number;
  customDiscountTierPercent?: number;
  onboardingDate: string;
  status: 'active' | 'prospect' | 'inactive';
  customerTypeClassification?: 'new' | 'existing';
  totalCompletedOrders?: number;
  totalLifetimeRevenue?: number;
  lastOrderDate?: string;
}

export interface SalesOrderItem {
  productId: string;
  productSku: string;
  productName: string;
  unit: string;
  quantity: number;
  standardPrice: number;
  discountPercent: number;
  quotedUnitPrice: number;
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  allocations: BatchAllocation[]; // Batch allocations
}

export interface BatchAllocation {
  batchId: string;
  batchNumber: string;
  allocatedQuantity: number;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  customerType: string;
  regionId: string;
  salesUserId: string;
  salesUserName: string;
  items: SalesOrderItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  totalAmount: number;
  
  // Transport & Delivery charges governance
  companyTransportExpense?: number; // Actual freight paid to carrier by company (e.g. ₹1,000)
  customerDeliveryCharge?: number; // Delivery fee invoiced to customer (e.g. ₹700)
  transportRecoveryVariance?: number; // customerDeliveryCharge - companyTransportExpense (e.g. -₹300)
  carrierName?: string;
  trackingNumber?: string;
  shippingAddress?: string;
  billingAddress?: string;
  paymentTerms?: string;
  
  // Status transitions
  // draft -> stock_verified -> reservation_confirmed -> picking -> dispatched -> completed / cancelled
  status: 'draft' | 'pending_discount_approval' | 'stock_verified' | 'reserved' | 'picking' | 'dispatched' | 'completed' | 'cancelled';
  
  // Discount approval flow
  requiresDiscountApproval: boolean;
  discountApprovalStatus?: 'pending' | 'approved' | 'rejected' | 'not_required';
  discountApprovedBy?: string;
  discountApprovedAt?: string;
  discountApprovalReason?: string;
  
  // Payment tracking
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid';
  amountPaid: number;
  
  // Dispatch details
  warehouseId?: string;
  dispatchedAt?: string;
  dispatchedByUserId?: string;
  dispatchedByUserName?: string;
  dispatchTrackingNumber?: string;
  
  notes?: string;
}

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
export type InvoicePaymentStatus = 'unpaid' | 'partially_paid' | 'paid';
export type InvoiceSource = 'sales_order_payment' | 'admin_manual';

export interface InvoiceItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  batchId?: string;
  batchNumber?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxRatePercent: number;
  taxAmount: number;
  netAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. 'INV-2026-001'
  customerId: string;
  customerName: string;
  customerCode?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGstin?: string;
  orderId?: string;
  orderNumber?: string;
  regionId: string;
  regionName?: string;
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  status: InvoiceStatus;
  paymentStatus: InvoicePaymentStatus;
  source: InvoiceSource;
  createdByUserId: string;
  createdByUserName: string;
  createdByUserRole: UserRole;
  items: InvoiceItem[];
  paymentMode?: string;
  paymentReference?: string;
  paymentDate?: string;
  notes?: string;
  // Additive Multi-Company & GST Compliance Fields
  companyProfileId?: string;
  templateId?: string;
  companySnapshot?: Record<string, any>;
  templateSnapshot?: Record<string, any>;
  placeOfSupplyState?: string;
  isInterstate?: boolean;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  hsnTaxSummary?: Array<{
    hsnCode: string;
    taxableValue: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
    totalTax: number;
  }>;
  amountInWords?: string;
  roundOff?: number;
  reverseCharge?: boolean;
  // Simulated communication logs
  emailSent?: boolean;
  emailSentAt?: string;
  emailRecipient?: string;
  whatsAppSent?: boolean;
  whatsAppSentAt?: string;
  whatsAppRecipient?: string;
}

export interface FieldVisit {
  id: string;
  marketingUserId: string;
  marketingUserName: string;
  regionId: string;
  customerId?: string;
  prospectName?: string;
  customerType: 'dealer' | 'distributor' | 'retailer' | 'direct_customer' | 'prospect';
  visitDate: string;
  checkInTime: string;
  checkOutTime?: string;
  purpose: 'dealer_acquisition' | 'product_demo' | 'stock_check' | 'payment_followup' | 'promotional_event' | 'routine_visit';
  locationAddress: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  outcomeNotes?: string;
  followUpDate?: string;
  competitorBrandsObserved?: string;
  estimatedMonthlyDemand?: string;
  hasSampleGiven: boolean;
  sampleItemGiven?: string;
  hasExpenseClaimLinked: boolean;
  linkedExpenseClaimId?: string;
  mockAttachmentName?: string;
}

export interface MarketSurvey {
  id: string;
  marketingUserId: string;
  marketingUserName: string;
  regionId: string;
  date: string;
  dealerName: string;
  competitorBrand: string;
  competitorProduct: string;
  competitorPricePerUnit: number;
  ourEquivalentProduct: string;
  ourSellingPrice: number;
  priceDifference: number; // e.g. competitor is cheaper by 5%
  dealerFeedback: string;
  marketDemandStatus: 'high' | 'moderate' | 'low';
}

export type ExpenseCategory =
  | 'travel'
  | 'fuel'
  | 'accommodation'
  | 'food'
  | 'customer_meeting'
  | 'sample_promotion'
  | 'vehicle_maintenance'
  | 'transportation_freight'
  | 'loading_unloading'
  | 'delivery_manpower'
  | 'packaging_handling'
  | 'tolls_parking'
  | 'general_operational';

export interface ExpenseClaim {
  id: string;
  claimNumber: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  department?: string;
  regionId: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  receiptAttachment?: string;
  proofType?: 'image' | 'receipt_pdf' | 'mock_doc' | 'receipt' | 'bill' | 'statement' | 'invoice';
  proofUrl?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  submittedAt?: string;
  reviewedByUserId?: string;
  reviewedByUserName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  adminNotes?: string;
  paidAt?: string;
  paymentMode?: 'bank_transfer' | 'upi' | 'wallet_credit' | 'petty_cash';
  paymentMethod?: string;
  paymentReference?: string;
  settledByUserId?: string;
  settledByUserName?: string;
  settledAmount?: number;
  linkedVisitId?: string;
  linkedDispatchId?: string;
  linkedOrderId?: string;
  linkedCustomerId?: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  date: string;
  type: 'advance_issued' | 'expense_reimbursement' | 'expense_deduction' | 'settlement';
  amount: number;
  balanceAfter: number;
  referenceType: 'expense_claim' | 'admin_advance' | 'settlement';
  referenceId: string;
  description: string;
  processedByUserId: string;
}

export interface SalesTarget {
  id: string;
  userId: string;
  userName: string;
  regionId: string;
  period: string; // e.g. 'October 2026'
  // Per-unit target structure:
  targetUnits?: number; // e.g. 500 units
  achievedUnits?: number; // e.g. 412 units
  amountPerUnit?: number; // e.g. 3000 (₹ per unit)
  unitCategory?: string; // e.g. 'Industrial Solvents & Coatings' | 'All Commercial Units'
  unitMeasurement?: string; // e.g. 'Units', 'Cartons', 'Liters', 'Drums'
  targetAmount: number; // targetUnits * amountPerUnit
  achievedAmount: number; // achievedUnits * amountPerUnit
  ordersCount: number;
  newCustomersCount: number;
  customersHandledCount?: number; // Count of active customers handled
  quotationsTarget?: number; // Target number of quotations
  quotationsAchieved?: number; // Quotations created
  quotationsConverted?: number; // Quotations successfully converted
  incentivePerUnit?: number; // Incentive per unit (₹)
  incentiveEstimate: number;
}

export interface MarketingTarget {
  id: string;
  userId: string;
  userName: string;
  regionId: string;
  period: string; // e.g. 'October 2026'
  targetVisits: number;
  completedVisits: number;
  ratePerVisit?: number; // e.g. 300 (₹ per physical visit)
  targetNewDealers: number;
  achievedNewDealers: number;
  bountyPerDealer?: number; // e.g. 2500 (₹ bounty per dealer onboarded)
  expenseBudget: number; // targetVisits * ratePerVisit
  submittedExpenses: number;
  customersHandledCount?: number;
  quotationsAssistedCount?: number;
}

export interface StockAdjustment {
  id: string;
  adjustmentNumber: string;
  regionId: string;
  warehouseId: string;
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  previousQuantity: number;
  newQuantity: number;
  difference: number;
  reason: 'damage' | 'leakage' | 'spillage' | 'count_discrepancy' | 'sample_dispensed' | 'expired_writeoff';
  status: 'pending_approval' | 'approved' | 'rejected';
  requestedByUserId: string;
  requestedByUserName: string;
  approvedByUserId?: string;
  approvedByUserName?: string;
  date: string;
  notes: string;
}

export interface QuotationItem {
  productId: string;
  productName: string;
  unitPrice: number;
  qty: number;
  discountPercent: number;
  taxRate: number;
  lineTotal: number;
}

export interface Quotation {
  id: string;
  quotationNo: string;
  senderName: string; // The person / representative who submitted / sent the RFQ / inquiry
  senderCompany: string; // Firm / Dealership / Corporate entity
  senderEmail?: string;
  senderPhone?: string;
  customerId?: string;
  customerName: string;
  regionId: string;
  assignedSalesUserId?: string;
  assignedSalesUserName?: string;
  createdDate: string;
  validUntil: string;
  status: 'Unassigned' | 'Draft' | 'Sent' | 'Awaiting Approval' | 'Accepted' | 'Converted' | 'Rejected' | 'Expired';
  priority: 'Normal' | 'High' | 'Urgent';
  notes?: string;
  items: QuotationItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  convertedOrderNo?: string | null;
  assignedAt?: string;
  assignedByUserId?: string;
  // Additive Multi-Company & GST Compliance Fields
  companyProfileId?: string;
  templateId?: string;
  companySnapshot?: Record<string, any>;
  templateSnapshot?: Record<string, any>;
  placeOfSupplyState?: string;
  isInterstate?: boolean;
  hsnTaxSummary?: Array<{
    hsnCode: string;
    taxableValue: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
    totalTax: number;
  }>;
}

export interface SalesRemittanceEntry {
  id: string;
  entryNumber: string; // e.g. REM-2026-041 or COL-2026-082
  date: string;
  salesUserId: string;
  salesUserName: string;
  userRole: UserRole;
  regionId: string;
  type: 'collection_from_customer' | 'remittance_to_company';
  customerId?: string;
  customerName?: string;
  companyBankAccount?: string; // e.g. 'HDFC Bank Ltd - A/c 502000889921', 'ICICI Central Operations Escrow'
  amount: number;
  paymentMode: 'cash' | 'cheque' | 'neft_rtgs' | 'upi';
  referenceNumber: string; // Cheque No, UTR, Bank Deposit Ref
  proofAttachmentName: string; // e.g. 'hdfc_deposit_counterfoil_65000.png'
  proofAttachmentUrl?: string;
  proofType: 'deposit_slip' | 'bank_statement_screenshot' | 'cheque_photo' | 'cash_receipt';
  status: 'verified' | 'pending_verification' | 'discrepancy';
  verifiedByUserId?: string;
  verifiedByUserName?: string;
  verifiedAt?: string;
  discrepancyReason?: string;
  notes?: string;
}

export interface Notification {
  id: string;
  userId: string; // or 'role:admin', 'all'
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType:
    | 'product'
    | 'batch'
    | 'order'
    | 'receipt'
    | 'inward_receipt'
    | 'transit_incident'
    | 'pricing'
    | 'expense'
    | 'stock'
    | 'user'
    | 'quotation'
    | 'remittance'
    | 'supplier'
    | 'purchase_order'
    | 'discrepancy'
    | 'transport'
    | 'wallet'
    | 'dispatch'
    | 'invoice'
    | 'finance_claim'
    | 'payroll'
    | 'incentive'
    | 'journal_entry'
    | 'budget_request';
  entityId: string;
  details: string;
  regionId?: string;
}

// ─── Attendance & Leave Management Types ───
export type AttendanceStatus = 'present' | 'late' | 'on_leave' | 'absent' | 'half_day';

export interface PlanOfActionItem {
  id: string;
  task: string;
  targetMetric?: string;
  completed: boolean;
}

export interface EmployeeAttendanceRecord {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  avatar: string;
  roleTitle: string;
  department: string;
  date: string; // YYYY-MM-DD
  checkInTime?: string; // e.g. "09:04 AM"
  checkOutTime?: string; // e.g. "06:12 PM"
  workHours?: string; // e.g. "9h 08m"
  status: AttendanceStatus;
  punchMethod: 'Biometric Fingerprint' | 'Mobile GPS Geofence' | 'Web Portal';
  location: string; // e.g. "Delhi Okhla HQ", "Bhiwandi Depot", "Peenya Warehouse", "Field GPS"
  notes?: string;
  linkedLeaveId?: string;

  // Daily Plan of Action (POA)
  planOfAction?: string;
  planOfActionItems?: PlanOfActionItem[];
  planStatus?: 'planned' | 'in_progress' | 'completed' | 'partially_completed';
  poaProgressPercent?: number;
  supervisorFeedback?: string;
}

export type LeaveType = 'Casual Leave' | 'Sick Leave' | 'Paid Privilege Leave' | 'Comp-off' | 'Maternity/Paternity';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveDecisionLog {
  decidedBy: string;
  decidedAt: string;
  status: LeaveStatus;
  comment?: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  avatar: string;
  roleTitle: string;
  department: string;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  durationDays: number;
  reason: string;
  submittedAt: string; // YYYY-MM-DD
  status: LeaveStatus;
  emergencyContact?: string;
  decision?: LeaveDecisionLog;
}

// ─── Non-Admin Role Queries & Helpdesk Chat Types ───
export type QueryCategory =
  | 'Sales & Quotations'
  | 'Stock & Inventory Discrepancy'
  | 'Dispatch & Logistics'
  | 'Customer Credit & Invoicing'
  | 'Expense & Reimbursement'
  | 'Field Marketing & Surveys'
  | 'RMA & Quality Control'
  | 'HR, Attendance & Payroll'
  | 'IT & System Access'
  | 'General Operational Support';

export type QueryPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export type QueryStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatar: string;
  message: string;
  timestamp: string;
  isInternalNote?: boolean;
  attachmentName?: string;
  attachmentUrl?: string;
}

export interface RoleQueryTicket {
  id: string; // e.g. "QRY-2026-041"
  ticketNo: string;
  title: string;
  category: QueryCategory;
  priority: QueryPriority;
  status: QueryStatus;
  requesterId: string;
  requesterName: string;
  requesterRole: UserRole;
  requesterDepartment: string;
  requesterAvatar: string;
  assignedToId?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  referenceId?: string;
  referenceType?: 'Order' | 'Product' | 'Batch' | 'Customer' | 'GRN' | 'Quotation' | 'Expense' | 'General';
  messages: ChatMessage[];
}

// ─── Finance Role Domain Types ───

export interface MarketingBudgetRequest {
  id: string; // e.g. 'MBR-2026-001'
  campaignName: string;
  requestingUserId: string;
  requestingUserName: string;
  department: string;
  regionId: string;
  regionName?: string;
  objective: string;
  requestedAmount: number;
  approvedAmount?: number;
  spentAmount: number;
  status: 'pending' | 'approved' | 'partially_approved' | 'rejected';
  proposedExpensesBreakdown: { item: string; amount: number }[];
  expectedOutcomes: string;
  supportingDocuments?: string[];
  reviewNotes?: string;
  reviewedByUserId?: string;
  reviewedByUserName?: string;
  reviewedAt?: string;
  createdAt: string;
}

export type ClaimType =
  | 'customer_refund'
  | 'sales_team_request'
  | 'damaged_product'
  | 'shortage'
  | 'supplier_claim'
  | 'internal_stock_loss';

export interface FinanceRefundClaim {
  id: string; // e.g. 'CLM-2026-001'
  type: ClaimType;
  claimSource: 'customer' | 'supplier' | 'store_keeper' | 'sales';
  partyId: string; // customerId or supplierId
  partyName: string;
  orderId?: string;
  orderNumber?: string;
  invoiceNumber?: string;
  grnId?: string;
  grnNumber?: string;
  productId: string;
  productSku?: string;
  productName: string;
  batchId?: string;
  batchNumber?: string;
  quantity: number;
  unit: string;
  damageDescription: string;
  proofAttachments?: string[];
  requestedAmount: number;
  approvedAmount?: number;
  refundStatus: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'settled';
  refundMethod?: 'bank_transfer' | 'credit_note' | 'upi' | 'wallet_credit' | 'replacement';
  refundReference?: string;
  payoutStatus: 'unpaid' | 'paid';
  reviewedByUserId?: string;
  reviewedByUserName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface PayrollRecord {
  id: string; // e.g. 'PAY-2026-10-001'
  userId: string;
  employeeId: string;
  employeeName: string;
  avatar?: string;
  role: UserRole;
  roleTitle: string;
  department: string;
  month: string; // e.g. 'October 2026'
  workingDays: number;
  presentDays: number;
  absentDays: number;
  paidLeaveDays: number;
  payableDays: number;
  baseSalary: number;
  hra: number;
  specialAllowance: number;
  travelAllowance: number;
  grossSalary: number;
  pfDeduction: number;
  esiDeduction: number;
  tdsDeduction: number;
  advancesDeduction: number;
  totalDeductions: number;
  earnedIncentives: number;
  approvedReimbursements: number;
  netPayableSalary: number;
  status: 'draft_calculated' | 'approved' | 'paid';
  paymentDate?: string;
  paymentMode?: string;
  paymentReference?: string;
  payslipGeneratedAt?: string;
}

export interface IncentiveSettlement {
  id: string; // e.g. 'INC-2026-10-001'
  userId: string;
  employeeName: string;
  employeeId: string;
  role: 'sales' | 'marketing';
  roleTitle: string;
  period: string;
  targetDescription: string;
  quotaTarget: number;
  actualPerformance: number;
  attainmentPercent: number;
  calculatedIncentive: number;
  approvedIncentive: number;
  paidIncentive: number;
  status: 'pending_review' | 'approved' | 'paid' | 'rejected';
  reviewedByUserId?: string;
  reviewedByUserName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  paymentReference?: string;
  paidAt?: string;
}

export interface AccountHead {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  category: string;
  openingBalance: number;
  currentBalance: number;
  description: string;
}

export interface JournalEntryLine {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntry {
  id: string; // e.g. 'JV-2026-001'
  voucherNumber: string;
  date: string;
  referenceType:
    | 'sales_invoice'
    | 'customer_receipt'
    | 'supplier_invoice'
    | 'supplier_payment'
    | 'payroll_disbursement'
    | 'expense_reimbursement'
    | 'incentive_payout'
    | 'refund_disbursement'
    | 'general_adjustment';
  referenceId?: string;
  description: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  status: 'posted' | 'draft';
  createdByUserName: string;
  createdAt: string;
}

// =====================================================================
// MULTI-ORGANIZATION COMPANY PROFILES, TEMPLATES & NUMBERING
// =====================================================================

export interface CompanyBankAccount {
  id: string;
  companyProfileId: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  branch?: string;
  currentBalance?: number;
  upiId?: string;
  qrCodeUrl?: string;
  isDefaultForInvoices: boolean;
  isDefaultForQuotations: boolean;
  isActive: boolean;
}

export interface CompanyProfile {
  id: string;
  orgId: string;
  legalName: string;
  tradeName?: string;
  gstin: string;
  pan: string;
  cin?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  stateCode: string; // e.g. "07", "27"
  pincode: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  signatureUrl?: string;
  defaultCurrency: string;
  fiscalYearStartMonth: number;
  bankAccounts: CompanyBankAccount[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentNumberingSeries {
  id: string;
  companyProfileId: string;
  docType: 'quotation' | 'invoice' | 'credit_note' | 'debit_note' | 'receipt' | 'refund' | 'supplier_bill' | 'payment_voucher';
  fiscalYear: string;
  prefix: string;
  currentNumber: number;
  paddingLength: number;
}

export interface DocumentTemplate {
  id: string;
  companyProfileId: string;
  docType: 'invoice' | 'quotation' | 'receipt' | 'credit_note';
  name: string;
  layoutDesign: 'modern_glass' | 'classic_enterprise' | 'minimalist_clean';
  accentColor: string; // Hex color, e.g. "#4f46e5"
  logoPosition: 'left' | 'right' | 'center';
  headerText?: string;
  footerText?: string;
  defaultTerms?: string;
  defaultNotes?: string;
  signatoryTitle: string;
  showBankDetails: boolean;
  showQrCode: boolean;
  showHsnSummary: boolean;
  showAmountInWords: boolean;
  version: number;
  isDefault: boolean;
  updatedAt: string;
}

export interface CreditNote {
  id: string;
  noteNumber: string;
  noteType: 'credit_note' | 'debit_note';
  companyProfileId: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  customerId: string;
  customerName: string;
  customerGstin?: string;
  issueDate: string;
  reason: 'sales_return' | 'post_sale_discount' | 'deficiency_in_service' | 'correction_in_invoice' | 'rate_difference' | 'other';
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  amountInWords: string;
  status: 'issued' | 'applied' | 'cancelled';
  notes?: string;
  idempotencyKey?: string;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
}

export interface ReceiptPaymentIn {
  id: string;
  receiptNumber: string;
  companyProfileId: string;
  customerId: string;
  customerName: string;
  customerGstin?: string;
  receiptDate: string;
  amountReceived: number;
  amountInWords: string;
  paymentMode: 'neft_rtgs' | 'upi' | 'cheque' | 'cash' | 'demand_draft';
  bankReference: string;
  companyBankAccountId?: string;
  idempotencyKey: string;
  allocations: Array<{
    invoiceId: string;
    invoiceNumber: string;
    allocatedAmount: number;
  }>;
  unallocatedAdvance: number;
  status: 'posted' | 'reversed';
  reversedAt?: string;
  reversalReason?: string;
  notes?: string;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
}

export interface SupplierBill {
  id: string;
  billNumber: string;
  supplierBillRefNumber: string;
  supplierId: string;
  supplierName: string;
  supplierGstin?: string;
  supplierPan?: string;
  companyProfileId: string;
  poId?: string;
  poNumber?: string;
  grnId?: string;
  grnNumber?: string;
  billDate: string;
  dueDate: string;
  matchStatus: '3_way_matched' | 'variance_flagged' | 'manual_review';
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  tdsApplicable: boolean;
  tdsSection?: '194C' | '194J' | '194Q' | '194I';
  tdsRatePercent?: number;
  tdsAmount?: number;
  netPayableAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'partially_paid' | 'paid' | 'rejected';
  approvalLevel?: number;
  approvedByUserId?: string;
  approvedByUserName?: string;
  idempotencyKey?: string;
  notes?: string;
  createdAt: string;
}

export interface PaymentRun {
  id: string;
  runNumber: string;
  executionDate: string;
  companyProfileId: string;
  companyBankAccountId: string;
  billIds: string[];
  totalBillsCount: number;
  totalAmount: number;
  totalTdsDeducted: number;
  netDisbursement: number;
  paymentMode: 'neft_batch' | 'rtgs' | 'internal_transfer';
  exportFormat: 'standard_csv' | 'hdfc_cif' | 'icici_corporate';
  status: 'draft' | 'processing' | 'completed' | 'failed';
  approvedByUserId?: string;
  approvedByUserName?: string;
  executedByUserId: string;
  executedByUserName: string;
  createdAt: string;
}

export interface CustomerRefundRequest {
  id: string;
  refundNumber: string;
  customerId: string;
  customerName: string;
  originalInvoiceId?: string;
  originalInvoiceNumber?: string;
  originalPaymentRef?: string;
  amountPaidOriginal: number;
  priorRefundsTotal: number;
  maxRefundAllowed: number;
  requestedAmount: number;
  approvedAmount?: number;
  refundMode: 'original_source_neft' | 'upi_transfer' | 'credit_note_wallet';
  customerBankDetails?: {
    accountHolder: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  reasonCategory: 'cancellation' | 'transit_damage' | 'defective_goods' | 'double_payment';
  reasonDetails: string;
  raisedByRole: 'service' | 'sales' | 'finance' | 'admin';
  raisedByUserId: string;
  raisedByUserName: string;
  requiresAdminApproval: boolean;
  status: 'pending_finance_review' | 'escalated_to_admin' | 'approved' | 'disbursed' | 'rejected';
  reviewedByUserId?: string;
  reviewedByUserName?: string;
  disbursedDate?: string;
  transactionReference?: string;
  idempotencyKey?: string;
  createdAt: string;
}

export interface BankStatement {
  id: string;
  companyBankAccountId: string;
  accountNumberMasked: string;
  statementPeriod: string;
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  uploadedByUserId: string;
  uploadedAt: string;
}

export interface BankStatementLine {
  id: string;
  statementId: string;
  transactionDate: string;
  description: string;
  referenceNumber: string;
  withdrawalAmount: number;
  depositAmount: number;
  runningBalance: number;
  matchedRecordType?: 'receipt' | 'supplier_payment' | 'expense' | 'payroll';
  matchedRecordId?: string;
  reconciliationStatus: 'matched' | 'unmatched' | 'manual_override';
  notes?: string;
}



