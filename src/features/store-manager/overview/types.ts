// ============================================================
// STORE MANAGER OVERVIEW — TYPE DEFINITIONS
// ============================================================

// ─── Warehouse ───────────────────────────────────────────────
export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string;
}

// ─── Workspace Status ────────────────────────────────────────
export type WorkspaceStatusValue =
  | 'Completed'
  | 'In Progress'
  | 'Pending'
  | 'Waiting for Another Department'
  | 'Blocked'
  | 'Overdue'
  | 'Attention Required'
  | 'Not Started'
  | 'Cancelled'
  | 'Unavailable'
  | 'Operational'
  | 'On Track'
  | 'Receiving in Progress'
  | 'Waiting for Quality Control'
  | 'Waiting for Procurement'
  | 'Normal'
  | 'Low Stock Warning'
  | 'Hold or Traceability Issue'
  | 'No Pending Issues'
  | 'Issue in Progress'
  | 'Waiting for Authorization'
  | 'Material Shortage'
  | 'Clear'
  | 'Receipt Pending'
  | 'Awaiting Quality Release'
  | 'Rejected Stock Present'
  | 'Transfer in Progress'
  | 'Transfer Overdue'
  | 'Count in Progress'
  | 'Variance Review Required'
  | 'Fulfilment on Track'
  | 'Picking in Progress'
  | 'Dispatch Due'
  | 'Stock Shortage'
  | 'Return Inspection Pending'
  | 'Up to Date'
  | 'Tasks Pending'
  | 'Waiting for Another Department'
  | 'Data Refresh Failed';

export interface WorkspaceStatus {
  workspaceId: number;
  workspaceName: string;
  route: string;
  overallStatus: WorkspaceStatusValue;
  openItems: number;
  completedToday: number;
  overdueItems: number;
  blockedItems: number;
  lastUpdated: string | null;
  mainIssue: string;
  responsibleDepartment: string | null;
  statusSeverity: 'ok' | 'warning' | 'critical' | 'info' | 'unavailable';
}

// ─── Dashboard Metrics ───────────────────────────────────────
export interface DashboardMetrics {
  pendingReceipts: number;
  qualityInspectionPending: number;
  materialIssuesPending: number;
  finishedGoodsAwaitingReceipt: number;
  transfersInTransit: number;
  ordersAwaitingPicking: number;
  stockCountVariances: number;
  openStockExceptions: number;
}

// ─── Task ────────────────────────────────────────────────────
export type TaskPriority = 'Urgent' | 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Open' | 'In Progress' | 'Overdue' | 'Blocked' | 'Completed' | 'Pending';

export interface Task {
  id: string;
  taskName: string;
  transactionRef: string;
  workspace: string;
  workspaceRoute: string;
  warehouse: string;
  responsibleDepartment: string;
  assignedPerson: string;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
  nextAction: string;
}

// ─── Alert ───────────────────────────────────────────────────
export type AlertPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type AlertType =
  | 'Raw Material Low Stock'
  | 'Finished Goods Low Stock'
  | 'Near-Expiry Batch'
  | 'Expired Stock'
  | 'Damaged Goods'
  | 'Quality Hold'
  | 'Missing Batch/Serial'
  | 'Stock Count Discrepancy'
  | 'Overdue Transfer'
  | 'Insufficient Stock for Order';

export interface StockAlert {
  id: string;
  alertType: AlertType;
  productRef: string;
  warehouse: string;
  quantityAffected: number | null;
  unit: string | null;
  alertDate: string;
  priority: AlertPriority;
  responsiblePerson: string;
  requiredAction: string;
  detailsRoute: string;
  acknowledged: boolean;
}

// ─── Department Hand-Off ─────────────────────────────────────
export interface DepartmentHandoff {
  id: string;
  relatedWorkspace: string;
  transactionType: string;
  responsibleDepartment: string;
  dateRaised: string;
  timeWaiting: string;
  priority: AlertPriority;
  currentStatus: string;
  nextRequiredAction: string;
  assignedPerson: string | null;
  detailsRoute: string;
}

// ─── Inventory Movement ──────────────────────────────────────
export type MovementStatus = 'Posted' | 'Draft' | 'Pending' | 'Cancelled' | 'Reversed';

export interface InventoryMovement {
  id: string;
  transactionType: string;
  productRef: string;
  quantity: number;
  unit: string;
  sourceLocation: string;
  destinationLocation: string;
  performedBy: string;
  dateTime: string;
  status: MovementStatus;
  detailsRoute: string;
}

// ─── Overview Data ───────────────────────────────────────────
export interface StoreManagerOverviewData {
  metrics: DashboardMetrics;
  workspaceStatuses: WorkspaceStatus[];
  tasks: Task[];
  alerts: StockAlert[];
  handoffs: DepartmentHandoff[];
  recentActivity: InventoryMovement[];
  lastRefresh: string;
  isMockData: boolean;
}

// ─── Filter State ─────────────────────────────────────────────
export interface OverviewFilters {
  warehouseId: string;
  dateFrom: string;
  dateTo: string;
}

// ─── User ────────────────────────────────────────────────────
export interface CurrentUser {
  id: string;
  name: string;
  role: string;
  assignedWarehouses: Warehouse[];
  permissions: string[];
}
