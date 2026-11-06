// ============================================================
// TYPES — TRANSFERS & STOCK COUNT
// ============================================================

export type TransferStatus =
  | 'Draft'
  | 'Submitted'
  | 'Awaiting Authorization'
  | 'Rejected'
  | 'Approved for Dispatch'
  | 'Ready for Dispatch'
  | 'Partially Dispatched'
  | 'In Transit'
  | 'Partially Received'
  | 'Received with Exception'
  | 'Fully Received'
  | 'Closed'
  | 'Cancelled';

export type TransferType = 'Warehouse-to-Warehouse' | 'Store-to-Store' | 'Bin-to-Bin' | 'Internal Relocation';
export type CountType = 'Full Warehouse' | 'Cycle Count' | 'Bin/Location Count' | 'Selected SKU' | 'Batch/Serial Verification';
export type CountStatus = 'Draft' | 'Planned' | 'Assigned' | 'In Progress' | 'Partially Counted' | 'Awaiting Recount' | 'Awaiting Variance Review' | 'Awaiting Adjustment Approval' | 'Completed' | 'Cancelled';
export type VarianceType = 'Shortage' | 'Excess' | 'Location Mismatch' | 'Batch Mismatch' | 'Serial Mismatch' | 'Unidentified Stock' | 'Damaged' | 'Other';

export interface TransferLine {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  sourceBin: string;
  destinationBin: string;
  batchNumber: string;
  serialNumbers: string[];
  uom: string;
  requestedQty: number;
  dispatchedQty: number;
  receivedQty: number;
  availableSourceQty: number;
}

export interface TransferRequest {
  id: string;
  transferNumber: string;
  type: TransferType;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  requestedDate: string;
  requiredByDate: string;
  reason: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  requestedBy: string;
  status: TransferStatus;
  approvalReference: string | null;
  lines: TransferLine[];
  createdAt: string;
  updatedAt: string;
}

export interface InTransitShipment {
  id: string;
  transferNumber: string;
  dispatchTransactionId: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  destinationWarehouseName?: string | null;
  totalDispatchedQty: number;
  totalReceivedQty: number;
  outstandingQty: number;
  dispatchDate: string;
  expectedArrivalDate: string;
  status: TransferStatus;
  sender: string;
  receiver: string;
  exceptionFlag: boolean;
  updatedAt: string;
}

export interface CountLine {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  locationId: string;
  batchNumber: string;
  uom: string;
  systemQty: number;
  firstCountQty: number | null;
  recountQty: number | null;
  finalVerifiedQty: number | null;
  counter: string;
  status: 'Not Started' | 'Counted' | 'Variance' | 'Recount Required' | 'Verified';
  notes: string;
}

export interface StockCountSession {
  id: string;
  countNumber: string;
  type: CountType;
  warehouseId: string;
  warehouseName: string;
  status: CountStatus;
  plannedDate: string;
  startedDate: string | null;
  dueAt: string;
  assignedUsers: string[];
  totalLines: number;
  countedLines: number;
  varianceLines: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockVariance {
  id: string;
  varianceNumber: string;
  sessionId: string;
  productId: string;
  productName: string;
  sku: string;
  locationId: string;
  batchNumber: string;
  systemQty: number;
  finalCountQty: number;
  varianceQty: number;
  uom: string;
  type: VarianceType;
  reason: string;
  status: 'Open' | 'Under Review' | 'Awaiting Approval' | 'Approved' | 'Posted' | 'Closed';
  reviewer: string | null;
  approvalReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransferMetrics {
  awaitingAction: number;
  readyForDispatch: number;
  inTransit: number;
  partialReceipts: number;
  transferExceptions: number;
  activeCounts: number;
  pendingVarianceReview: number;
  pendingAdjustments: number;
}
