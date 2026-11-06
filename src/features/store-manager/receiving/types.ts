// ============================================================
// RECEIVING CENTRE — TYPE DEFINITIONS
// ⚠️  Mock Data mode — replace service layer for production
// ============================================================

// ─── Shared enums ────────────────────────────────────────────
export type StockType = 'Raw Material' | 'Component' | 'Purchased Finished Good';
export type UnitOfMeasure = 'kg' | 'L' | 'Units' | 'Pcs' | 'm' | 'Set' | 'Box' | 'Pair' | 'g';
export type TrackingType = 'Batch' | 'Serial' | 'None';

// ─── Purchase Order ───────────────────────────────────────────
export type POStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Partially Received' | 'Fully Received' | 'Cancelled' | 'Closed';
export type ReceivingStatus = 'Expected' | 'Due Today' | 'Overdue' | 'Partially Received' | 'Fully Received' | 'Cancelled';

export interface POLine {
  lineId: string;
  productCode: string;
  productName: string;
  productCategory: string;
  stockType: StockType;
  orderedQty: number;
  receivedQty: number;
  outstandingQty: number;
  uom: UnitOfMeasure;
  trackingType: TrackingType;
  requiresExpiry: boolean;
  requiresInspection: boolean;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierContact: string;
  orderDate: string;
  expectedDeliveryDate: string;
  destinationWarehouse: string;
  deliveryRef: string | null;
  poStatus: POStatus;
  receivingStatus: ReceivingStatus;
  lines: POLine[];
  totalOrderedQty: number;
  totalReceivedQty: number;
  totalOutstandingQty: number;
  lastUpdated: string;
  notes: string;
  grnIds: string[];
}

// ─── GRN ─────────────────────────────────────────────────────
export type GRNStatus = 'Draft' | 'Submitted' | 'Awaiting Inspection' | 'Partially Posted' | 'Posted' | 'Reversed' | 'Cancelled';
export type InspectionStatus = 'Not Required' | 'Pending' | 'In Progress' | 'Approved' | 'Rejected' | 'On Hold';
export type DiscrepancyStatus = 'None' | 'Draft' | 'Submitted' | 'Assigned' | 'Under Review' | 'Resolved' | 'Closed';

export interface GRNLine {
  lineId: string;
  poLineId: string;
  productCode: string;
  productName: string;
  productCategory: string;
  stockType: StockType;
  orderedQty: number;
  previouslyReceivedQty: number;
  receivedQty: number;
  damagedQty: number;
  acceptedQty: number;
  uom: UnitOfMeasure;
  trackingType: TrackingType;
  batchNumber: string | null;
  serialNumbers: string[];
  manufacturingDate: string | null;
  expiryDate: string | null;
  destinationWarehouse: string;
  rackBin: string | null;
  requiresInspection: boolean;
  inspectionStatus: InspectionStatus;
  remarks: string;
}

export interface GoodsReceiptNote {
  id: string;
  grnNumber: string;
  poId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierDeliveryNote: string | null;
  receiptDate: string;
  warehouse: string;
  status: GRNStatus;
  lines: GRNLine[];
  totalReceivedQty: number;
  totalDamagedQty: number;
  packagingCondition: string;
  deliveryCondition: string;
  overallRemarks: string;
  createdBy: string;
  createdAt: string;
  postedAt: string | null;
  inspectionStatus: InspectionStatus;
  discrepancyStatus: DiscrepancyStatus;
  discrepancyIds: string[];
  supplierReturnIds: string[];
  attachments: string[];
}

// ─── Discrepancy ──────────────────────────────────────────────
export type DiscrepancyType =
  | 'Short Delivery'
  | 'Excess Delivery'
  | 'Damaged Goods'
  | 'Wrong Product'
  | 'Incorrect Batch/Serial'
  | 'Missing Documentation'
  | 'Suspected Quality Defect'
  | 'Incorrect Packaging'
  | 'Other';

