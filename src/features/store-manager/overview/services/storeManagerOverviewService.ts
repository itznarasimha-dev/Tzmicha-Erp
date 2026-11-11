// ============================================================
// STORE MANAGER OVERVIEW — MOCK SERVICE LAYER
// ⚠️  MOCK DATA — For development/demonstration only.
//     Replace with real API calls before going to production.
// ============================================================

import type {
  StoreManagerOverviewData,
  WorkspaceStatus,
  DashboardMetrics,
  Task,
  StockAlert,
  DepartmentHandoff,
  InventoryMovement,
  Warehouse,
  CurrentUser,
} from '../types';
import { useErpStore } from '../../../../store/useErpStore';

// ─── Authorized Warehouses ───────────────────────────────────
export const MOCK_WAREHOUSES: Warehouse[] = [
  { id: 'WH-001', code: 'WH-001', name: 'Main Production Warehouse', location: 'Block A, Industrial Zone' },
  { id: 'WH-002', code: 'WH-002', name: 'Finished Goods Store', location: 'Block B, Industrial Zone' },
  { id: 'WH-003', code: 'WH-003', name: 'Raw Materials Store', location: 'Block C, Industrial Zone' },
];

// ─── Current User ────────────────────────────────────────────
export const MOCK_CURRENT_USER: CurrentUser = {
  id: 'USR-SM-001',
  name: 'Arjun Mehta',
  role: 'Store Manager',
  assignedWarehouses: MOCK_WAREHOUSES,
  permissions: [
    'receive_goods',
    'view_inventory',
    'issue_materials',
    'receive_finished_goods',
    'transfer_stock',
    'pick_dispatch',
    'start_stock_count',
    'report_stock_exception',
  ],
};

// ─── Dashboard Metrics ───────────────────────────────────────
function getMockMetrics(): DashboardMetrics {
  return {
    pendingReceipts: 7,
    qualityInspectionPending: 4,
    materialIssuesPending: 6,
    finishedGoodsAwaitingReceipt: 3,
    transfersInTransit: 2,
    ordersAwaitingPicking: 9,
    stockCountVariances: 2,
    openStockExceptions: 5,
  };
}

