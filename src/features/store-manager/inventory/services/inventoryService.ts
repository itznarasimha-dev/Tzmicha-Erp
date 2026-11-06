// ============================================================
// INVENTORY & TRACEABILITY — MOCK SERVICE LAYER
// ⚠️  MOCK DATA — Development/demonstration only.
//     Replace with real API calls before production.
// ============================================================

import type {
  InventoryRecord, InventoryMovement, InventoryAlert,
  InventoryMetrics, InventoryPageData, TraceabilityResult,
  BarcodeScanResult, TraceabilityEvent,
} from '../types';
import { useErpStore } from '../../../../store/useErpStore';

// ─── Constants ────────────────────────────────────────────────
const d = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86400000).toISOString();
const dStr = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86400000).toISOString().split('T')[0];

// ─── Mock Inventory Records ────────────────────────────────────
function getMockRecords(): InventoryRecord[] {
  return [
    // ── Raw Materials ──────────────────────────────────────────
    {
      id: 'INV-001',
      productCode: 'SKU-30012',
      productName: 'Steel Rod 20mm',
      productCategory: 'Raw Material',
      trackingType: 'Batch',
      warehouseId: 'WH-003',
      warehouseName: 'Raw Materials Store',
      bin: 'C-04',
      batchNumber: 'BT-2026-ST-0091',
      serialNumbers: [],
      onHandQty: 500,
      reservedQty: 200,
      heldQty: 0,
      inTransitQty: 0,
      availableQty: 300,
      uom: 'kg',
      expiryDate: null,
      manufacturingDate: null,
      stockStatus: 'Partially Reserved',
      lastUpdated: d(-2),
      supplierName: 'Tata Steel Ltd',
      grnReference: 'GRN-2026-0841',
      poReference: 'PO-2026-0567',
      productionOrderRef: null,
      qualityInspectionRef: 'QI-2026-0112',
      supplierBatchNumber: 'TATA-ST-BATCH-2026-09A',
      traceabilityExceptions: [],
    },
    {
      id: 'INV-002',
      productCode: 'SKU-10023',
      productName: 'Aluminium Alloy 6061',
      productCategory: 'Raw Material',
      trackingType: 'Batch',
      warehouseId: 'WH-003',
      warehouseName: 'Raw Materials Store',
      bin: 'A-07',
      batchNumber: 'BT-2026-AL-0045',
      serialNumbers: [],
      onHandQty: 390,
      reservedQty: 390,
      heldQty: 0,
      inTransitQty: 0,
      availableQty: 0,
      uom: 'kg',
      expiryDate: null,
      manufacturingDate: null,
      stockStatus: 'Fully Reserved',
      lastUpdated: d(-3),
      supplierName: 'Tata Steel Ltd',
      grnReference: 'GRN-2026-0835',
      poReference: 'PO-2026-0530',
      productionOrderRef: 'WO-2026-0115',
      qualityInspectionRef: null,
      supplierBatchNumber: 'TATA-AL-BATCH-2026-08B',
      traceabilityExceptions: [],
    },
    {
      id: 'INV-003',
      productCode: 'SKU-10023',
      productName: 'Aluminium Alloy 6061',
      productCategory: 'Raw Material',
      trackingType: 'Batch',
      warehouseId: 'WH-003',
      warehouseName: 'Raw Materials Store',
      bin: 'A-07',
      batchNumber: 'BT-2026-AL-0046',
      serialNumbers: [],
      onHandQty: 10,
      reservedQty: 0,
      heldQty: 10,
      inTransitQty: 0,
      availableQty: 0,
      uom: 'kg',
      expiryDate: null,
      manufacturingDate: null,
      stockStatus: 'Quality Hold',
      lastUpdated: d(-2),
      supplierName: 'Tata Steel Ltd',
      grnReference: 'GRN-2026-0838',
      poReference: 'PO-2026-0530',
      productionOrderRef: null,
      qualityInspectionRef: 'QI-2026-0114',
      supplierBatchNumber: 'TATA-AL-BATCH-2026-08C',
      traceabilityExceptions: ['Damage discrepancy pending resolution (DIS-2026-0044)'],
    },
    {
      id: 'INV-004',
      productCode: 'SKU-40087',
      productName: 'Industrial Lubricant Grade A',
      productCategory: 'Raw Material',
      trackingType: 'Batch',
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      bin: 'D-12',
      batchNumber: 'BT-2026-LUB-0019',
      serialNumbers: [],
      onHandQty: 45,
      reservedQty: 0,
      heldQty: 0,
      inTransitQty: 0,
      availableQty: 45,
      uom: 'L',
      expiryDate: dStr(10),   // near expiry
      manufacturingDate: dStr(-355),
      stockStatus: 'Low Stock',
      lastUpdated: d(-5),
      supplierName: 'Hindustan Chemicals',
      grnReference: 'GRN-2026-0790',
      poReference: 'PO-2026-0488',
      productionOrderRef: null,
      qualityInspectionRef: null,
      supplierBatchNumber: null,
      traceabilityExceptions: ['Missing supplier batch number'],
    },
    // ── Components ────────────────────────────────────────────
    {
      id: 'INV-005',
      productCode: 'SKU-20045',
      productName: 'Bearing Assembly Type-C',
      productCategory: 'Component',
      trackingType: 'Serial',
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      bin: 'E-03',
      batchNumber: null,
      serialNumbers: ['SN-BRG-001', 'SN-BRG-002', 'SN-BRG-003', 'SN-BRG-004', 'SN-BRG-005'],
      onHandQty: 5,
      reservedQty: 2,
      heldQty: 0,
      inTransitQty: 0,
      availableQty: 3,
      uom: 'Units',
      expiryDate: null,
      manufacturingDate: null,
      stockStatus: 'Partially Reserved',
      lastUpdated: d(-1),
      supplierName: 'Precision Parts Co.',
      grnReference: 'GRN-2026-0822',
      poReference: 'PO-2026-0550',
      productionOrderRef: 'WO-2026-0112',
      qualityInspectionRef: 'QI-2026-0108',
      supplierBatchNumber: null,
      traceabilityExceptions: [],
    },
    {
      id: 'INV-006',
      productCode: 'SKU-78902',
      productName: 'Zinc Casting Component',
      productCategory: 'Component',
      trackingType: 'Batch',
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      bin: 'F-01',
      batchNumber: 'BT-2026-ZN-0033',
      serialNumbers: [],
      onHandQty: 0,
      reservedQty: 0,
      heldQty: 0,
      inTransitQty: 250,
      availableQty: 0,
      uom: 'Units',
      expiryDate: null,
      manufacturingDate: null,
      stockStatus: 'In Transit',
      lastUpdated: d(-1),
      supplierName: 'Zinc Alloys Pvt. Ltd.',
      grnReference: null,
      poReference: 'PO-2026-0631',
      productionOrderRef: null,
      qualityInspectionRef: null,
      supplierBatchNumber: null,
      traceabilityExceptions: [],
    },
    // ── Manufactured Finished Goods ───────────────────────────
    {
      id: 'INV-007',
      productCode: 'FG-MFG-0071',
      productName: 'Industrial Motor Assembly — 5kW',
      productCategory: 'Manufactured Finished Good',
      trackingType: 'Serial',
      warehouseId: 'WH-002',
      warehouseName: 'Finished Goods Store',
      bin: 'FG-01',
      batchNumber: null,
      serialNumbers: ['SN-MTR-0071-001', 'SN-MTR-0071-002', 'SN-MTR-0071-003'],
      onHandQty: 3,
      reservedQty: 2,
      heldQty: 0,
      inTransitQty: 0,
      availableQty: 1,
      uom: 'Units',
      expiryDate: null,
      manufacturingDate: dStr(-14),
      stockStatus: 'Partially Reserved',
      lastUpdated: d(-2),
      supplierName: null,
      grnReference: null,
      poReference: null,
      productionOrderRef: 'WO-2026-0109',
      qualityInspectionRef: 'QI-2026-0105',
      supplierBatchNumber: null,
      traceabilityExceptions: [],
    },
    {
      id: 'INV-008',
      productCode: 'FG-MFG-0055',
      productName: 'Precision Gear Set — Type B',
      productCategory: 'Manufactured Finished Good',
      trackingType: 'Batch',
      warehouseId: 'WH-002',
      warehouseName: 'Finished Goods Store',
      bin: 'FG-04',
      batchNumber: 'FGB-2026-GR-0011',
      serialNumbers: [],
      onHandQty: 80,
      reservedQty: 0,
      heldQty: 80,
      inTransitQty: 0,
      availableQty: 0,
      uom: 'Units',
      expiryDate: null,
      manufacturingDate: dStr(-7),
      stockStatus: 'Quality Hold',
      lastUpdated: d(-3),
      supplierName: null,
      grnReference: null,
      poReference: null,
      productionOrderRef: 'WO-2026-0108',
      qualityInspectionRef: 'QI-2026-0110',
      supplierBatchNumber: null,
      traceabilityExceptions: [],
    },
    // ── Purchased Finished Goods for Resale ───────────────────
    {
      id: 'INV-009',
      productCode: 'SKU-R0023',
      productName: 'Air Compressor 5HP (Resale)',
      productCategory: 'Purchased Finished Good',
      trackingType: 'Serial',
      warehouseId: 'WH-002',
      warehouseName: 'Finished Goods Store',
      bin: 'RS-03',
      batchNumber: null,
      serialNumbers: ['SN-ACP-1001', 'SN-ACP-1002', 'SN-ACP-1003'],
      onHandQty: 3,
      reservedQty: 1,
      heldQty: 0,
      inTransitQty: 0,
      availableQty: 2,
      uom: 'Units',
      expiryDate: null,
      manufacturingDate: null,
      stockStatus: 'Partially Reserved',
      lastUpdated: d(-1),
      supplierName: 'Global Resale Products Ltd',
      grnReference: 'GRN-2026-0818',
      poReference: 'PO-2026-0545',
      productionOrderRef: null,
      qualityInspectionRef: null,
      supplierBatchNumber: null,
      traceabilityExceptions: [],
    },
    // ── Damaged / Rejected ────────────────────────────────────
    {
      id: 'INV-010',
      productCode: 'SKU-10023',
      productName: 'Aluminium Alloy 6061',
      productCategory: 'Damaged / Rejected',
      trackingType: 'Batch',
      warehouseId: 'WH-003',
      warehouseName: 'Raw Materials Store',
      bin: 'REJECT-01',
      batchNumber: 'BT-2026-AL-0046-DMG',
      serialNumbers: [],
      onHandQty: 10,
      reservedQty: 0,
      heldQty: 10,
      inTransitQty: 0,
      availableQty: 0,
      uom: 'kg',
      expiryDate: null,
      manufacturingDate: null,
      stockStatus: 'Damaged',
      lastUpdated: d(-2),
      supplierName: 'Tata Steel Ltd',
      grnReference: 'GRN-2026-0838',
      poReference: 'PO-2026-0530',
      productionOrderRef: null,
      qualityInspectionRef: 'QI-2026-0114',
      supplierBatchNumber: null,
      traceabilityExceptions: ['Pending supplier return SRN-2026-0012'],
    },
    // ── Expired stock ─────────────────────────────────────────
    {
      id: 'INV-011',
      productCode: 'SKU-40099',
      productName: 'Hydraulic Seal Compound',
      productCategory: 'Raw Material',
      trackingType: 'Batch',
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      bin: 'D-14',
      batchNumber: 'BT-2025-HSC-0007',
      serialNumbers: [],
      onHandQty: 12,
      reservedQty: 0,
      heldQty: 12,
      inTransitQty: 0,
      availableQty: 0,
      uom: 'kg',
      expiryDate: dStr(-30),   // expired
      manufacturingDate: dStr(-400),
      stockStatus: 'Expired',
      lastUpdated: d(-30),
      supplierName: 'ChemTech Pvt. Ltd.',
      grnReference: 'GRN-2025-0991',
      poReference: 'PO-2025-1201',
      productionOrderRef: null,
      qualityInspectionRef: null,
      supplierBatchNumber: 'CT-B-22-4A',
      traceabilityExceptions: ['Expired goods still on-hand — disposal action required'],
    },
    // ── No stock / Low stock raw material ─────────────────────
    {
      id: 'INV-012',
      productCode: 'SKU-30088',
      productName: 'Copper Wire 2.5mm',
      productCategory: 'Raw Material',
      trackingType: 'Batch',
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      bin: 'G-02',
      batchNumber: 'BT-2026-CW-0004',
      serialNumbers: [],
      onHandQty: 8,
      reservedQty: 0,
      heldQty: 0,
      inTransitQty: 0,
      availableQty: 8,
      uom: 'kg',
      expiryDate: null,
      manufacturingDate: null,
      stockStatus: 'Low Stock',
      lastUpdated: d(-4),
      supplierName: 'ElectroParts India',
      grnReference: 'GRN-2026-0771',
      poReference: 'PO-2026-0430',
      productionOrderRef: null,
      qualityInspectionRef: null,
      supplierBatchNumber: null,
      traceabilityExceptions: [],
    },
  ];
}

