// ============================================================
// SERVICE — TASKS & REPORTS
// ============================================================

import type {
  Task,
  Handoff,
  AuditEvent,
  ReportMetadata,
  TaskMetrics,
  TaskStatus,
} from '../types';

export async function fetchTaskMetrics(): Promise<TaskMetrics> {
  return {
    myOpenTasks: 8,
    teamTasks: 24,
    overdueTasks: 5,
    blockedTasks: 3,
    awaitingOtherDepts: 12,
    highPriorityTasks: 4,
    openStockExceptions: 15,
    completedToday: 18,
    lastRefresh: new Date().toISOString(),
  };
}

export async function fetchTasks(_warehouseId: string, _userId?: string): Promise<Task[]> {
  return [
    {
      id: 'task-001',
      taskNumber: 'TSK-2026-001',
      title: 'Verify Partial Receipt',
      description: 'Discrepancy found in GRN-2026-501. Verify actual quantity.',
      category: 'Receipt Discrepancy',
      sourceWorkspace: 'Receiving Centre',
      sourceEntityType: 'GRN',
      sourceEntityId: 'GRN-2026-501',
      relatedTransactionId: 'TX-991',
      warehouseId: 'WH-001',
      assignedUserId: 'user-1',
      assignedUserName: 'John Doe',
      assignedDepartmentId: 'dept-store',
      assignedDepartmentName: 'Store Manager',
      priority: 'High',
      status: 'Open',
      blockingReason: null,
      nextAction: 'Count physical stock in Bin A-101',
      dueAt: '2026-10-23T17:00:00Z',
      createdAt: '2026-10-22T08:00:00Z',
      updatedAt: new Date().toISOString(),
      completedAt: null,
    },
    {
      id: 'task-002',
      taskNumber: 'TSK-2026-002',
      title: 'Coordinate Finished Goods Receipt',
      description: 'Production output CP-2026-701 is ready for warehouse receipt.',
      category: 'Production Output Receipt',
      sourceWorkspace: 'Finished Goods & Quality',
      sourceEntityType: 'Completion Note',
      sourceEntityId: 'CP-2026-701',
      relatedTransactionId: null,
      warehouseId: 'WH-002',
      assignedUserId: 'user-2',
      assignedUserName: 'Jane Smith',
      assignedDepartmentId: 'dept-store',
      assignedDepartmentName: 'Store Manager',
      priority: 'Medium',
      status: 'Assigned',
      blockingReason: null,
      nextAction: 'Confirm physical receipt',
      dueAt: '2026-10-24T17:00:00Z',
      createdAt: '2026-10-22T10:00:00Z',
      updatedAt: new Date().toISOString(),
      completedAt: null,
    },
  ];
}

export async function fetchHandoffs(_warehouseId: string): Promise<Handoff[]> {
  return [
    {
      id: 'ho-001',
      handoffNumber: 'HO-2026-001',
      taskId: 'task-001',
      sourceEntityType: 'GRN',
      sourceEntityId: 'GRN-2026-501',
      originatingDepartmentId: 'dept-store',
      originatingDepartmentName: 'Store Manager',
      receivingDepartmentId: 'dept-procure',
      receivingDepartmentName: 'Procurement',
      assignedUserId: 'procure-user-1',
      requestedAction: 'Verify Supplier Invoice',
      reason: 'Supplier invoice discrepancy under review before stock release.',
      priority: 'High',
      status: 'Sent',
      sentAt: '2026-10-22T11:00:00Z',
      acknowledgedAt: null,
      dueAt: '2026-10-25T17:00:00Z',
      resolvedAt: null,
      resolutionReference: null,
    },
  ];
}

export async function fetchAuditEvents(_warehouseId: string): Promise<AuditEvent[]> {
  return [
    {
      id: 'evt-001',
      eventDate: '2026-10-23T09:15:00Z',
      userId: 'user-1',
      userName: 'John Doe',
      actionType: 'Receipt Posted',
      sourceWorkspace: 'Receiving Centre',
      sourceEntityType: 'GRN',
      sourceRecordRef: 'GRN-2026-501',
      relatedTransactionId: 'TX-991',
      warehouseId: 'WH-001',
      productSku: 'SKU-123',
      previousStatus: 'Pending',
      newStatus: 'Posted',
      outcome: 'Success',
      details: 'Received 100 units into Bin A-101',
    },
  ];
}

export async function fetchReportCatalogue(): Promise<ReportMetadata[]> {
  return [
    {
      id: 'rep-001',
      title: 'Inventory Valuation Report',
      description: 'Calculates total stock value based on current on-hand quantities and cost.',
      category: 'Inventory',
      permissions: ['Manager', 'Admin'],
      availableFilters: ['Warehouse', 'Category', 'Date Range'],
      dataSource: 'InventoryService',
    },
    {
      id: 'rep-002',
      title: 'Overdue Handoffs Report',
      description: 'Lists all departmental handoffs past their due date.',
      category: 'Tasks',
      permissions: ['StoreManager', 'Manager'],
      availableFilters: ['Department', 'Priority'],
      dataSource: 'TaskService',
    },
  ];
}

export async function updateTaskStatus(taskId: string, status: TaskStatus, reason?: string): Promise<{ success: boolean }> {
  console.log(`Updating task ${taskId} to ${status}. Reason: ${reason}`);
  return { success: true };
}

export async function createHandoff(handoff: Partial<Handoff>): Promise<{ success: boolean; handoffNumber: string }> {
  console.log('Creating handoff:', handoff);
  return { success: true, handoffNumber: `HO-2026-${Math.floor(Math.random() * 1000)}` };
}