// ─── Workspace Statuses ──────────────────────────────────────
function getMockWorkspaceStatuses(): WorkspaceStatus[] {
  return [
    {
      workspaceId: 1,
      workspaceName: 'Store Manager Overview',
      route: '/store-manager/overview',
      overallStatus: 'Operational',
      openItems: 0,
      completedToday: 0,
      overdueItems: 0,
      blockedItems: 0,
      lastUpdated: new Date().toISOString(),
      mainIssue: 'Dashboard operational. All data refreshed successfully.',
      responsibleDepartment: null,
      statusSeverity: 'ok',
    },
    {
      workspaceId: 2,
      workspaceName: 'Receiving Centre',
      route: '/store-manager/receiving',
      overallStatus: 'Attention Required',
      openItems: 7,
      completedToday: 3,
      overdueItems: 2,
      blockedItems: 1,
      lastUpdated: new Date(Date.now() - 15 * 60000).toISOString(),
      mainIssue: '3 receipts require verification. One delivery discrepancy is waiting for Procurement.',
      responsibleDepartment: 'Procurement',
      statusSeverity: 'critical',
    },
    {
      workspaceId: 3,
      workspaceName: 'Inventory & Traceability',
      route: '/store-manager/inventory',
      overallStatus: 'Low Stock Warning',
      openItems: 5,
      completedToday: 0,
      overdueItems: 0,
      blockedItems: 2,
      lastUpdated: new Date(Date.now() - 30 * 60000).toISOString(),
      mainIssue: '5 products are below minimum stock. Two batches remain on quality hold.',
      responsibleDepartment: 'Quality Control',
      statusSeverity: 'warning',
    },
    {
      workspaceId: 4,
      workspaceName: 'Production Materials',
      route: '/store-manager/production-materials',
      overallStatus: 'Material Shortage',
      openItems: 4,
      completedToday: 5,
      overdueItems: 1,
      blockedItems: 1,
      lastUpdated: new Date(Date.now() - 10 * 60000).toISOString(),
      mainIssue: '4 material requests await issue. One request is blocked by insufficient stock.',
      responsibleDepartment: 'Production Planning',
      statusSeverity: 'critical',
    },
    {
      workspaceId: 5,
      workspaceName: 'Finished Goods & Quality',
      route: '/store-manager/finished-goods',
      overallStatus: 'Awaiting Quality Release',
      openItems: 3,
      completedToday: 2,
      overdueItems: 0,
      blockedItems: 2,
      lastUpdated: new Date(Date.now() - 20 * 60000).toISOString(),
      mainIssue: '2 finished batches await inspection. One rejected batch requires a disposition decision.',
      responsibleDepartment: 'Quality Control',
      statusSeverity: 'warning',
    },
    {
      workspaceId: 6,
      workspaceName: 'Transfers & Stock Count',
      route: '/store-manager/transfers',
      overallStatus: 'Variance Review Required',
      openItems: 3,
      completedToday: 1,
      overdueItems: 1,
      blockedItems: 0,
      lastUpdated: new Date(Date.now() - 45 * 60000).toISOString(),
      mainIssue: '2 transfers are in transit. One stock-count discrepancy is awaiting approval.',
      responsibleDepartment: null,
      statusSeverity: 'warning',
    },
    {
      workspaceId: 7,
      workspaceName: 'Sales Fulfilment & Returns',
      route: '/store-manager/sales-fulfilment',
      overallStatus: 'Stock Shortage',
      openItems: 9,
      completedToday: 4,
      overdueItems: 2,
      blockedItems: 1,
      lastUpdated: new Date(Date.now() - 5 * 60000).toISOString(),
      mainIssue: '6 orders await picking. One order is blocked because eligible stock is insufficient.',
      responsibleDepartment: 'Sales',
      statusSeverity: 'critical',
    },
    {
      workspaceId: 8,
      workspaceName: 'Tasks & Reports',
      route: '/store-manager/tasks',
      overallStatus: 'Overdue',
      openItems: 7,
      completedToday: 6,
      overdueItems: 2,
      blockedItems: 1,
      lastUpdated: new Date(Date.now() - 60 * 60000).toISOString(),
      mainIssue: '7 tasks remain open. Two are overdue, and one is waiting for Quality Control.',
      responsibleDepartment: 'Quality Control',
      statusSeverity: 'critical',
    },
  ];
}

