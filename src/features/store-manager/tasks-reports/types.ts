// ============================================================
// TYPES — TASKS & REPORTS
// ============================================================

export type TaskCategory =
  | 'Supplier Receipt'
  | 'Receipt Discrepancy'
  | 'Material Issue'
  | 'Production Output Receipt'
  | 'QC Handoff'
  | 'Finished-Goods Exception'
  | 'Warehouse Transfer'
  | 'Destination Receipt'
  | 'Stock Count'
  | 'Stock-Count Variance'
  | 'Inventory Adjustment Approval'
  | 'Sales Picking'
  | 'Packing'
  | 'Dispatch'
  | 'Customer Return'
  | 'Stock Exception'
  | 'General Warehouse Task';

export type TaskStatus = 'Open' | 'Assigned' | 'In Progress' | 'Waiting for Another Department' | 'Blocked' | 'Awaiting Approval' | 'Overdue' | 'Completed' | 'Cancelled';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type HandoffStatus = 'Draft' | 'Sent' | 'Acknowledged' | 'In Progress' | 'Awaiting Information' | 'Awaiting Approval' | 'Blocked' | 'Resolved' | 'Closed' | 'Cancelled';

export interface Task {
  id: string;
  taskNumber: string;
  title: string;
  description: string;
  category: TaskCategory;
  sourceWorkspace: string;
  sourceEntityType: string;
  sourceEntityId: string;
  relatedTransactionId: string | null;
  warehouseId: string;
  assignedUserId: string;
  assignedUserName: string;
  assignedDepartmentId: string;
  assignedDepartmentName: string;
  priority: Priority;
  status: TaskStatus;
  blockingReason: string | null;
  nextAction: string;
  dueAt: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface Handoff {
  id: string;
  handoffNumber: string;
  taskId: string;
  sourceEntityType: string;
  sourceEntityId: string;
  originatingDepartmentId: string;
  originatingDepartmentName: string;
  receivingDepartmentId: string;
  receivingDepartmentName: string;
  assignedUserId: string | null;
  requestedAction: string;
  reason: string;
  priority: Priority;
  status: HandoffStatus;
  sentAt: string;
  acknowledgedAt: string | null;
  dueAt: string;
  resolvedAt: string | null;
  resolutionReference: string | null;
}

export interface AuditEvent {
  id: string;
  eventDate: string;
  userId: string;
  userName: string;
  actionType: string;
  sourceWorkspace: string;
  sourceEntityType: string;
  sourceRecordRef: string;
  relatedTransactionId: string | null;
  warehouseId: string;
  productSku: string | null;
  previousStatus: string | null;
  newStatus: string | null;
  outcome: string;
  details: string;
}

export interface ReportMetadata {
  id: string;
  title: string;
  description: string;
  category: string;
  permissions: string[];
  availableFilters: string[];
  dataSource: string;
}

export interface TaskMetrics {
  myOpenTasks: number;
  teamTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  awaitingOtherDepts: number;
  highPriorityTasks: number;
  openStockExceptions: number;
  completedToday: number;
  lastRefresh: string;
}