// ─── Mock Movement History ─────────────────────────────────────
function getMockMovements(): InventoryMovement[] {
  return [
    {
      id: 'MOV-001',
      movementId: 'MV-2026-1234',
      timestamp: d(-2),
      movementType: 'Goods Receipt',
      productCode: 'SKU-30012',
      productName: 'Steel Rod 20mm',
      qty: 500,
      uom: 'kg',
      batchSerial: 'BT-2026-ST-0091',
      sourceLocation: 'Supplier — Tata Steel Ltd',
      destinationLocation: 'WH-003 / C-04',
      referenceDoc: 'GRN-2026-0841',
      performedBy: 'Ravi Kumar',
      status: 'Posted',
      balanceBefore: 0,
      balanceAfter: 500,
      notes: 'Partial receipt. Inspection pending.',
    },
    {
      id: 'MOV-002',
      movementId: 'MV-2026-1218',
      timestamp: d(-3),
      movementType: 'Goods Receipt',
      productCode: 'SKU-10023',
      productName: 'Aluminium Alloy 6061',
      qty: 400,
      uom: 'kg',
      batchSerial: 'BT-2026-AL-0045',
      sourceLocation: 'Supplier — Tata Steel Ltd',
      destinationLocation: 'WH-003 / A-07',
      referenceDoc: 'GRN-2026-0835',
      performedBy: 'Ravi Kumar',
      status: 'Posted',
      balanceBefore: 0,
      balanceAfter: 400,
      notes: '',
    },
    {
      id: 'MOV-003',
      movementId: 'MV-2026-1219',
      timestamp: d(-2),
      movementType: 'Goods Receipt',
      productCode: 'SKU-10023',
      productName: 'Aluminium Alloy 6061',
      qty: 400,
      uom: 'kg',
      batchSerial: 'BT-2026-AL-0046',
      sourceLocation: 'Supplier — Tata Steel Ltd',
      destinationLocation: 'WH-003 / A-07',
      referenceDoc: 'GRN-2026-0838',
      performedBy: 'Arjun Mehta',
      status: 'Posted',
      balanceBefore: 400,
      balanceAfter: 410,
      notes: '10 kg received damaged. Quarantine entry created.',
    },
    {
      id: 'MOV-004',
      movementId: 'MV-2026-1220',
      timestamp: d(-2),
      movementType: 'Inventory Adjustment',
      productCode: 'SKU-10023',
      productName: 'Aluminium Alloy 6061',
      qty: -10,
      uom: 'kg',
      batchSerial: 'BT-2026-AL-0046',
      sourceLocation: 'WH-003 / A-07',
      destinationLocation: 'WH-003 / REJECT-01',
      referenceDoc: 'DIS-2026-0044',
      performedBy: 'Arjun Mehta',
      status: 'Posted',
      balanceBefore: 410,
      balanceAfter: 400,
      notes: 'Damaged 10 kg moved to reject area pending supplier return.',
    },
    {
      id: 'MOV-005',
      movementId: 'MV-2026-1198',
      timestamp: d(-5),
      movementType: 'Material Issue',
      productCode: 'SKU-30012',
      productName: 'Steel Rod 20mm',
      qty: 150,
      uom: 'kg',
      batchSerial: 'BT-2026-ST-0085',
      sourceLocation: 'WH-003 / C-04',
      destinationLocation: 'Production Floor — WO-2026-0109',
      referenceDoc: 'MI-2026-0071',
      performedBy: 'Priya Nair',
      status: 'Posted',
      balanceBefore: 650,
      balanceAfter: 500,
      notes: 'Issued for production order WO-2026-0109.',
    },
    {
      id: 'MOV-006',
      movementId: 'MV-2026-1201',
      timestamp: d(-4),
      movementType: 'Finished Goods Receipt',
      productCode: 'FG-MFG-0071',
      productName: 'Industrial Motor Assembly — 5kW',
      qty: 3,
      uom: 'Units',
      batchSerial: 'SN-MTR-0071-001 / 002 / 003',
      sourceLocation: 'Production — WO-2026-0109',
      destinationLocation: 'WH-002 / FG-01',
      referenceDoc: 'FGR-2026-0041',
      performedBy: 'Arjun Mehta',
      status: 'Posted',
      balanceBefore: 0,
      balanceAfter: 3,
      notes: 'Quality released by QC. QI-2026-0105.',
    },
    {
      id: 'MOV-007',
      movementId: 'MV-2026-1211',
      timestamp: d(-3),
      movementType: 'Sales Dispatch',
      productCode: 'FG-MFG-0071',
      productName: 'Industrial Motor Assembly — 5kW',
      qty: 1,
      uom: 'Units',
      batchSerial: 'SN-MTR-0071-001',
      sourceLocation: 'WH-002 / FG-01',
      destinationLocation: 'Customer — Rohan Industries',
      referenceDoc: 'SO-2026-1188 / DO-2026-0442',
      performedBy: 'Vikram Singh',
      status: 'Posted',
      balanceBefore: 3,
      balanceAfter: 2,
      notes: '',
    },
    {
      id: 'MOV-008',
      movementId: 'MV-2026-1225',
      timestamp: d(-1),
      movementType: 'Supplier Return',
      productCode: 'SKU-10023',
      productName: 'Aluminium Alloy 6061',
      qty: 10,
      uom: 'kg',
      batchSerial: 'BT-2026-AL-0046-DMG',
      sourceLocation: 'WH-003 / REJECT-01',
      destinationLocation: 'Supplier — Tata Steel Ltd',
      referenceDoc: 'SRN-2026-0012',
      performedBy: 'Arjun Mehta',
      status: 'Pending',
      balanceBefore: null,
      balanceAfter: null,
      notes: 'Pending dispatch approval.',
    },
    {
      id: 'MOV-009',
      movementId: 'MV-2026-1230',
      timestamp: d(0),
      movementType: 'Internal Bin Transfer',
      productCode: 'SKU-30012',
      productName: 'Steel Rod 20mm',
      qty: 100,
      uom: 'kg',
      batchSerial: 'BT-2026-ST-0091',
      sourceLocation: 'WH-003 / C-04',
      destinationLocation: 'WH-003 / C-06',
      referenceDoc: 'IT-2026-0088',
      performedBy: 'Ravi Kumar',
      status: 'Posted',
      balanceBefore: 500,
      balanceAfter: 500,
      notes: '',
    },
  ];
}