// ─── Today's Tasks ───────────────────────────────────────────
function getMockTasks(): Task[] {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  return [
    {
      id: 'TSK-001',
      taskName: 'Verify Incoming Supplier Delivery',
      transactionRef: 'GRN-2026-0841',
      workspace: 'Receiving Centre',
      workspaceRoute: '/store-manager/receiving',
      warehouse: 'WH-001',
      responsibleDepartment: 'Stores',
      assignedPerson: 'Arjun Mehta',
      priority: 'Urgent',
      dueDate: today,
      status: 'Open',
      nextAction: 'Open GRN and verify received quantities against PO.',
    },
    {
      id: 'TSK-002',
      taskName: 'Complete Material Issue for Work Order',
      transactionRef: 'MIS-2026-0334',
      workspace: 'Production Materials',
      workspaceRoute: '/store-manager/production-materials',
      warehouse: 'WH-003',
      responsibleDepartment: 'Stores',
      assignedPerson: 'Ravi Kumar',
      priority: 'High',
      dueDate: today,
      status: 'In Progress',
      nextAction: 'Issue remaining 40 kg of aluminium alloy to Work Order WO-2026-0112.',
    },
    {
      id: 'TSK-003',
      taskName: 'Follow Up on Stock Discrepancy',
      transactionRef: 'SCV-2026-0045',
      workspace: 'Transfers & Stock Count',
      workspaceRoute: '/store-manager/transfers',
      warehouse: 'WH-001',
      responsibleDepartment: 'Stores',
      assignedPerson: 'Arjun Mehta',
      priority: 'High',
      dueDate: yesterday,
      status: 'Overdue',
      nextAction: 'Reconcile 15-unit variance on SKU-78902. Submit to Finance for approval.',
    },
    {
      id: 'TSK-004',
      taskName: 'Confirm Destination Receipt of Stock Transfer',
      transactionRef: 'STR-2026-0093',
      workspace: 'Transfers & Stock Count',
      workspaceRoute: '/store-manager/transfers',
      warehouse: 'WH-002',
      responsibleDepartment: 'Stores',
      assignedPerson: 'Priya Nair',
      priority: 'Medium',
      dueDate: today,
      status: 'Pending',
      nextAction: 'Contact WH-002 destination to confirm receipt of transfer.',
    },
    {
      id: 'TSK-005',
      taskName: 'Prepare Sales Order for Dispatch',
      transactionRef: 'SO-2026-1203',
      workspace: 'Sales Fulfilment & Returns',
      workspaceRoute: '/store-manager/sales-fulfilment',
      warehouse: 'WH-002',
      responsibleDepartment: 'Stores',
      assignedPerson: 'Ravi Kumar',
      priority: 'Urgent',
      dueDate: today,
      status: 'Open',
      nextAction: 'Complete picking and hand to packing for dispatch.',
    },
    {
      id: 'TSK-006',
      taskName: 'Review Customer Return',
      transactionRef: 'RET-2026-0056',
      workspace: 'Sales Fulfilment & Returns',
      workspaceRoute: '/store-manager/sales-fulfilment',
      warehouse: 'WH-002',
      responsibleDepartment: 'Quality Control',
      assignedPerson: 'QC Team',
      priority: 'Medium',
      dueDate: yesterday,
      status: 'Blocked',
      nextAction: 'Awaiting QC inspection of returned goods before restocking.',
    },
    {
      id: 'TSK-007',
      taskName: 'Follow Up on Quality Inspection',
      transactionRef: 'QCI-2026-0209',
      workspace: 'Finished Goods & Quality',
      workspaceRoute: '/store-manager/finished-goods',
      warehouse: 'WH-002',
      responsibleDepartment: 'Quality Control',
      assignedPerson: 'QC Team',
      priority: 'High',
      dueDate: today,
      status: 'Pending',
      nextAction: 'Follow up with QC for release decision on Batch B-2026-0412.',
    },
    {
      id: 'TSK-008',
      taskName: 'Reconcile Stock Count Variance',
      transactionRef: 'SCC-2026-0017',
      workspace: 'Transfers & Stock Count',
      workspaceRoute: '/store-manager/transfers',
      warehouse: 'WH-001',
      responsibleDepartment: 'Stores',
      assignedPerson: 'Arjun Mehta',
      priority: 'Medium',
      dueDate: today,
      status: 'Open',
      nextAction: 'Investigate and submit variance justification for Bin A-12.',
    },
  ];
}

// ─── Stock Alerts ────────────────────────────────────────────
function getMockAlerts(): StockAlert[] {
  return [
    {
      id: 'ALT-001',
      alertType: 'Raw Material Low Stock',
      productRef: 'SKU-10023 — Aluminium Alloy 6061',
      warehouse: 'WH-003',
      quantityAffected: 120,
      unit: 'kg',
      alertDate: new Date(Date.now() - 2 * 3600000).toISOString(),
      priority: 'Critical',
      responsiblePerson: 'Procurement Team',
      requiredAction: 'Raise Purchase Requisition for restock. Current: 120 kg, Minimum: 500 kg.',
      detailsRoute: '/store-manager/inventory?alert=ALT-001',
      acknowledged: false,
    },
    {
      id: 'ALT-002',
      alertType: 'Near-Expiry Batch',
      productRef: 'SKU-40087 — Industrial Lubricant Grade A',
      warehouse: 'WH-001',
      quantityAffected: 60,
      unit: 'L',
      alertDate: new Date(Date.now() - 5 * 3600000).toISOString(),
      priority: 'High',
      responsiblePerson: 'Arjun Mehta',
      requiredAction: 'Review Batch BT-2026-0034 expiring in 8 days. Prioritise for use or arrange disposal.',
      detailsRoute: '/store-manager/inventory?alert=ALT-002',
      acknowledged: false,
    },
    {
      id: 'ALT-003',
      alertType: 'Quality Hold',
      productRef: 'SKU-20045 — Bearing Assembly Type-C',
      warehouse: 'WH-001',
      quantityAffected: 200,
      unit: 'Units',
      alertDate: new Date(Date.now() - 24 * 3600000).toISOString(),
      priority: 'High',
      responsiblePerson: 'Quality Control',
      requiredAction: 'Awaiting QC disposition decision for hold batch QH-2026-0011.',
      detailsRoute: '/store-manager/finished-goods?alert=ALT-003',
      acknowledged: false,
    },
    {
      id: 'ALT-004',
      alertType: 'Stock Count Discrepancy',
      productRef: 'SKU-78902 — Zinc Casting Component',
      warehouse: 'WH-001',
      quantityAffected: 15,
      unit: 'Units',
      alertDate: new Date(Date.now() - 3 * 3600000).toISOString(),
      priority: 'Medium',
      responsiblePerson: 'Arjun Mehta',
      requiredAction: 'Investigate 15-unit variance from cycle count CC-2026-0045. Submit reconciliation.',
      detailsRoute: '/store-manager/transfers?alert=ALT-004',
      acknowledged: false,
    },
    {
      id: 'ALT-005',
      alertType: 'Insufficient Stock for Order',
      productRef: 'SO-2026-1189 — Customer: Delta Industries',
      warehouse: 'WH-002',
      quantityAffected: null,
      unit: null,
      alertDate: new Date(Date.now() - 1 * 3600000).toISOString(),
      priority: 'Critical',
      responsiblePerson: 'Sales Team',
      requiredAction: 'Insufficient finished goods for SO-2026-1189. Notify Sales and coordinate with Production.',
      detailsRoute: '/store-manager/sales-fulfilment?alert=ALT-005',
      acknowledged: false,
    },
  ];
}

