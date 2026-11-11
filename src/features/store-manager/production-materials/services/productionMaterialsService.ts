// ============================================================
// PRODUCTION MATERIALS — MOCK SERVICE LAYER
// ⚠️  MOCK DATA — Development/demonstration only.
//     Replace with real API calls before production.
// ============================================================

import type {
  MaterialRequest,
  MaterialReturn,
  MaterialShortage,
  ProductionMaterialMetrics,
  ProductionMaterialPageData,
  MaterialIssueNote,
  ReturnLineItem,
  UnitOfMeasure,
} from '../types';

const d = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86400000).toISOString();
const dStr = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86400000).toISOString().split('T')[0];

// ─── Mock Requests ─────────────────────────────────────────────
function getMockRequests(): MaterialRequest[] {
  return [
    {
      id: '1',
      requestId: 'MR-2026-0121',
      productionOrderId: 'WO-2026-0115',
      finishedProduct: 'Industrial Motor Assembly — 5kW',
      finishedProductCode: 'FG-MFG-0071',
      bomReference: 'BOM-FG0071-REV3',
      bomRevision: 'Rev 3',
      plannedProductionQty: 10,
      productionQtyUom: 'Units',
      warehouseId: 'WH-003',
      warehouseName: 'Raw Materials Store',
      productionArea: 'Assembly Floor A',
      requiredDate: dStr(1),
      requestedBy: 'Suresh Rajan',
      requestedDepartment: 'Production',
      productionOrderStatus: 'Released',
      requestStatus: 'Approved',
      issueStatus: 'Not Started',
      priority: 'High',
      hasShortage: false,
      totalLines: 3,
      linesAwaitingIssue: 3,
      createdAt: d(-2),
      updatedAt: d(-1),
      approvedBy: 'Divya Menon',
      approvedAt: d(-1),
      notes: 'Priority run. Ensure all materials are staged before 08:00.',
      materialLines: [
        {
          lineId: 'ML-001',
          materialCode: 'SKU-30012',
          materialName: 'Steel Rod 20mm',
          materialCategory: 'Raw Material',
          requiredQty: 150,
          previouslyIssuedQty: 0,
          remainingQty: 150,
          eligibleAvailableQty: 300,
          shortageQty: 0,
          uom: 'kg',
          trackingType: 'Batch',
          suggestedWarehouseId: 'WH-003',
          suggestedWarehouseName: 'Raw Materials Store',
          suggestedBin: 'C-04',
          eligibleBatches: ['BT-2026-ST-0091'],
          eligibleSerials: [],
          issueStatus: 'Not Started',
          allowSubstitution: false,
          approvedSubstitutes: [],
        },
        {
          lineId: 'ML-002',
          materialCode: 'SKU-10023',
          materialName: 'Aluminium Alloy 6061',
          materialCategory: 'Raw Material',
          requiredQty: 80,
          previouslyIssuedQty: 0,
          remainingQty: 80,
          eligibleAvailableQty: 0,
          shortageQty: 80,
          uom: 'kg',
          trackingType: 'Batch',
          suggestedWarehouseId: 'WH-003',
          suggestedWarehouseName: 'Raw Materials Store',
          suggestedBin: 'A-07',
          eligibleBatches: [],
          eligibleSerials: [],
          issueStatus: 'Shortage',
          allowSubstitution: false,
          approvedSubstitutes: [],
        },
        {
          lineId: 'ML-003',
          materialCode: 'SKU-40087',
          materialName: 'Industrial Lubricant Grade A',
          materialCategory: 'Consumable',
          requiredQty: 10,
          previouslyIssuedQty: 0,
          remainingQty: 10,
          eligibleAvailableQty: 45,
          shortageQty: 0,
          uom: 'L',
          trackingType: 'Batch',
          suggestedWarehouseId: 'WH-001',
          suggestedWarehouseName: 'Main Production Warehouse',
          suggestedBin: 'D-12',
          eligibleBatches: ['BT-2026-LUB-0019'],
          eligibleSerials: [],
          issueStatus: 'Not Started',
          allowSubstitution: false,
          approvedSubstitutes: [],
        },
      ],
    },
    {
      id: '2',
      requestId: 'MR-2026-0119',
      productionOrderId: 'WO-2026-0114',
      finishedProduct: 'Precision Gear Set — Type B',
      finishedProductCode: 'FG-MFG-0055',
      bomReference: 'BOM-FG0055-REV2',
      bomRevision: 'Rev 2',
      plannedProductionQty: 50,
      productionQtyUom: 'Units',
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      productionArea: 'Machining Floor B',
      requiredDate: dStr(0),
      requestedBy: 'Anil Sharma',
      requestedDepartment: 'Production',
      productionOrderStatus: 'In Progress',
      requestStatus: 'Partially Issued',
      issueStatus: 'Partial',
      priority: 'Critical',
      hasShortage: true,
      totalLines: 2,
      linesAwaitingIssue: 1,
      createdAt: d(-4),
      updatedAt: d(-1),
      approvedBy: 'Divya Menon',
      approvedAt: d(-4),
      notes: '',
      materialLines: [
        {
          lineId: 'ML-004',
          materialCode: 'SKU-20045',
          materialName: 'Bearing Assembly Type-C',
          materialCategory: 'Component',
          requiredQty: 20,
          previouslyIssuedQty: 10,
          remainingQty: 10,
          eligibleAvailableQty: 3,
          shortageQty: 7,
          uom: 'Units',
          trackingType: 'Serial',
          suggestedWarehouseId: 'WH-001',
          suggestedWarehouseName: 'Main Production Warehouse',
          suggestedBin: 'E-03',
          eligibleBatches: [],
          eligibleSerials: ['SN-BRG-003', 'SN-BRG-004', 'SN-BRG-005'],
          issueStatus: 'Shortage',
          allowSubstitution: false,
          approvedSubstitutes: [],
        },
        {
          lineId: 'ML-005',
          materialCode: 'SKU-78902',
          materialName: 'Zinc Casting Component',
          materialCategory: 'Component',
          requiredQty: 100,
          previouslyIssuedQty: 100,
          remainingQty: 0,
          eligibleAvailableQty: 0,
          shortageQty: 0,
          uom: 'Units',
          trackingType: 'Batch',
          suggestedWarehouseId: 'WH-001',
          suggestedWarehouseName: 'Main Production Warehouse',
          suggestedBin: 'F-01',
          eligibleBatches: ['BT-2026-ZN-0033'],
          eligibleSerials: [],
          issueStatus: 'Complete',
          allowSubstitution: false,
          approvedSubstitutes: [],
        },
      ],
    },
    {
      id: '3',
      requestId: 'MR-2026-0117',
      productionOrderId: 'WO-2026-0112',
      finishedProduct: 'Hydraulic Cylinder Assembly',
      finishedProductCode: 'FG-MFG-0049',
      bomReference: 'BOM-FG0049-REV1',
      bomRevision: 'Rev 1',
      plannedProductionQty: 25,
      productionQtyUom: 'Units',
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      productionArea: 'Assembly Floor B',
      requiredDate: dStr(-1),
      requestedBy: 'Kavitha Reddy',
      requestedDepartment: 'Production',
      productionOrderStatus: 'On Hold',
      requestStatus: 'Blocked',
      issueStatus: 'Blocked',
      priority: 'High',
      hasShortage: false,
      totalLines: 1,
      linesAwaitingIssue: 1,
      createdAt: d(-6),
      updatedAt: d(-2),
      approvedBy: 'Divya Menon',
      approvedAt: d(-6),
      notes: 'Blocked pending QC release of batch BT-2026-AL-0046.',
      materialLines: [
        {
          lineId: 'ML-006',
          materialCode: 'SKU-40099',
          materialName: 'Hydraulic Seal Compound',
          materialCategory: 'Raw Material',
          requiredQty: 5,
          previouslyIssuedQty: 0,
          remainingQty: 5,
          eligibleAvailableQty: 0,
          shortageQty: 5,
          uom: 'kg',
          trackingType: 'Batch',
          suggestedWarehouseId: 'WH-001',
          suggestedWarehouseName: 'Main Production Warehouse',
          suggestedBin: 'D-14',
          eligibleBatches: [],
          eligibleSerials: [],
          issueStatus: 'Blocked',
          allowSubstitution: false,
          approvedSubstitutes: [],
        },
      ],
    },
    {
      id: '4',
      requestId: 'MR-2026-0110',
      productionOrderId: 'WO-2026-0109',
      finishedProduct: 'Industrial Motor Assembly — 5kW',
      finishedProductCode: 'FG-MFG-0071',
      bomReference: 'BOM-FG0071-REV3',
      bomRevision: 'Rev 3',
      plannedProductionQty: 5,
      productionQtyUom: 'Units',
      warehouseId: 'WH-003',
      warehouseName: 'Raw Materials Store',
      productionArea: 'Assembly Floor A',
      requiredDate: dStr(-5),
      requestedBy: 'Suresh Rajan',
      requestedDepartment: 'Production',
      productionOrderStatus: 'Completed',
      requestStatus: 'Issued',
      issueStatus: 'Complete',
      priority: 'Medium',
      hasShortage: false,
      totalLines: 2,
      linesAwaitingIssue: 0,
      createdAt: d(-8),
      updatedAt: d(-5),
      approvedBy: 'Divya Menon',
      approvedAt: d(-8),
      notes: 'Completed successfully.',
      materialLines: [
        {
          lineId: 'ML-007',
          materialCode: 'SKU-30012',
          materialName: 'Steel Rod 20mm',
          materialCategory: 'Raw Material',
          requiredQty: 75,
          previouslyIssuedQty: 75,
          remainingQty: 0,
          eligibleAvailableQty: 300,
          shortageQty: 0,
          uom: 'kg',
          trackingType: 'Batch',
          suggestedWarehouseId: 'WH-003',
          suggestedWarehouseName: 'Raw Materials Store',
          suggestedBin: 'C-04',
          eligibleBatches: ['BT-2026-ST-0085'],
          eligibleSerials: [],
          issueStatus: 'Complete',
          allowSubstitution: false,
          approvedSubstitutes: [],
        },
        {
          lineId: 'ML-008',
          materialCode: 'SKU-40087',
          materialName: 'Industrial Lubricant Grade A',
          materialCategory: 'Consumable',
          requiredQty: 5,
          previouslyIssuedQty: 5,
          remainingQty: 0,
          eligibleAvailableQty: 45,
          shortageQty: 0,
          uom: 'L',
          trackingType: 'Batch',
          suggestedWarehouseId: 'WH-001',
          suggestedWarehouseName: 'Main Production Warehouse',
          suggestedBin: 'D-12',
          eligibleBatches: ['BT-2026-LUB-0019'],
          eligibleSerials: [],
          issueStatus: 'Complete',
          allowSubstitution: false,
          approvedSubstitutes: [],
        },
      ],
    },
  ];
}