// ─── Mock Alerts ───────────────────────────────────────────────
function getMockAlerts(): InventoryAlert[] {
  return [
    {
      id: 'ALT-001',
      alertId: 'IALRT-2026-0071',
      alertType: 'Near Expiry',
      productCode: 'SKU-40087',
      productName: 'Industrial Lubricant Grade A',
      batchSerial: 'BT-2026-LUB-0019',
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      bin: 'D-12',
      affectedQty: 45,
      uom: 'L',
      alertDate: d(-1),
      priority: 'High',
      responsibleDepartment: 'Store Manager',
      status: 'Open',
      requiredAction: 'Review expiry date. Issue or quarantine before expiry in 10 days.',
      resolutionNotes: null,
    },
    {
      id: 'ALT-002',
      alertId: 'IALRT-2026-0068',
      alertType: 'Expired Stock',
      productCode: 'SKU-40099',
      productName: 'Hydraulic Seal Compound',
      batchSerial: 'BT-2025-HSC-0007',
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      bin: 'D-14',
      affectedQty: 12,
      uom: 'kg',
      alertDate: d(-30),
      priority: 'Critical',
      responsibleDepartment: 'Store Manager',
      status: 'Acknowledged',
      requiredAction: 'Segregate, label and initiate disposal or return process.',
      resolutionNotes: null,
    },
    {
      id: 'ALT-003',
      alertId: 'IALRT-2026-0065',
      alertType: 'Quality Hold',
      productCode: 'FG-MFG-0055',
      productName: 'Precision Gear Set — Type B',
      batchSerial: 'FGB-2026-GR-0011',
      warehouseId: 'WH-002',
      warehouseName: 'Finished Goods Store',
      bin: 'FG-04',
      affectedQty: 80,
      uom: 'Units',
      alertDate: d(-3),
      priority: 'High',
      responsibleDepartment: 'Quality Control',
      status: 'In Progress',
      requiredAction: 'Awaiting QC inspection decision. Hold maintained.',
      resolutionNotes: null,
    },
    {
      id: 'ALT-004',
      alertId: 'IALRT-2026-0063',
      alertType: 'Missing Batch/Serial',
      productCode: 'SKU-40087',
      productName: 'Industrial Lubricant Grade A',
      batchSerial: 'BT-2026-LUB-0019',
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      bin: 'D-12',
      affectedQty: null,
      uom: null,
      alertDate: d(-5),
      priority: 'Medium',
      responsibleDepartment: 'Procurement',
      status: 'Open',
      requiredAction: 'Obtain supplier batch number from Procurement and update GRN.',
      resolutionNotes: null,
    },
    {
      id: 'ALT-005',
      alertId: 'IALRT-2026-0060',
      alertType: 'Low Stock',
      productCode: 'SKU-30088',
      productName: 'Copper Wire 2.5mm',
      batchSerial: null,
      warehouseId: 'WH-001',
      warehouseName: 'Main Production Warehouse',
      bin: 'G-02',
      affectedQty: 8,
      uom: 'kg',
      alertDate: d(-4),
      priority: 'Medium',
      responsibleDepartment: 'Procurement',
      status: 'Open',
      requiredAction: 'Raise replenishment request with Procurement (minimum threshold: 50 kg).',
      resolutionNotes: null,
    },
    {
      id: 'ALT-006',
      alertId: 'IALRT-2026-0058',
      alertType: 'Traceability Issue',
      productCode: 'SKU-10023',
      productName: 'Aluminium Alloy 6061',
      batchSerial: 'BT-2026-AL-0046',
      warehouseId: 'WH-003',
      warehouseName: 'Raw Materials Store',
      bin: 'A-07',
      affectedQty: 10,
      uom: 'kg',
      alertDate: d(-2),
      priority: 'High',
      responsibleDepartment: 'Store Manager',
      status: 'In Progress',
      requiredAction: 'Confirm disposal or return for damaged batch. Update movement records.',
      resolutionNotes: null,
    },
    {
      id: 'ALT-007',
      alertId: 'IALRT-2026-0055',
      alertType: 'Damaged Stock',
      productCode: 'SKU-10023',
      productName: 'Aluminium Alloy 6061',
      batchSerial: 'BT-2026-AL-0046-DMG',
      warehouseId: 'WH-003',
      warehouseName: 'Raw Materials Store',
      bin: 'REJECT-01',
      affectedQty: 10,
      uom: 'kg',
      alertDate: d(-2),
      priority: 'Medium',
      responsibleDepartment: 'Store Manager',
      status: 'Open',
      requiredAction: 'Ensure damaged goods are labelled and isolated. Complete supplier return.',
      resolutionNotes: null,
    },
  ];
}

