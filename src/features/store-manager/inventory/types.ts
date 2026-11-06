// ============================================================
// INVENTORY & TRACEABILITY — TYPE DEFINITIONS
// ⚠️  Mock Data mode — replace service layer for production
// ============================================================

// ─── Shared / Re-exported primitives ─────────────────────────
export type UnitOfMeasure = 'kg' | 'L' | 'Units' | 'Pcs' | 'm' | 'Set' | 'Box' | 'Pair' | 'g';
export type TrackingType  = 'Batch' | 'Serial' | 'None';

export type StockCategory =
  | 'Raw Material'
  | 'Component'
  | 'Work in Progress'
  | 'Manufactured Finished Good'
  | 'Purchased Finished Good'
  | 'Returned Goods'
  | 'Damaged / Rejected'
  | 'Other';

export type StockStatus =
  | 'Available'
  | 'Partially Reserved'
  | 'Fully Reserved'
  | 'Quality Hold'
  | 'Quarantined'
  | 'In Transit'
  | 'Damaged'
  | 'Expired'
  | 'Rejected'
  | 'Low Stock'
  | 'No Stock';

export type AlertPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type AlertStatus   = 'Open' | 'Acknowledged' | 'In Progress' | 'Resolved' | 'Closed';

export type MovementType =
  | 'Goods Receipt'
  | 'Material Issue'
  | 'Material Return'
  | 'Finished Goods Receipt'
  | 'Internal Bin Transfer'
  | 'Warehouse Transfer'
  | 'Transfer Dispatch'
  | 'Transfer Receipt'
  | 'Sales Dispatch'
  | 'Supplier Return'
  | 'Customer Return Receipt'
  | 'Inventory Adjustment'
  | 'Reversal';

export type MovementStatus = 'Posted' | 'Draft' | 'Pending' | 'Cancelled' | 'Reversed';

// ─── Warehouse / Location ─────────────────────────────────────
export interface WarehouseLocation {
  warehouseId: string;
  warehouseName: string;
  bin: string | null;
}

// ─── Inventory Balance Record ─────────────────────────────────
// One row = one product + warehouse + bin + batch (or serial group)
export interface InventoryRecord {
  id: string;
  productCode: string;
  productName: string;
  productCategory: StockCategory;
  trackingType: TrackingType;
  warehouseId: string;
  warehouseName: string;
  bin: string | null;
  batchNumber: string | null;
  serialNumbers: string[];         // populated when trackingType === 'Serial'
  onHandQty: number;
  reservedQty: number;
  heldQty: number;
  inTransitQty: number;
  availableQty: number;
  uom: UnitOfMeasure;
  expiryDate: string | null;
  manufacturingDate: string | null;
  stockStatus: StockStatus;
  lastUpdated: string;
  supplierName: string | null;
  grnReference: string | null;
  poReference: string | null;
  productionOrderRef: string | null;
  qualityInspectionRef: string | null;
  supplierBatchNumber: string | null;
  traceabilityExceptions: string[];  // list of exception descriptions
}

// ─── Product Summary (aggregate across locations) ─────────────
export interface ProductSummary {
  productCode: string;
  productName: string;
  productCategory: StockCategory;
  trackingType: TrackingType;
  uom: UnitOfMeasure;
  totalOnHand: number;
  totalAvailable: number;
  totalHeld: number;
  totalReserved: number;
  totalInTransit: number;
  stockStatus: StockStatus;
  warehouseCount: number;
  batchCount: number;
  hasExpiryTracking: boolean;
  nearExpiry: boolean;
  hasTraceabilityExceptions: boolean;
  records: InventoryRecord[];
}

// ─── Batch Details ────────────────────────────────────────────
export interface BatchRecord {
  batchNumber: string;
  supplierBatchNumber: string | null;
  productCode: string;
  productName: string;
  productCategory: StockCategory;
  grnReference: string;
  poReference: string;
  productionOrderRef: string | null;
  manufacturingDate: string | null;
  expiryDate: string | null;
  initialQty: number;
  remainingQty: number;
  uom: UnitOfMeasure;
  warehouseId: string;
  warehouseName: string;
  bin: string | null;
  status: StockStatus;
  qualityInspectionRef: string | null;
  supplierName: string | null;
  rawMaterialBatches: string[];    // for manufactured goods: source raw-material batches
  relatedDispatches: string[];
  traceabilityExceptions: string[];
}

// ─── Serial Number Record ─────────────────────────────────────
export interface SerialRecord {
  serialNumber: string;
  productCode: string;
  productName: string;
  currentWarehouseId: string;
  currentWarehouseName: string;
  currentBin: string | null;
  status: StockStatus;
  grnReference: string;
  poReference: string;
  batchNumber: string | null;
  reservationRef: string | null;
  dispatchRef: string | null;
  returnRef: string | null;
}