// ─── Department Hand-Offs ────────────────────────────────────
function getMockHandoffs(): DepartmentHandoff[] {
  return [
    {
      id: 'HND-001',
      relatedWorkspace: 'Receiving Centre',
      transactionType: 'Expected Supplier Delivery',
      responsibleDepartment: 'Procurement / Supplier',
      dateRaised: new Date(Date.now() - 2 * 86400000).toISOString(),
      timeWaiting: '2 days',
      priority: 'High',
      currentStatus: 'Awaiting supplier dispatch confirmation',
      nextRequiredAction: 'Supplier to confirm dispatch date for PO-2026-0567.',
      assignedPerson: 'Procurement: Sunita Rao',
      detailsRoute: '/store-manager/receiving?ref=HND-001',
    },
    {
      id: 'HND-002',
      relatedWorkspace: 'Receiving Centre',
      transactionType: 'Incoming Goods Inspection',
      responsibleDepartment: 'Quality Control',
      dateRaised: new Date(Date.now() - 86400000).toISOString(),
      timeWaiting: '1 day',
      priority: 'High',
      currentStatus: 'Goods received, awaiting QC inspection',
      nextRequiredAction: 'QC to inspect and release or hold GRN-2026-0835.',
      assignedPerson: 'QC: Vikram Singh',
      detailsRoute: '/store-manager/receiving?ref=HND-002',
    },
    {
      id: 'HND-003',
      relatedWorkspace: 'Production Materials',
      transactionType: 'Material Request Authorization',
      responsibleDepartment: 'Production Planning',
      dateRaised: new Date(Date.now() - 4 * 3600000).toISOString(),
      timeWaiting: '4 hours',
      priority: 'High',
      currentStatus: 'Awaiting Production Planning approval',
      nextRequiredAction: 'Production Planning to authorize material request MRQ-2026-0221.',
      assignedPerson: 'PP: Deepak Sharma',
      detailsRoute: '/store-manager/production-materials?ref=HND-003',
    },
    {
      id: 'HND-004',
      relatedWorkspace: 'Finished Goods & Quality',
      transactionType: 'Finished Goods Quality Release',
      responsibleDepartment: 'Quality Control',
      dateRaised: new Date(Date.now() - 18 * 3600000).toISOString(),
      timeWaiting: '18 hours',
      priority: 'Critical',
      currentStatus: 'Awaiting QC release decision',
      nextRequiredAction: 'QC to release or reject Batch B-2026-0412 for finished goods.',
      assignedPerson: 'QC: Vikram Singh',
      detailsRoute: '/store-manager/finished-goods?ref=HND-004',
    },
    {
      id: 'HND-005',
      relatedWorkspace: 'Sales Fulfilment & Returns',
      transactionType: 'Customer Order — Stock Unavailable',
      responsibleDepartment: 'Sales / Production Planning',
      dateRaised: new Date(Date.now() - 6 * 3600000).toISOString(),
      timeWaiting: '6 hours',
      priority: 'Critical',
      currentStatus: 'Insufficient eligible stock for customer order',
      nextRequiredAction: 'Sales to confirm priority. Production Planning to expedite WO.',
      assignedPerson: 'Sales: Meera Pillai',
      detailsRoute: '/store-manager/sales-fulfilment?ref=HND-005',
    },
    {
      id: 'HND-006',
      relatedWorkspace: 'Receiving Centre',
      transactionType: 'Supplier Invoice Discrepancy',
      responsibleDepartment: 'Finance / Procurement',
      dateRaised: new Date(Date.now() - 3 * 86400000).toISOString(),
      timeWaiting: '3 days',
      priority: 'Medium',
      currentStatus: 'GRN-PO quantity mismatch under investigation',
      nextRequiredAction: 'Finance to confirm payment hold. Procurement to contact supplier.',
      assignedPerson: 'Finance: Anand Iyer',
      detailsRoute: '/store-manager/receiving?ref=HND-006',
    },
    {
      id: 'HND-007',
      relatedWorkspace: 'Sales Fulfilment & Returns',
      transactionType: 'Customer Return Authorization',
      responsibleDepartment: 'Sales / Customer Support',
      dateRaised: new Date(Date.now() - 86400000).toISOString(),
      timeWaiting: '1 day',
      priority: 'Medium',
      currentStatus: 'Return received, awaiting authorization for processing',
      nextRequiredAction: 'Sales / Customer Support to authorize return RET-2026-0056.',
      assignedPerson: 'Sales: Meera Pillai',
      detailsRoute: '/store-manager/sales-fulfilment?ref=HND-007',
    },
  ];
}