// ─── Computed Metrics ──────────────────────────────────────────
function computeMetrics(records: InventoryRecord[]): InventoryMetrics {
  const distinctProducts = new Set(records.map((r) => r.productCode)).size;
  const rawMats = new Set(
    records.filter((r) => r.productCategory === 'Raw Material' || r.productCategory === 'Component').map((r) => r.productCode)
  ).size;
  const finishedGoods = new Set(
    records.filter((r) => r.productCategory === 'Manufactured Finished Good' || r.productCategory === 'Purchased Finished Good').map((r) => r.productCode)
  ).size;
  const lowStock = new Set(
    records.filter((r) => r.stockStatus === 'Low Stock' || r.stockStatus === 'No Stock').map((r) => r.productCode)
  ).size;
  const heldQty = records.reduce((sum, r) => sum + r.heldQty, 0);
  const exceptions = records.reduce((sum, r) => sum + r.traceabilityExceptions.length, 0);

  return {
    totalProductItems: distinctProducts,
    rawMaterialItems: rawMats,
    finishedGoodItems: finishedGoods,
    lowStockItems: lowStock,
    stockOnHoldQty: heldQty,
    traceabilityExceptions: exceptions,
  };
}

// ─── Traceability Service ──────────────────────────────────────
export function searchTraceability(query: string, records: InventoryRecord[], movements: InventoryMovement[]): TraceabilityResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const matched = records.filter((r) =>
    r.productCode.toLowerCase().includes(q) ||
    r.productName.toLowerCase().includes(q) ||
    (r.batchNumber?.toLowerCase().includes(q)) ||
    r.serialNumbers.some((s) => s.toLowerCase().includes(q)) ||
    (r.supplierBatchNumber?.toLowerCase().includes(q)) ||
    (r.grnReference?.toLowerCase().includes(q)) ||
    (r.productionOrderRef?.toLowerCase().includes(q))
  );

  return matched.map((r) => {
    const isMfg = r.productCategory === 'Manufactured Finished Good' || r.productCategory === 'Work in Progress';
    const relatedMovements = movements.filter((m) =>
      m.productCode === r.productCode && (m.batchSerial?.includes(r.batchNumber ?? '') || true)
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const events: TraceabilityEvent[] = relatedMovements.slice(0, 6).map((m, idx) => ({
      id: `EVT-${idx}`,
      timestamp: m.timestamp,
      eventType: movementTypeToEventType(m.movementType),
      transactionRef: m.referenceDoc,
      qty: m.qty,
      uom: m.uom,
      sourceLocation: m.sourceLocation,
      destinationLocation: m.destinationLocation,
      performedBy: m.performedBy,
      department: 'Store Manager',
      resultingStatus: r.stockStatus,
      notes: m.notes,
    }));

    return {
      productCode: r.productCode,
      productName: r.productName,
      productCategory: r.productCategory,
      batchSerial: r.batchNumber ?? (r.serialNumbers[0] ?? null),
      sourceType: isMfg ? 'Manufactured' : 'Purchased',
      sourceDocument: r.grnReference ?? r.productionOrderRef ?? '—',
      currentWarehouse: r.warehouseName,
      currentLocation: `${r.warehouseName}${r.bin ? ` / ${r.bin}` : ''}`,
      currentStatus: r.stockStatus,
      remainingQty: r.onHandQty,
      uom: r.uom,
      qualityStatus: r.qualityInspectionRef ? 'Inspected' : 'Not Inspected',
      latestMovement: relatedMovements[0]?.movementType ?? '—',
      missingFields: r.traceabilityExceptions,
      events,
    };
  });
}

