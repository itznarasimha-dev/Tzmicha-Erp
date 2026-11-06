// ============================================================
// SERVICE — TRANSFERS & STOCK COUNT
// ============================================================

import type {
  TransferRequest,
  InTransitShipment,
  StockCountSession,
  StockVariance,
  TransferMetrics,
} from '../types';
import { useErpStore } from '../../../../store/useErpStore';

export async function fetchTransferMetrics(): Promise<TransferMetrics> {
  return {
    awaitingAction: 5,
    readyForDispatch: 3,
    inTransit: 7,
    partialReceipts: 2,
    transferExceptions: 4,
    activeCounts: 2,
    pendingVarianceReview: 6,
    pendingAdjustments: 3,
  };
}

export async function fetchTransferRequests(_warehouseId: string): Promise<TransferRequest[]> {
  return [
    {
      id: 'tr-001',
      transferNumber: 'TRF-2026-001',
      type: 'Warehouse-to-Warehouse',
      sourceWarehouseId: 'WH-001',
      sourceWarehouseName: 'Main Production Warehouse',
      destinationWarehouseId: 'WH-002',
      destinationWarehouseName: 'Finished Goods Store',
      requestedDate: '2026-10-20T08:00:00Z',
      requiredByDate: '2026-10-25T17:00:00Z',
      reason: 'Replenishment of stock for sales orders',
      priority: 'High',
      requestedBy: 'Sarah Store',
      status: 'Approved for Dispatch',
      approvalReference: 'APP-TRF-101',
      lines: [
        { id: 'l1', productId: 'p1', productName: 'Industrial Gearbox', sku: 'IGB-200', sourceBin: 'A-101', destinationBin: 'B-201', batchNumber: 'B1', serialNumbers: [], uom: 'units', requestedQty: 50, dispatchedQty: 0, receivedQty: 0, availableSourceQty: 100 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tr-002',
      transferNumber: 'TRF-2026-002',
      type: 'Bin-to-Bin',
      sourceWarehouseId: 'WH-001',
      sourceWarehouseName: 'Main Production Warehouse',
      destinationWarehouseId: 'WH-001',
      destinationWarehouseName: 'Main Production Warehouse',
      requestedDate: '2026-10-21T08:00:00Z',
      requiredByDate: '2026-10-22T17:00:00Z',
      reason: 'Optimizing bin space',
      priority: 'Low',
      requestedBy: 'Mike Warehouse',
      status: 'Submitted',
      approvalReference: null,
      lines: [
        { id: 'l2', productId: 'p2', productName: 'Precision Valve', sku: 'PV-10', sourceBin: 'A-105', destinationBin: 'A-205', batchNumber: 'B2', serialNumbers: [], uom: 'units', requestedQty: 200, dispatchedQty: 0, receivedQty: 0, availableSourceQty: 200 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export async function postDispatch(transferId: string, lines: any[]): Promise<{ success: boolean; dispatchId: string }> {
  await new Promise((r) => setTimeout(r, 500));
  const store = useErpStore.getState();
  if (Array.isArray(lines) && lines.length > 0) {
    for (const line of lines) {
      const targetWh = store.warehouses[1]?.id || store.warehouses[0]?.id;
      const srcBatch = store.batches.find((b) => b.batchNumber === line.batchNumber || b.productSku === line.sku) || store.batches[0];
      if (srcBatch && targetWh && srcBatch.warehouseId !== targetWh) {
        store.transferStock(srcBatch.id, targetWh, Math.min(line.requestedQty || 10, srcBatch.availableQuantity), `Transfer ${transferId}`);
      }
    }
  }
  return { success: true, dispatchId: `DSP-${Math.random().toString(36).substr(2, 9).toUpperCase()}` };
}

export async function fetchInTransitShipments(_warehouseId: string): Promise<InTransitShipment[]> {
  return [
    {
      id: 'ship-001',
      transferNumber: 'TRF-2026-001',
      dispatchTransactionId: 'DSP-X92K',
      sourceWarehouseId: 'WH-001',
      destinationWarehouseId: 'WH-002',
      destinationWarehouseName: 'Finished Goods Store',
      totalDispatchedQty: 50,
      totalReceivedQty: 20,
      outstandingQty: 30,
      dispatchDate: '2026-10-21T14:00:00Z',
      expectedArrivalDate: '2026-10-23T17:00:00Z',
      status: 'Partially Received',
      sender: 'Sarah Store',
      receiver: 'James Warehouse',
      exceptionFlag: false,
      updatedAt: new Date().toISOString(),
    },
  ];
}

export async function postReceipt(shipmentId: string, receivedQty: number): Promise<{ success: boolean }> {
  console.log(`Receiving shipment ${shipmentId} qty ${receivedQty}`);
  return { success: true };
}

export async function fetchCountSessions(_warehouseId: string): Promise<StockCountSession[]> {
  return [
    {
      id: 'cnt-001',
      countNumber: 'CNT-2026-001',
      type: 'Cycle Count',
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      status: 'In Progress',
      plannedDate: '2026-10-22T08:00:00Z',
      startedDate: '2026-10-22T09:00:00Z',
      dueAt: '2026-10-25T17:00:00Z',
      assignedUsers: ['Counter A', 'Counter B'],
      totalLines: 100,
      countedLines: 45,
      varianceLines: 12,
      createdBy: 'Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export async function fetchVariances(_warehouseId: string): Promise<StockVariance[]> {
  return [
    {
      id: 'var-001',
      varianceNumber: 'VAR-2026-001',
      sessionId: 'cnt-001',
      productId: 'p1',
      productName: 'Industrial Gearbox',
      sku: 'IGB-200',
      locationId: 'A-101',
      batchNumber: 'B1',
      systemQty: 100,
      finalCountQty: 92,
      varianceQty: -8,
      uom: 'units',
      type: 'Shortage',
      reason: 'Unaccounted loss',
      status: 'Open',
      reviewer: null,
      approvalReference: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export async function postAdjustment(varianceId: string, approvedQty: number, reason: string): Promise<{ success: boolean; adjId: string }> {
  await new Promise((r) => setTimeout(r, 500));
  const store = useErpStore.getState();
  const batch = store.batches[0];
  if (batch) {
    store.requestStockAdjustment(batch.id, approvedQty, 'damage', `Cycle count adjustment: ${reason}`);
  }
  return { success: true, adjId: `ADJ-${Math.random().toString(36).substr(2, 9).toUpperCase()}` };
}