// ─── Mock Returns ──────────────────────────────────────────────
function getMockReturns(): MaterialReturn[] {
  return [
    {
      id: '1',
      returnId: 'MRN-2026-0031',
      originalIssueNoteId: 'MI-2026-0071',
      productionOrderId: 'WO-2026-0109',
      productionArea: 'Assembly Floor A',
      returningEmployee: 'Suresh Rajan',
      receivingWarehouseId: 'WH-003',
      receivingWarehouseName: 'Raw Materials Store',
      returnDate: dStr(-3),
      returnStatus: 'Awaiting Warehouse Check',
      inspectionStatus: 'Pending',
      remarks: 'Unused lubricant returned from production run.',
      createdAt: d(-3),
      updatedAt: d(-3),
      lines: [
        {
          lineId: 'RL-001',
          originalIssueLineId: 'ML-008',
          materialCode: 'SKU-40087',
          materialName: 'Industrial Lubricant Grade A',
          originalBatch: 'BT-2026-LUB-0019',
          originalSerials: [],
          qtyOriginallyIssued: 5,
          qtyPreviouslyReturned: 0,
          qtyEligibleToReturn: 5,
          qtyReturning: 2,
          uom: 'L',
          condition: 'Good',
          destinationBin: 'D-12',
          inspectionRequired: false,
          remarks: '2L unused, 3L consumed.',
        },
      ],
    },
    {
      id: '2',
      returnId: 'MRN-2026-0029',
      originalIssueNoteId: 'MI-2026-0068',
      productionOrderId: 'WO-2026-0108',
      productionArea: 'Machining Floor B',
      returningEmployee: 'Anil Sharma',
      receivingWarehouseId: 'WH-001',
      receivingWarehouseName: 'Main Production Warehouse',
      returnDate: dStr(-5),
      returnStatus: 'Held',
      inspectionStatus: 'In Progress',
      remarks: 'Bearings returned with minor damage report.',
      createdAt: d(-5),
      updatedAt: d(-4),
      lines: [
        {
          lineId: 'RL-002',
          originalIssueLineId: 'ML-004',
          materialCode: 'SKU-20045',
          materialName: 'Bearing Assembly Type-C',
          originalBatch: null,
          originalSerials: ['SN-BRG-001', 'SN-BRG-002'],
          qtyOriginallyIssued: 10,
          qtyPreviouslyReturned: 0,
          qtyEligibleToReturn: 10,
          qtyReturning: 2,
          uom: 'Units',
          condition: 'Minor Damage',
          destinationBin: null,
          inspectionRequired: true,
          remarks: 'SN-BRG-001 shows surface scoring. Pending QC decision.',
        },
      ],
    },
  ];
}