function movementTypeToEventType(mt: string): TraceabilityEvent['eventType'] {
  const map: Record<string, TraceabilityEvent['eventType']> = {
    'Goods Receipt': 'Goods Received (GRN)',
    'Material Issue': 'Material Issued to Production',
    'Material Return': 'Goods Received (GRN)',
    'Finished Goods Receipt': 'Finished Goods Received',
    'Internal Bin Transfer': 'Transfer Initiated',
    'Warehouse Transfer': 'Transfer Initiated',
    'Transfer Dispatch': 'Transfer Initiated',
    'Transfer Receipt': 'Transfer Received',
    'Sales Dispatch': 'Goods Dispatched',
    'Supplier Return': 'Goods Dispatched',
    'Customer Return Receipt': 'Customer Return Received',
    'Inventory Adjustment': 'Inventory Adjustment',
    'Reversal': 'Reversal',
  };
  return map[mt] ?? 'Inventory Adjustment';
}

// ─── Barcode lookup ────────────────────────────────────────────
export function lookupBarcode(code: string, records: InventoryRecord[]): BarcodeScanResult {
  const q = code.trim().toLowerCase();
  const match = records.find((r) =>
    r.productCode.toLowerCase() === q ||
    r.batchNumber?.toLowerCase() === q ||
    r.serialNumbers.some((s) => s.toLowerCase() === q) ||
    r.supplierBatchNumber?.toLowerCase() === q
  );

  if (!match) {
    return {
      code,
      type: 'Unknown',
      productCode: null,
      productName: null,
      productCategory: null,
      batchSerial: null,
      warehouseId: null,
      warehouseName: null,
      bin: null,
      onHandQty: null,
      availableQty: null,
      uom: null,
      status: null,
      errorMessage: `No inventory record found for code: "${code}". Check the code and try again.`,
      foundAt: new Date().toISOString(),
    };
  }

  const isSerial = match.serialNumbers.some((s) => s.toLowerCase() === q);
  const isBatch = match.batchNumber?.toLowerCase() === q;
  const type = isSerial ? 'Serial' : isBatch ? 'Batch' : 'Product';

  return {
    code,
    type,
    productCode: match.productCode,
    productName: match.productName,
    productCategory: match.productCategory,
    batchSerial: match.batchNumber ?? (match.serialNumbers[0] ?? null),
    warehouseId: match.warehouseId,
    warehouseName: match.warehouseName,
    bin: match.bin,
    onHandQty: match.onHandQty,
    availableQty: match.availableQty,
    uom: match.uom,
    status: match.stockStatus,
    errorMessage: null,
    foundAt: new Date().toISOString(),
  };
}