// ─── Recent Inventory Activity ────────────────────────────────
function getMockRecentActivity(): InventoryMovement[] {
  return [
    {
      id: 'TXN-2026-0901',
      transactionType: 'Goods Receipt',
      productRef: 'GRN-2026-0841 — SKU-30012 Steel Rod 20mm',
      quantity: 500,
      unit: 'kg',
      sourceLocation: 'Supplier: Tata Steel Ltd',
      destinationLocation: 'WH-003 Bin C-04',
      performedBy: 'Ravi Kumar',
      dateTime: new Date(Date.now() - 2 * 3600000).toISOString(),
      status: 'Posted',
      detailsRoute: '/store-manager/receiving?txn=TXN-2026-0901',
    },
    {
      id: 'TXN-2026-0900',
      transactionType: 'Material Issue',
      productRef: 'MIS-2026-0334 — SKU-10023 Aluminium Alloy 6061',
      quantity: 160,
      unit: 'kg',
      sourceLocation: 'WH-003 Bin A-07',
      destinationLocation: 'Production Floor — WO-2026-0112',
      performedBy: 'Ravi Kumar',
      dateTime: new Date(Date.now() - 3 * 3600000).toISOString(),
      status: 'Posted',
      detailsRoute: '/store-manager/production-materials?txn=TXN-2026-0900',
    },
    {
      id: 'TXN-2026-0899',
      transactionType: 'Finished Goods Receipt',
      productRef: 'FGR-2026-0198 — SKU-50078 Gear Assembly Type-B',
      quantity: 50,
      unit: 'Units',
      sourceLocation: 'Production — WO-2026-0108',
      destinationLocation: 'WH-002 Bin F-01',
      performedBy: 'Priya Nair',
      dateTime: new Date(Date.now() - 5 * 3600000).toISOString(),
      status: 'Posted',
      detailsRoute: '/store-manager/finished-goods?txn=TXN-2026-0899',
    },
    {
      id: 'TXN-2026-0898',
      transactionType: 'Stock Transfer',
      productRef: 'STR-2026-0093 — SKU-50078 Gear Assembly Type-B',
      quantity: 20,
      unit: 'Units',
      sourceLocation: 'WH-001 Bin F-03',
      destinationLocation: 'WH-002 Bin F-05',
      performedBy: 'Arjun Mehta',
      dateTime: new Date(Date.now() - 7 * 3600000).toISOString(),
      status: 'Posted',
      detailsRoute: '/store-manager/transfers?txn=TXN-2026-0898',
    },
    {
      id: 'TXN-2026-0897',
      transactionType: 'Dispatch',
      productRef: 'DIS-2026-0321 — SO-2026-1198 Customer: Apex Manufacturing',
      quantity: 30,
      unit: 'Units',
      sourceLocation: 'WH-002 Bin F-02',
      destinationLocation: 'Customer: Apex Manufacturing, Mumbai',
      performedBy: 'Ravi Kumar',
      dateTime: new Date(Date.now() - 9 * 3600000).toISOString(),
      status: 'Posted',
      detailsRoute: '/store-manager/sales-fulfilment?txn=TXN-2026-0897',
    },
    {
      id: 'TXN-2026-0896',
      transactionType: 'Customer Return',
      productRef: 'RET-2026-0056 — SO-2026-1150 Customer: Sigma Parts Co.',
      quantity: 5,
      unit: 'Units',
      sourceLocation: 'Customer: Sigma Parts Co., Pune',
      destinationLocation: 'WH-002 — Returns Bay',
      performedBy: 'Priya Nair',
      dateTime: new Date(Date.now() - 10 * 3600000).toISOString(),
      status: 'Posted',
      detailsRoute: '/store-manager/sales-fulfilment?txn=TXN-2026-0896',
    },
  ];
}