// ─── Mock Shortages ────────────────────────────────────────────
function getMockShortages(): MaterialShortage[] {
  return [
    {
      id: '1',
      shortageId: 'SHT-2026-0041',
      productionOrderId: 'WO-2026-0115',
      materialRequestId: 'MR-2026-0121',
      materialCode: 'SKU-10023',
      materialName: 'Aluminium Alloy 6061',
      materialCategory: 'Raw Material',
      requiredQty: 80,
      previouslyIssuedQty: 0,
      remainingRequiredQty: 80,
      eligibleAvailableQty: 0,
      shortageQty: 80,
      uom: 'kg',
      requiredDate: dStr(1),
      warehouseId: 'WH-003',
      warehouseName: 'Raw Materials Store',
      responsibleDepartment: 'Procurement',
      priority: 'High',
      status: 'Waiting for Supplier',
      pendingReceipts: ['GRN-2026-0855 (Expected: ' + dStr(3) + ')'],
      relatedPurchaseOrders: ['PO-2026-0640'],
      notes: 'Full batch fully reserved for WO-2026-0115; new PO raised. Supplier confirmed delivery by ' + dStr(3) + '.',
      createdAt: d(-1),
      updatedAt: d(0),
    },
    {
      id: '2',
      shortageId: 'SHT-2026-0039',
      productionOrderId: 'WO-2026-0114',
      materialRequestId: 'MR-2026-0119',
      materialCode: 'SKU-20045',
      materialName: 'Bearing Assembly Type-C',
      materialCategory: 'Component',
      requiredQty: 20,
      previouslyIssuedQty: 10,
      remainingRequiredQty: 10,
      eligibleAvailableQty: 3,
      shortageQty: 7,
      uom: 'Units',
      requiredDate: dStr(0),
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      responsibleDepartment: 'Procurement',
      priority: 'Critical',
      status: 'Waiting for Procurement',
      pendingReceipts: [],
      relatedPurchaseOrders: ['PO-2026-0615'],
      notes: 'Only 3 eligible units in stock. 7 units short. Procurement notified.',
      createdAt: d(-2),
      updatedAt: d(-1),
    },
    {
      id: '3',
      shortageId: 'SHT-2026-0037',
      productionOrderId: 'WO-2026-0112',
      materialRequestId: 'MR-2026-0117',
      materialCode: 'SKU-40099',
      materialName: 'Hydraulic Seal Compound',
      materialCategory: 'Raw Material',
      requiredQty: 5,
      previouslyIssuedQty: 0,
      remainingRequiredQty: 5,
      eligibleAvailableQty: 0,
      shortageQty: 5,
      uom: 'kg',
      requiredDate: dStr(-1),
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      responsibleDepartment: 'Quality Control',
      priority: 'High',
      status: 'Waiting for Quality Control',
      pendingReceipts: [],
      relatedPurchaseOrders: [],
      notes: 'All stock expired (BT-2025-HSC-0007). QC must authorize disposal. Production is blocked.',
      createdAt: d(-5),
      updatedAt: d(-2),
    },
  ];
}

