// ============================================================
// TYPES — SALES FULFILMENT & RETURNS
// ============================================================

export type FulfilmentStatus =
  | 'Awaiting Picking'
  | 'Picking in Progress'
  | 'Picked'
  | 'Awaiting Packing'
  | 'Packed'
  | 'Ready for Dispatch'
  | 'Dispatched'
  | 'Partially Fulfilled'
  | 'Fulfilled'
  | 'Cancelled'
  | 'Exception';

export type ReturnStatus =
  | 'Received'
  | 'Awaiting Inspection'
  | 'QC Hold'
  | 'Approved for Restock'
  | 'Rejected'
  | 'Disposed'
  | 'Closed';

export interface SalesOrderLine {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  orderedQty: number;
  fulfilledQty: number;
  outstandingQty: number;
  reservedQty: number;
  uom: string;
  batchRequirement?: string;
  serialRequirement?: boolean;
  status: 'Pending' | 'Reserved' | 'Picked' | 'Dispatched';
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  deliveryLocation: string;
  orderDate: string;
  requiredDispatchDate: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Authorized' | 'On Hold' | 'Cancelled';
  fulfilmentStatus: FulfilmentStatus;
  lines: SalesOrderLine[];
  totalItems: number;
  warehouseId: string;
  warehouseName: string;
}

export interface PickList {
  id: string;
  pickListNumber: string;
  orderId: string;
  orderNumber: string;
  warehouseId: string;
  assignedPicker: string;
  status: 'Draft' | 'Ready' | 'Picking' | 'Picked' | 'Exception';
  createdAt: string;
  lines: PickLine[];
}

export interface PickLine {
  id: string;
  lineId: string;
  productId: string;
  sku: string;
  binLocation: string;
  requiredQty: number;
  pickedQty: number;
  uom: string;
  batchNumber: string;
  serialNumbers: string[];
}

export interface DispatchRecord {
  id: string;
  dispatchNumber: string;
  orderId: string;
  warehouseId: string;
  dispatchDate: string;
  carrier: string;
  trackingNumber: string;
  status: 'Handed Over' | 'In Transit' | 'Delivered';
  packages: number;
  lines: DispatchLine[];
}

export interface DispatchLine {
  productId: string;
  sku: string;
  qty: number;
  uom: string;
  batchNumber: string;
}

export interface CustomerReturn {
  id: string;
  returnReference: string;
  customerName: string;
  orderId: string;
  dispatchReference: string;
  receivedDate: string;
  status: ReturnStatus;
  lines: ReturnLine[];
  reason: string;
}

export interface ReturnLine {
  id: string;
  productId: string;
  sku: string;
  qtyReceived: number;
  uom: string;
  condition: 'New' | 'Opened' | 'Damaged' | 'Used';
  qcStatus: 'Awaiting Inspection' | 'Approved' | 'Rejected';
  batchNumber: string;
}

export interface FulfilmentException {
  id: string;
  exceptionRef: string;
  orderId: string;
  productId: string;
  sku: string;
  type: 'Shortage' | 'Damage' | 'Wrong Item' | 'Serial Mismatch' | 'Logistics Issue';
  description: string;
  severity: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'Under Investigation' | 'Resolved' | 'Closed';
  reportedBy: string;
  createdAt: string;
}

export interface FulfilmentMetrics {
  awaitingFulfilment: number;
  awaitingPicking: number;
  pickingInProgress: number;
  awaitingPacking: number;
  readyForDispatch: number;
  partialFulfilment: number;
  returnsAwaitingDisposition: number;
  fulfilmentExceptions: number;
  lastRefresh: string;
}