// ─── Traceability Event ───────────────────────────────────────
export type TraceabilityEventType =
  | 'Purchase Order Approved'
  | 'Goods Received (GRN)'
  | 'Inspection Completed'
  | 'Stock Placed in Location'
  | 'Transfer Initiated'
  | 'Transfer Received'
  | 'Material Issued to Production'
  | 'Finished Goods Received'
  | 'Quality Released'
  | 'Sales Reservation'
  | 'Goods Dispatched'
  | 'Customer Return Received'
  | 'Inventory Adjustment'
  | 'Reversal';

export interface TraceabilityEvent {
  id: string;
  timestamp: string;
  eventType: TraceabilityEventType;
  transactionRef: string;
  qty: number | null;
  uom: UnitOfMeasure | null;
  sourceLocation: string | null;
  destinationLocation: string | null;
  performedBy: string;
  department: string;
  resultingStatus: StockStatus;
  notes: string;
}

// ─── Inventory Movement ───────────────────────────────────────
export interface InventoryMovement {
  id: string;
  movementId: string;
  timestamp: string;
  movementType: MovementType;
  productCode: string;
  productName: string;
  qty: number;
  uom: UnitOfMeasure;
  batchSerial: string | null;
  sourceLocation: string | null;
  destinationLocation: string | null;
  referenceDoc: string;
  performedBy: string;
  status: MovementStatus;
  balanceBefore: number | null;
  balanceAfter: number | null;
  notes: string;
}

// ─── Stock Alert ──────────────────────────────────────────────
export type InventoryAlertType =
  | 'Low Stock'
  | 'No Stock'
  | 'Near Expiry'
  | 'Expired Stock'
  | 'Quality Hold'
  | 'Quarantined Stock'
  | 'Damaged Stock'
  | 'Missing Batch/Serial'
  | 'Movement Exception'
  | 'Stock Count Discrepancy'
  | 'Traceability Issue';

export interface InventoryAlert {
  id: string;
  alertId: string;
  alertType: InventoryAlertType;
  productCode: string;
  productName: string;
  batchSerial: string | null;
  warehouseId: string;
  warehouseName: string;
  bin: string | null;
  affectedQty: number | null;
  uom: UnitOfMeasure | null;
  alertDate: string;
  priority: AlertPriority;
  responsibleDepartment: string;
  status: AlertStatus;
  requiredAction: string;
  resolutionNotes: string | null;
}

// ─── Inventory Summary Metrics ────────────────────────────────
export interface InventoryMetrics {
  totalProductItems: number;
  rawMaterialItems: number;
  finishedGoodItems: number;
  lowStockItems: number;
  stockOnHoldQty: number;
  traceabilityExceptions: number;
}

// ─── Traceability search result ───────────────────────────────
export interface TraceabilityResult {
  productCode: string;
  productName: string;
  productCategory: StockCategory;
  batchSerial: string | null;
  sourceType: 'Manufactured' | 'Purchased';
  sourceDocument: string;
  currentWarehouse: string;
  currentLocation: string;
  currentStatus: StockStatus;
  remainingQty: number | null;
  uom: UnitOfMeasure;
  qualityStatus: string;
  latestMovement: string;
  missingFields: string[];
  events: TraceabilityEvent[];
}

// ─── Barcode scan result ──────────────────────────────────────
export interface BarcodeScanResult {
  code: string;
  type: 'Product' | 'Batch' | 'Serial' | 'Unknown';
  productCode: string | null;
  productName: string | null;
  productCategory: StockCategory | null;
  batchSerial: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  bin: string | null;
  onHandQty: number | null;
  availableQty: number | null;
  uom: UnitOfMeasure | null;
  status: StockStatus | null;
  errorMessage: string | null;
  foundAt: string;
}

// ─── Filter State ─────────────────────────────────────────────
export type InventoryTab = 'stock' | 'traceability' | 'barcode' | 'movements' | 'alerts';

export interface InventoryFilters {
  warehouseId: string;
  search: string;
  category: StockCategory | 'ALL';
  stockStatus: StockStatus | 'ALL';
  trackingType: TrackingType | 'ALL';
  lowStock: boolean;
  nearExpiry: boolean;
  onHold: boolean;
  dateFrom: string;
  dateTo: string;
}

// ─── Page state ───────────────────────────────────────────────
export interface InventoryPageData {
  metrics: InventoryMetrics;
  records: InventoryRecord[];
  movements: InventoryMovement[];
  alerts: InventoryAlert[];
  lastRefresh: string;
  isMockData: boolean;
}