// ─── Metrics ───────────────────────────────────────────────────
function computeMetrics(
  requests: MaterialRequest[],
  returns: MaterialReturn[],
  shortages: MaterialShortage[],
): ProductionMaterialMetrics {
  const now = new Date();
  return {
    pendingRequests: requests.filter(
      r => ['Approved', 'Partially Issued'].includes(r.requestStatus)
    ).length,
    partiallyIssued: requests.filter(r => r.requestStatus === 'Partially Issued').length,
    materialShortages: shortages.filter(s => !['Resolved', 'Cancelled'].includes(s.status)).length,
    awaitingIssue: requests.filter(
      r => r.requestStatus === 'Approved' && r.issueStatus === 'Not Started'
    ).length,
    returnsPending: returns.filter(
      r => ['Submitted', 'Awaiting Warehouse Check', 'Awaiting Inspection'].includes(r.returnStatus)
    ).length,
    overdueRequests: requests.filter(
      r => ['Approved', 'Partially Issued'].includes(r.requestStatus) && new Date(r.requiredDate) < now
    ).length,
  };
}

// ─── Simulated network delay ───────────────────────────────────
const delay = (ms = 400) => new Promise<void>(res => setTimeout(res, ms));

// ─── Public API ────────────────────────────────────────────────
export async function fetchProductionMaterialData(
  _warehouseId: string,
): Promise<ProductionMaterialPageData> {
  await delay();
  const requests = getMockRequests();
  const returns = getMockReturns();
  const shortages = getMockShortages();
  return {
    metrics: computeMetrics(requests, returns, shortages),
    requests,
    returns,
    shortages,
    lastRefresh: new Date().toISOString(),
    isMockData: true,
  };
}