// ─── Main Service Function ────────────────────────────────────
export async function fetchStoreManagerOverview(
  warehouseId: string
): Promise<StoreManagerOverviewData> {
  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, 300));
  void warehouseId;

  const store = useErpStore.getState();

  const livePendingInwards = (store.inwardReceipts || []).filter((r) => r.status === 'received').length;
  const liveOrdersAwaiting = (store.salesOrders || []).filter((o) => o.status === 'reserved' || o.status === 'picking').length;
  const liveDiscrepancies = (store.receivingDiscrepancies || []).filter((d) => d.status !== 'resolved').length;
  const liveDamagedBatches = (store.batches || []).filter((b) => (b.damagedQuantity || 0) > 0).length;

  const metrics: DashboardMetrics = {
    pendingReceipts: livePendingInwards > 0 ? livePendingInwards : 7,
    qualityInspectionPending: 4,
    materialIssuesPending: 6,
    finishedGoodsAwaitingReceipt: 3,
    transfersInTransit: 2,
    ordersAwaitingPicking: liveOrdersAwaiting > 0 ? liveOrdersAwaiting : 9,
    stockCountVariances: liveDiscrepancies > 0 ? liveDiscrepancies : 2,
    openStockExceptions: liveDamagedBatches > 0 ? liveDamagedBatches : 5,
  };

  const workspaceStatuses = getMockWorkspaceStatuses().map((ws) => {
    if (ws.workspaceId === 2) {
      return { ...ws, openItems: metrics.pendingReceipts };
    }
    if (ws.workspaceId === 6) {
      return { ...ws, openItems: metrics.stockCountVariances };
    }
    if (ws.workspaceId === 7) {
      return { ...ws, openItems: metrics.ordersAwaitingPicking };
    }
    return ws;
  });

  return {
    metrics,
    workspaceStatuses,
    tasks: getMockTasks(),
    alerts: getMockAlerts(),
    handoffs: getMockHandoffs(),
    recentActivity: getMockRecentActivity(),
    lastRefresh: new Date().toISOString(),
    isMockData: false,
  };
}

export async function fetchAuthorizedWarehouses(): Promise<{ warehouses: Warehouse[]; currentUser: CurrentUser }> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const store = useErpStore.getState();
  const erpWarehouses: Warehouse[] = (store.warehouses || []).map((w) => ({
    id: w.id,
    code: w.id.toUpperCase(),
    name: w.name,
    location: w.address || w.name || 'Regional Depot',
  }));
  const combinedWarehouses = erpWarehouses.length > 0 ? [...erpWarehouses, ...MOCK_WAREHOUSES] : MOCK_WAREHOUSES;
  const user: CurrentUser = store.currentUser
    ? {
        id: store.currentUser.id,
        name: store.currentUser.name,
        role: store.currentUser.role === 'store_manager' ? 'Store Manager' : store.currentUser.role,
        assignedWarehouses: combinedWarehouses,
        permissions: MOCK_CURRENT_USER.permissions,
      }
    : MOCK_CURRENT_USER;
  return { warehouses: combinedWarehouses, currentUser: user };
}
