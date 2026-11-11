// ============================================================
// PRODUCTION MATERIALS — TYPE DEFINITIONS
// ⚠️  Mock Data mode — replace service layer for production
// ============================================================

// ─── Primitives ────────────────────────────────────────────────
export type UnitOfMeasure = 'kg' | 'L' | 'Units' | 'Pcs' | 'm' | 'Set' | 'Box' | 'Pair' | 'g';
export type TrackingType = 'Batch' | 'Serial' | 'None';

export type ProductionMaterialTab = 'requests' | 'returns' | 'shortages';

export type MaterialCategory =
  | 'Raw Material'
  | 'Component'
  | 'Consumable'
  | 'Packaging'
  | 'Other';

export type MaterialRequestStatus =
  | 'Requested'
  | 'Awaiting Approval'
  | 'Approved'
  | 'Partially Issued'
  | 'Issued'
  | 'Blocked'
  | 'Cancelled';

export type IssueStatus =
  | 'Not Started'
  | 'Partial'
  | 'Complete'
  | 'Shortage'
  | 'Blocked';

export type MaterialReturnStatus =
  | 'Draft'
  | 'Submitted'
  | 'Awaiting Warehouse Check'
  | 'Awaiting Inspection'
  | 'Accepted'
  | 'Held'
  | 'Rejected'
  | 'Posted'
  | 'Cancelled';

export type MaterialCondition =
  | 'Good'
  | 'Minor Damage'
  | 'Contaminated'
  | 'Expired'
  | 'Unknown';

export type ShortageStatus =
  | 'Open'
  | 'Under Review'
  | 'Waiting for Procurement'
  | 'Waiting for Supplier'
  | 'Waiting for Quality Control'
  | 'Transfer Proposed'
  | 'Awaiting Approval'
  | 'Partially Resolved'
  | 'Resolved'
  | 'Cancelled';

export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

// ─── BOM Material Line ─────────────────────────────────────────
export interface BomLine {
  lineId: string;
  materialCode: string;
  materialName: string;
  materialCategory: MaterialCategory;
  requiredQty: number;
  previouslyIssuedQty: number;
  remainingQty: number;
  eligibleAvailableQty: number;
  shortageQty: number;
  uom: UnitOfMeasure;
  trackingType: TrackingType;
  suggestedWarehouseId: string;
  suggestedWarehouseName: string;
  suggestedBin: string | null;
  eligibleBatches: string[];
  eligibleSerials: string[];
  issueStatus: IssueStatus;
  allowSubstitution: boolean;
  approvedSubstitutes: string[];
}

// ─── Material Request ──────────────────────────────────────────
export interface MaterialRequest {
  id: string;
  requestId: string;
  productionOrderId: string;
  finishedProduct: string;
  finishedProductCode: string;
  bomReference: string;
  bomRevision: string;
  plannedProductionQty: number;
  productionQtyUom: UnitOfMeasure;
  warehouseId: string;
  warehouseName: string;
  productionArea: string;
  requiredDate: string;
  requestedBy: string;
  requestedDepartment: string;
  productionOrderStatus: string;
  requestStatus: MaterialRequestStatus;
  issueStatus: IssueStatus;
  priority: Priority;
  hasShortage: boolean;
  materialLines: BomLine[];
  totalLines: number;
  linesAwaitingIssue: number;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string;
}

// ─── Material Issue Note ───────────────────────────────────────
export interface IssueLineItem {
  lineId: string;
  materialCode: string;
  materialName: string;
  bomLineId: string;
  warehouseId: string;
  warehouseName: string;
  bin: string | null;
  batchSerial: string | null;
  qtyIssued: number;
  uom: UnitOfMeasure;
  trackingType: TrackingType;
  serialNumbers: string[];
}

export interface MaterialIssueNote {
  id: string;
  issueNoteId: string;
  materialRequestId: string;
  productionOrderId: string;
  warehouseId: string;
  warehouseName: string;
  destinationProductionArea: string;
  issuedBy: string;
  receivedBy: string;
  issueDate: string;
  status: 'Draft' | 'Confirmed' | 'Cancelled' | 'Reversed';
  lines: IssueLineItem[];
  remarks: string;
  createdAt: string;
}

// ─── Material Return Note ──────────────────────────────────────
export interface ReturnLineItem {
  lineId: string;
  originalIssueLineId: string;
  materialCode: string;
  materialName: string;
  originalBatch: string | null;
  originalSerials: string[];
  qtyOriginallyIssued: number;
  qtyPreviouslyReturned: number;
  qtyEligibleToReturn: number;
  qtyReturning: number;
  uom: UnitOfMeasure;
  condition: MaterialCondition;
  destinationBin: string | null;
  inspectionRequired: boolean;
  remarks: string;
}

export interface MaterialReturn {
  id: string;
  returnId: string;
  originalIssueNoteId: string;
  productionOrderId: string;
  productionArea: string;
  returningEmployee: string;
  receivingWarehouseId: string;
  receivingWarehouseName: string;
  returnDate: string;
  returnStatus: MaterialReturnStatus;
  lines: ReturnLineItem[];
  inspectionStatus: 'Not Required' | 'Pending' | 'In Progress' | 'Completed';
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Material Shortage ─────────────────────────────────────────
export interface MaterialShortage {
  id: string;
  shortageId: string;
  productionOrderId: string;
  materialRequestId: string;
  materialCode: string;
  materialName: string;
  materialCategory: MaterialCategory;
  requiredQty: number;
  previouslyIssuedQty: number;
  remainingRequiredQty: number;
  eligibleAvailableQty: number;
  shortageQty: number;
  uom: UnitOfMeasure;
  requiredDate: string;
  warehouseId: string;
  warehouseName: string;
  responsibleDepartment: string;
  priority: Priority;
  status: ShortageStatus;
  pendingReceipts: string[];
  relatedPurchaseOrders: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Summary Metrics ───────────────────────────────────────────
export interface ProductionMaterialMetrics {
  pendingRequests: number;
  partiallyIssued: number;
  materialShortages: number;
  awaitingIssue: number;
  returnsPending: number;
  overdueRequests: number;
}

// ─── Page Data ─────────────────────────────────────────────────
export interface ProductionMaterialPageData {
  metrics: ProductionMaterialMetrics;
  requests: MaterialRequest[];
  returns: MaterialReturn[];
  shortages: MaterialShortage[];
  lastRefresh: string;
  isMockData: boolean;
}

// ─── Issue Form State ──────────────────────────────────────────
export interface IssueFormLine {
  bomLineId: string;
  materialCode: string;
  materialName: string;
  requiredQty: number;
  remainingQty: number;
  availableQty: number;
  uom: UnitOfMeasure;
  trackingType: TrackingType;
  warehouseId: string;
  warehouseName: string;
  bin: string;
  batchSerial: string;
  qtyToIssue: number;
  selectedSerials: string[];
  eligibleBatches: string[];
  eligibleSerials: string[];
  shortageQty: number;
}

export interface IssueFormState {
  materialRequestId: string;
  productionOrderId: string;
  issueDate: string;
  receivedBy: string;
  remarks: string;
  lines: IssueFormLine[];
}

// ─── Return Form State ────────────────────────────────────────
export interface ReturnFormState {
  productionOrderId: string;
  originalIssueNoteId: string;
  productionArea: string;
  returningEmployee: string;
  receivingWarehouseId: string;
  lines: {
    lineId: string;
    qtyReturning: number;
    condition: MaterialCondition;
    destinationBin: string;
    inspectionRequired: boolean;
    remarks: string;
  }[];
  remarks: string;
}