export async function fetchIssueNoteDetails(issueNoteId: string): Promise<{
  issueNote: MaterialIssueNote;
  eligibleReturns: ReturnLineItem[];
}> {
  await delay(400);
  // Mock lookup: finding a note or generating one based on the ID
  const issueNote: MaterialIssueNote = {
    id: 'in-1',
    issueNoteId: issueNoteId,
    materialRequestId: 'MR-2026-0119',
    productionOrderId: 'WO-2026-0114',
    warehouseId: 'WH-001',
    warehouseName: 'Main Production Warehouse',
    destinationProductionArea: 'Machining Floor B',
    issuedBy: 'Kavitha Reddy',
    receivedBy: 'Anil Sharma',
    issueDate: d(-5),
    status: 'Confirmed',
    remarks: 'Standard issue for Gear Set assembly',
    createdAt: d(-5),
    lines: [
      {
        lineId: 'il-1',
        materialCode: 'SKU-20045',
        materialName: 'Bearing Assembly Type-C',
        bomLineId: 'ML-004',
        warehouseId: 'WH-001',
        warehouseName: 'Main Production Warehouse',
        bin: 'E-03',
        batchSerial: null,
        qtyIssued: 10,
        uom: 'Units',
        trackingType: 'Serial',
        serialNumbers: ['SN-BRG-001', 'SN-BRG-002', 'SN-BRG-003'],
      },
    ],
  };

  // Calculate eligible returns (in real app, this subtracts previous returns)
  const eligibleReturns: ReturnLineItem[] = issueNote.lines.map((l) => ({
    lineId: `rl-${l.lineId}`,
    originalIssueLineId: l.lineId,
    materialCode: l.materialCode,
    materialName: l.materialName,
    originalBatch: l.batchSerial,
    originalSerials: l.serialNumbers,
    qtyOriginallyIssued: l.qtyIssued,
    qtyPreviouslyReturned: 0,
    qtyEligibleToReturn: l.qtyIssued,
    qtyReturning: 0,
    uom: l.uom as UnitOfMeasure,
    condition: 'Good',
    destinationBin: null,
    inspectionRequired: true,
    remarks: '',
  }));

  return { issueNote, eligibleReturns };
}

export async function submitMaterialIssue(payload: {

  materialRequestId: string;
  productionOrderId: string;
  lines: { bomLineId: string; qty: number; batch: string; bin: string }[];
  receivedBy: string;
  remarks: string;
}): Promise<{ issueNoteId: string }> {
  await delay(600);
  // Simulate validation — in production this hits the inventory service
  const issueNoteId = `MI-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  console.log('[MOCK] Material Issue posted:', payload, '→', issueNoteId);
  return { issueNoteId };
}

export async function submitMaterialReturn(payload: {
  originalIssueNoteId: string;
  productionOrderId: string;
  lines: { lineId: string; qty: number; condition: string }[];
  remarks: string;
}): Promise<{ returnNoteId: string }> {
  await delay(600);
  const returnNoteId = `MRN-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  console.log('[MOCK] Material Return posted:', payload, '→', returnNoteId);
  return { returnNoteId };
}

export async function addShortageNote(shortageId: string, note: string): Promise<void> {
  await delay(300);
  console.log('[MOCK] Shortage note added:', shortageId, note);
}