export type DiscrepancyFullStatus =
  | 'Draft'
  | 'Submitted'
  | 'Assigned'
  | 'Under Review'
  | 'Waiting for Supplier'
  | 'Waiting for Quality Control'
  | 'Waiting for Procurement'
  | 'Waiting for Finance'
  | 'Resolution Proposed'
  | 'Awaiting Approval'
  | 'Resolved'
  | 'Rejected'
  | 'Closed';

export interface Discrepancy {
  id: string;
  discrepancyId: string;
  poId: string;
  poNumber: string;
  grnId: string | null;
  grnNumber: string | null;
  supplierId: string;
  supplierName: string;
  productCode: string;
  productName: string;
  batchSerial: string | null;
  issueType: DiscrepancyType;
  qtyAffected: number | null;
  uom: UnitOfMeasure | null;
  warehouse: string;
  description: string;
  reportedDate: string;
  reportedBy: string;
  responsibleDepartment: string;
  assignedPerson: string | null;
  status: DiscrepancyFullStatus;
  dueDate: string | null;
  resolutionDetails: string | null;
  attachments: string[];
  linkedReturnId: string | null;
}

// ─── Supplier Return ──────────────────────────────────────────
export type SupplierReturnStatus =
  | 'Draft'
  | 'Submitted'
  | 'Awaiting Approval'
  | 'Approved'
  | 'Return Staging'
  | 'Ready to Dispatch'
  | 'Partially Dispatched'
  | 'Dispatched'
  | 'Waiting for Supplier Confirmation'
  | 'Rejected'
  | 'Cancelled'
  | 'Closed';

export interface SupplierReturn {
  id: string;
  returnId: string;
  originalGrnId: string;
  originalGrnNumber: string;
  poId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  productCode: string;
  productName: string;
  batchSerial: string | null;
  eligibleQty: number;
  returnQty: number;
  uom: UnitOfMeasure;
  returnReason: string;
  physicalCondition: string;
  sourceWarehouse: string;
  sourceBin: string | null;
  stagingLocation: string | null;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  approvalRef: string | null;
  approvedBy: string | null;
  dispatchStatus: SupplierReturnStatus;
  expectedDispatchDate: string | null;
  actualDispatchDate: string | null;
  transporter: string | null;
  shipmentRef: string | null;
  linkedDiscrepancyId: string | null;
  createdBy: string;
  createdAt: string;
  remarks: string;
}

// ─── Receiving Summary Metrics ────────────────────────────────
export interface ReceivingMetrics {
  expectedDeliveries: number;
  pendingGRNs: number;
  inspectionHolds: number;
  openDiscrepancies: number;
  overdueDeliveries: number;
  pendingSupplierReturns: number;
}

// ─── Overall Receiving State ──────────────────────────────────
export interface ReceivingPageData {
  metrics: ReceivingMetrics;
  purchaseOrders: PurchaseOrder[];
  grns: GoodsReceiptNote[];
  discrepancies: Discrepancy[];
  supplierReturns: SupplierReturn[];
  lastRefresh: string;
  isMockData: boolean;
}

// ─── GRN Form State ───────────────────────────────────────────
export interface GRNFormLine {
  poLineId: string;
  productCode: string;
  productName: string;
  productCategory: string;
  stockType: StockType;
  orderedQty: number;
  previouslyReceivedQty: number;
  remainingQty: number;
  receivedQty: number;
  damagedQty: number;
  uom: UnitOfMeasure;
  trackingType: TrackingType;
  batchNumber: string;
  serialNumbers: string;
  manufacturingDate: string;
  expiryDate: string;
  rackBin: string;
  requiresInspection: boolean;
  remarks: string;
}

export interface GRNFormState {
  poId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierDeliveryNote: string;
  receiptDate: string;
  warehouse: string;
  receivedBy: string;
  packagingCondition: string;
  deliveryCondition: string;
  overallRemarks: string;
  lines: GRNFormLine[];
}

// ─── Tab + Filter state ───────────────────────────────────────
export type ReceivingTab = 'expected' | 'grns' | 'discrepancies' | 'returns';

export interface ReceivingFilters {
  warehouseId: string;
  dateFrom: string;
  dateTo: string;
  search: string;
  tab: ReceivingTab;
}
