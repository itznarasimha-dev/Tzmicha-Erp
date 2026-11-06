// ============================================================
// SERVICE — FINISHED GOODS & QUALITY
// ============================================================

import type {
  ProductionOutputReceipt,
  QCRecord,
  FinishedGoodsStock,
  StockException,
  FinishedGoodsMetrics,
} from '../types';

export async function fetchFGMetrics(): Promise<FinishedGoodsMetrics> {
  // Simulating API call
  return {
    awaitingReceipt: { count: 12, qty: 1200 },
    partialReceipts: { count: 4, qty: 450 },
    awaitingQC: { count: 8, qty: 800 },
    qualityHold: { count: 3, qty: 150 },
    qcRejected: { count: 2, qty: 100 },
    releasedForStock: { count: 45, qty: 5000 },
    receiptDiscrepancies: { count: 5, qty: 200 },
    overdueHandoffs: { count: 3, qty: 300 },
    lastRefresh: new Date().toISOString(),
  };
}

export async function fetchProductionReceipts(_warehouseId: string, _category: string): Promise<ProductionOutputReceipt[]> {
  // Mock data for production receipts
  return [
    {
      id: 'rec-001',
      receiptNumber: 'RPT-2026-001',
      productionOrderId: 'PO-2026-101',
      productionCompletionId: 'CP-2026-501',
      productId: 'prod-101',
      productName: 'Industrial Gearbox G-200',
      sku: 'IGB-200-X',
      category: 'Power Transmission',
      sourceType: 'Manufactured',
      reportedOutputQty: 500,
      previouslyReceivedQty: 300,
      receivedQty: 0,
      remainingReceiptQty: 200,
      uom: 'units',
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      locationId: 'STG-01',
      locationName: 'Staging Area 1',
      batchNumber: 'BATCH-2026-A',
      serialNumbers: [],
      productionCompletionDate: '2026-10-20T10:00:00Z',
      expectedReceiptDate: '2026-10-21T17:00:00Z',
      qcRequired: true,
      qcReferenceId: null,
      receiptStatus: 'Partially Received',
      responsiblePerson: 'John Doe',
      dueDate: '2026-10-22T17:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'rec-002',
      receiptNumber: 'RPT-2026-002',
      productionOrderId: 'PO-2026-102',
      productionCompletionId: 'CP-2026-502',
      productId: 'prod-102',
      productName: 'Precision Valve V-10',
      sku: 'PV-10-S',
      category: 'Valves',
      sourceType: 'Manufactured',
      reportedOutputQty: 1000,
      previouslyReceivedQty: 0,
      receivedQty: 0,
      remainingReceiptQty: 1000,
      uom: 'units',
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      locationId: 'STG-02',
      locationName: 'Staging Area 2',
      batchNumber: 'BATCH-2026-B',
      serialNumbers: [],
      productionCompletionDate: '2026-10-21T08:00:00Z',
      expectedReceiptDate: '2026-10-22T17:00:00Z',
      qcRequired: true,
      qcReferenceId: null,
      receiptStatus: 'Pending',
      responsiblePerson: 'Jane Smith',
      dueDate: '2026-10-23T17:00:00Z',
      updatedAt: new Date().toISOString(),
    },
  ];
}

export async function postPhysicalReceipt(receiptId: string, qty: number, locationId: string, batch: string): Promise<{ success: boolean; transactionId: string }> {
  console.log(`Posting receipt ${receiptId} with qty ${qty} at ${locationId} batch ${batch}`);
  return { success: true, transactionId: `TRX-${Math.random().toString(36).substr(2, 9).toUpperCase()}` };
}

export async function fetchQCQueue(_warehouseId: string): Promise<QCRecord[]> {
  return [
    {
      id: 'qc-001',
      qcReferenceId: 'QC-REF-2026-001',
      sourceType: 'Manufacturing',
      sourceTransactionId: 'RPT-2026-002',
      productId: 'prod-102',
      productName: 'Precision Valve V-10',
      sku: 'PV-10-S',
      batchNumber: 'BATCH-2026-B',
      serialNumbers: [],
      quantityUnderInspection: 1000,
      uom: 'units',
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      inspectionLocation: 'QC-S-01',
      priority: 'High',
      requestedDate: '2026-10-22T10:00:00Z',
      dueDate: '2026-10-24T17:00:00Z',
      inspector: 'Alice QC',
      qcStatus: 'Awaiting Inspection',
      decisionDate: null,
      decisionReference: null,
      approvedQty: 0,
      rejectedQty: 0,
      heldQty: 0,
      comments: 'Standard inspection for new batch.',
      updatedAt: new Date().toISOString(),
    },
  ];
}

export async function fetchFGStock(_warehouseId: string, _category: string): Promise<FinishedGoodsStock[]> {
  return [
    {
      id: 'stk-001',
      productId: 'prod-101',
      productName: 'Industrial Gearbox G-200',
      sku: 'IGB-200-X',
      description: 'Heavy duty gearbox for conveyor systems',
      category: 'Manufactured',
      source: 'Production',
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      binLocation: 'BIN-A-101',
      batchNumber: 'BATCH-2026-A',
      serialNumbers: [],
      onHandQty: 450,
      reservedQty: 100,
      heldQty: 0,
      inTransitQty: 0,
      availableQty: 350,
      uom: 'units',
      qcStatus: 'Approved',
      expiryDate: null,
      condition: 'New',
      lastMovementDate: '2026-10-21T14:00:00Z',
      sourceTransactionId: 'RPT-2026-001',
    },
  ];
}

export async function fetchStockExceptions(_warehouseId: string): Promise<StockException[]> {
  return [
    {
      id: 'exc-001',
      exceptionNumber: 'EXC-2026-001',
      productId: 'prod-103',
      productName: 'Hydraulic Pump P-50',
      sku: 'HPP-50-S',
      sourceTransactionId: 'RPT-2026-003',
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      locationId: 'QNT-01',
      locationName: 'Quarantine Zone A',
      batchNumber: 'BATCH-2026-C',
      serialNumbers: [],
      quantity: 50,
      uom: 'units',
      exceptionType: 'Physical Damage',
      reason: 'Damage during internal transfer from production line.',
      status: 'Under Review',
      reportedDate: '2026-10-22T09:00:00Z',
      reportedBy: 'Bob Store',
      responsibleDepartment: 'Production',
      qcReferenceId: 'QC-REF-2026-005',
      evidenceUrl: null,
      dueDate: '2026-10-25T17:00:00Z',
      updatedAt: new Date().toISOString(),
    },
  ];
}

export async function createStockException(exception: Partial<StockException>): Promise<{ success: boolean; exceptionNumber: string }> {
  console.log('Creating stock exception:', exception);
  return { success: true, exceptionNumber: `EXC-2026-${Math.floor(Math.random() * 1000)}` };
}
