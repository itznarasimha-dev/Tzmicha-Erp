// ============================================================
// TYPES — FINISHED GOODS & QUALITY
// ============================================================

export type FinishedGoodsCategory = 'Manufactured' | 'Purchased' | 'Returned';
export type QCStatus =
  | 'Not Required'
  | 'Required'
  | 'Awaiting Inspection'
  | 'Inspection in Progress'
  | 'Awaiting QC Decision'
  | 'Quality Hold'
  | 'Approved'
  | 'Partially Approved'
  | 'Rejected'
  | 'Reinspection Required'
  | 'Closed';

export type ProductionOutputReceiptStatus = 'Pending' | 'Partially Received' | 'Fully Received' | 'Discrepancy Reported';

export interface ProductionOutputReceipt {
  id: string;
  receiptNumber: string;
  productionOrderId: string;
  productionCompletionId: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  sourceType: FinishedGoodsCategory;
  reportedOutputQty: number;
  previouslyReceivedQty: number;
  receivedQty: number;
  remainingReceiptQty: number;
  uom: string;
  warehouseId: string;
  warehouseName: string;
  locationId: string;
  locationName: string;
  batchNumber: string;
  serialNumbers: string[];
  productionCompletionDate: string;
  expectedReceiptDate: string;
  qcRequired: boolean;
  qcReferenceId: string | null;
  receiptStatus: ProductionOutputReceiptStatus;
  responsiblePerson: string;
  dueDate: string;
  updatedAt: string;
}

export interface QCRecord {
  id: string;
  qcReferenceId: string;
  sourceType: 'Manufacturing' | 'Purchased' | 'CustomerReturn';
  sourceTransactionId: string;
  productId: string;
  productName: string;
  sku: string;
  batchNumber: string;
  serialNumbers: string[];
  quantityUnderInspection: number;
  uom: string;
  warehouseId: string;
  warehouseName: string;
  inspectionLocation: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  requestedDate: string;
  dueDate: string;
  inspector: string;
  qcStatus: QCStatus;
  decisionDate: string | null;
  decisionReference: string | null;
  approvedQty: number;
  rejectedQty: number;
  heldQty: number;
  comments: string;
  updatedAt: string;
}

export interface FinishedGoodsStock {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  description: string;
  category: FinishedGoodsCategory;
  source: 'Production' | 'Supplier' | 'Return';
  warehouseId: string;
  warehouseName: string;
  binLocation: string;
  batchNumber: string;
  serialNumbers: string[];
  onHandQty: number;
  reservedQty: number;
  heldQty: number;
  inTransitQty: number;
  availableQty: number;
  uom: string;
  qcStatus: QCStatus;
  expiryDate: string | null;
  condition: 'New' | 'Good' | 'Damaged' | 'Reworked';
  lastMovementDate: string;
  sourceTransactionId: string;
}

export interface StockException {
  id: string;
  exceptionNumber: string;
  productId: string;
  productName: string;
  sku: string;
  sourceTransactionId: string;
  warehouseId: string;
  warehouseName: string;
  locationId: string;
  locationName: string;
  batchNumber: string;
  serialNumbers: string[];
  quantity: number;
  uom: string;
  exceptionType: 'Physical Damage' | 'Packaging Damage' | 'Quality Rejection' | 'QC Hold' | 'Expired' | 'Near-Expiry' | 'Identification Mismatch' | 'Receipt Discrepancy' | 'Other';
  reason: string;
  status: 'Open' | 'Under Review' | 'Awaiting QC' | 'Awaiting Production' | 'Awaiting Approval' | 'Action Required' | 'Resolved' | 'Closed';
  reportedDate: string;
  reportedBy: string;
  responsibleDepartment: string;
  qcReferenceId: string | null;
  evidenceUrl: string | null;
  dueDate: string;
  updatedAt: string;
}

export interface FinishedGoodsMetrics {
  awaitingReceipt: { count: number; qty: number };
  partialReceipts: { count: number; qty: number };
  awaitingQC: { count: number; qty: number };
  qualityHold: { count: number; qty: number };
  qcRejected: { count: number; qty: number };
  releasedForStock: { count: number; qty: number };
  receiptDiscrepancies: { count: number; qty: number };
  overdueHandoffs: { count: number; qty: number };
  lastRefresh: string;
}