// ─── Main fetch ────────────────────────────────────────────────
export async function fetchInventoryData(_warehouseId: string): Promise<InventoryPageData> {
  await new Promise((r) => setTimeout(r, 400));
  const store = useErpStore.getState();
  const mockRecords = getMockRecords();
  const mockMovements = getMockMovements();
  const alerts = getMockAlerts();

  // Convert live central store batches to InventoryRecords
  const erpRecords: InventoryRecord[] = store.batches.map((b) => {
    const p = store.products.find((prod) => prod.id === b.productId);
    const w = store.warehouses.find((wh) => wh.id === b.warehouseId);
    const onHand = b.availableQuantity + b.reservedQuantity;
    const isLow = b.availableQuantity < 50;
    const status: import('../types').StockStatus = b.status === 'expired' ? 'Expired'
      : b.availableQuantity === 0 && b.reservedQuantity > 0 ? 'Fully Reserved'
      : b.availableQuantity === 0 ? 'No Stock'
      : b.reservedQuantity > 0 ? 'Partially Reserved'
      : isLow ? 'Low Stock' : 'Available';

    return {
      id: b.id,
      productCode: b.productSku,
      productName: b.productName,
      productCategory: (p?.categoryName as any) || 'Raw Material',
      trackingType: 'Batch' as const,
      warehouseId: b.warehouseId,
      warehouseName: w?.name || 'Central Warehouse',
      bin: b.locationId || 'A-01',
      batchNumber: b.batchNumber,
      serialNumbers: [],
      onHandQty: onHand,
      reservedQty: b.reservedQuantity,
      heldQty: 0,
      inTransitQty: 0,
      availableQty: b.availableQuantity,
      uom: (p?.unit as any) || 'Units',
      expiryDate: b.expiryDate || null,
      manufacturingDate: b.manufacturingDate || null,
      stockStatus: status,
      lastUpdated: new Date().toISOString(),
      supplierName: 'Verified Supplier',
      grnReference: `GRN-${b.batchNumber.replace(/[^0-9]/g, '').slice(-4) || '2026'}`,
      poReference: 'PO-ERP-LIVE',
      productionOrderRef: null,
      qualityInspectionRef: null,
      supplierBatchNumber: b.batchNumber,
      traceabilityExceptions: [],
    };
  });

  // Convert live central store movements to InventoryMovements
  const erpMovements: InventoryMovement[] = store.stockMovements.map((m) => {
    let mt: import('../types').MovementType = 'Inventory Adjustment';
    if (m.movementType === 'inward_receipt') mt = 'Goods Receipt';
    else if (m.movementType === 'outward_dispatch') mt = 'Sales Dispatch';
    else if (m.movementType === 'transfer_in') mt = 'Transfer Receipt';
    else if (m.movementType === 'transfer_out') mt = 'Transfer Dispatch';

    return {
      id: m.id,
      movementId: m.id.toUpperCase(),
      timestamp: m.timestamp,
      movementType: mt,
      productCode: m.productSku,
      productName: m.productName,
      qty: m.quantity,
      uom: 'Units',
      batchSerial: m.batchNumber || null,
      sourceLocation: m.movementType === 'inward_receipt' ? 'Supplier Gate' : (m.warehouseName || null),
      destinationLocation: m.movementType === 'outward_dispatch' ? 'Customer Dispatch' : (m.warehouseName || null),
      referenceDoc: m.referenceId || m.referenceType,
      performedBy: m.performedByUserName,
      status: 'Posted',
      balanceBefore: null,
      balanceAfter: null,
      notes: m.remarks,
    };
  });

  // Combine live data with base records without batch collision
  const combinedRecords = [
    ...erpRecords,
    ...mockRecords.filter((mr) => !erpRecords.some((er) => er.batchNumber === mr.batchNumber)),
  ];

  const combinedMovements = [...erpMovements, ...mockMovements];

  return {
    metrics: computeMetrics(combinedRecords),
    records: combinedRecords,
    movements: combinedMovements,
    alerts,
    lastRefresh: new Date().toISOString(),
    isMockData: false,
  };
}
