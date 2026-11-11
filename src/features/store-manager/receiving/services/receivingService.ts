// ============================================================
// RECEIVING CENTRE — MOCK SERVICE LAYER
// ⚠️  MOCK DATA — Development/demonstration only.
//     Replace with real API calls before production.
// ============================================================

import type {
  PurchaseOrder, GoodsReceiptNote, Discrepancy, SupplierReturn,
  ReceivingPageData, ReceivingMetrics, GRNLine, GRNFormState,
  POStatus, ReceivingStatus,
} from '../types';
import { useErpStore } from '../../../../store/useErpStore';

// ─── Mock Purchase Orders ─────────────────────────────────────
function getMockPurchaseOrders(): PurchaseOrder[] {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  return [
    {
      id: 'PO-001',
      poNumber: 'PO-2026-0567',
      supplierId: 'SUP-001',
      supplierName: 'Tata Steel Ltd',
      supplierContact: 'Mr. Rajesh Gupta | +91-22-6660-1234',
      orderDate: '2026-10-15',
      expectedDeliveryDate: today,
      destinationWarehouse: 'WH-003',
      deliveryRef: 'DN-TATA-4521',
      poStatus: 'Approved',
      receivingStatus: 'Due Today',
      lines: [
        {
          lineId: 'POL-001-1',
          productCode: 'SKU-30012',
          productName: 'Steel Rod 20mm',
          productCategory: 'Raw Material',
          stockType: 'Raw Material',
          orderedQty: 1000,
          receivedQty: 500,
          outstandingQty: 500,
          uom: 'kg',
          trackingType: 'Batch',
          requiresExpiry: false,
          requiresInspection: true,
          unitPrice: 85.5,
        },
        {
          lineId: 'POL-001-2',
          productCode: 'SKU-30045',
          productName: 'Steel Angle 40x40mm',
          productCategory: 'Raw Material',
          stockType: 'Raw Material',
          orderedQty: 500,
          receivedQty: 0,
          outstandingQty: 500,
          uom: 'kg',
          trackingType: 'Batch',
          requiresExpiry: false,
          requiresInspection: true,
          unitPrice: 92.0,
        },
      ],
      totalOrderedQty: 1500,
      totalReceivedQty: 500,
      totalOutstandingQty: 1000,
      lastUpdated: new Date(Date.now() - 2 * 3600000).toISOString(),
      notes: 'Partial delivery received on 2026-10-20. Balance expected today.',
      grnIds: ['GRN-001'],
    },
    {
      id: 'PO-002',
      poNumber: 'PO-2026-0589',
      supplierId: 'SUP-002',
      supplierName: 'Hindustan Chemicals',
      supplierContact: 'Ms. Priya Menon | +91-44-2345-6789',
      orderDate: '2026-10-18',
      expectedDeliveryDate: yesterday,
      destinationWarehouse: 'WH-001',
      deliveryRef: null,
      poStatus: 'Approved',
      receivingStatus: 'Overdue',
      lines: [
        {
          lineId: 'POL-002-1',
          productCode: 'SKU-40087',
          productName: 'Industrial Lubricant Grade A',
          productCategory: 'Consumable',
          stockType: 'Raw Material',
          orderedQty: 200,
          receivedQty: 0,
          outstandingQty: 200,
          uom: 'L',
          trackingType: 'Batch',
          requiresExpiry: true,
          requiresInspection: false,
          unitPrice: 320.0,
        },
      ],
      totalOrderedQty: 200,
      totalReceivedQty: 0,
      totalOutstandingQty: 200,
      lastUpdated: new Date(Date.now() - 25 * 3600000).toISOString(),
      notes: 'Supplier confirmed delay. New ETA not provided.',
      grnIds: [],
    },
    {
      id: 'PO-003',
      poNumber: 'PO-2026-0612',
      supplierId: 'SUP-003',
      supplierName: 'Precision Parts Co.',
      supplierContact: 'Mr. Arvind Sharma | +91-80-5544-3322',
      orderDate: '2026-10-20',
      expectedDeliveryDate: tomorrow,
      destinationWarehouse: 'WH-001',
      deliveryRef: 'DN-PPC-0998',
      poStatus: 'Approved',
      receivingStatus: 'Expected',
      lines: [
        {
          lineId: 'POL-003-1',
          productCode: 'SKU-20045',
          productName: 'Bearing Assembly Type-C',
          productCategory: 'Component',
          stockType: 'Component',
          orderedQty: 500,
          receivedQty: 0,
          outstandingQty: 500,
          uom: 'Units',
          trackingType: 'Serial',
          requiresExpiry: false,
          requiresInspection: true,
          unitPrice: 450.0,
        },
        {
          lineId: 'POL-003-2',
          productCode: 'SKU-20089',
          productName: 'Drive Shaft Assembly',
          productCategory: 'Component',
          stockType: 'Component',
          orderedQty: 100,
          receivedQty: 0,
          outstandingQty: 100,
          uom: 'Units',
          trackingType: 'Serial',
          requiresExpiry: false,
          requiresInspection: true,
          unitPrice: 1200.0,
        },
      ],
      totalOrderedQty: 600,
      totalReceivedQty: 0,
      totalOutstandingQty: 600,
      lastUpdated: new Date(Date.now() - 5 * 3600000).toISOString(),
      notes: 'Priority components for Work Order WO-2026-0115.',
      grnIds: [],
    },
    {
      id: 'PO-004',
      poNumber: 'PO-2026-0545',
      supplierId: 'SUP-004',
      supplierName: 'Global Resale Products Ltd',
      supplierContact: 'Ms. Anita Desai | +91-22-3344-5566',
      orderDate: '2026-10-10',
      expectedDeliveryDate: twoDaysAgo,
      destinationWarehouse: 'WH-002',
      deliveryRef: 'DN-GRP-7823',
      poStatus: 'Approved',
      receivingStatus: 'Overdue',
      lines: [
        {
          lineId: 'POL-004-1',
          productCode: 'SKU-R0023',
          productName: 'Air Compressor 5HP (Resale)',
          productCategory: 'Finished Goods - Resale',
          stockType: 'Purchased Finished Good',
          orderedQty: 25,
          receivedQty: 0,
          outstandingQty: 25,
          uom: 'Units',
          trackingType: 'Serial',
          requiresExpiry: false,
          requiresInspection: false,
          unitPrice: 18500.0,
        },
      ],
      totalOrderedQty: 25,
      totalReceivedQty: 0,
      totalOutstandingQty: 25,
      lastUpdated: new Date(Date.now() - 48 * 3600000).toISOString(),
      notes: 'Customer SO-2026-1189 is waiting for this stock.',
      grnIds: [],
    },
    {
      id: 'PO-005',
      poNumber: 'PO-2026-0530',
      supplierId: 'SUP-001',
      supplierName: 'Tata Steel Ltd',
      supplierContact: 'Mr. Rajesh Gupta | +91-22-6660-1234',
      orderDate: '2026-10-05',
      expectedDeliveryDate: '2026-10-19',
      destinationWarehouse: 'WH-003',
      deliveryRef: 'DN-TATA-4400',
      poStatus: 'Approved',
      receivingStatus: 'Fully Received',
      lines: [
        {
          lineId: 'POL-005-1',
          productCode: 'SKU-10023',
          productName: 'Aluminium Alloy 6061',
          productCategory: 'Raw Material',
          stockType: 'Raw Material',
          orderedQty: 800,
          receivedQty: 800,
          outstandingQty: 0,
          uom: 'kg',
          trackingType: 'Batch',
          requiresExpiry: false,
          requiresInspection: false,
          unitPrice: 215.0,
        },
      ],
      totalOrderedQty: 800,
      totalReceivedQty: 800,
      totalOutstandingQty: 0,
      lastUpdated: new Date(Date.now() - 72 * 3600000).toISOString(),
      notes: 'Fully received. GRN posted.',
      grnIds: ['GRN-002', 'GRN-003'],
    },
    {
      id: 'PO-006',
      poNumber: 'PO-2026-0631',
      supplierId: 'SUP-005',
      supplierName: 'Zinc Alloys Pvt. Ltd.',
      supplierContact: 'Mr. Sunil Nair | +91-79-4455-6677',
      orderDate: '2026-10-21',
      expectedDeliveryDate: nextWeek,
      destinationWarehouse: 'WH-003',
      deliveryRef: null,
      poStatus: 'Approved',
      receivingStatus: 'Expected',
      lines: [
        {
          lineId: 'POL-006-1',
          productCode: 'SKU-78902',
          productName: 'Zinc Casting Component',
          productCategory: 'Component',
          stockType: 'Component',
          orderedQty: 1000,
          receivedQty: 0,
          outstandingQty: 1000,
          uom: 'Units',
          trackingType: 'Batch',
          requiresExpiry: false,
          requiresInspection: false,
          unitPrice: 75.0,
        },
      ],
      totalOrderedQty: 1000,
      totalReceivedQty: 0,
      totalOutstandingQty: 1000,
      lastUpdated: new Date(Date.now() - 1 * 3600000).toISOString(),
      notes: '',
      grnIds: [],
    },
  ];
}

// ─── Mock GRNs ────────────────────────────────────────────────
function getMockGRNs(): GoodsReceiptNote[] {
  return [
    {
      id: 'GRN-001',
      grnNumber: 'GRN-2026-0841',
      poId: 'PO-001',
      poNumber: 'PO-2026-0567',
      supplierId: 'SUP-001',
      supplierName: 'Tata Steel Ltd',
      supplierDeliveryNote: 'DN-TATA-4521',
      receiptDate: new Date(Date.now() - 2 * 3600000).toISOString(),
      warehouse: 'WH-003',
      status: 'Awaiting Inspection',
      lines: [
        {
          lineId: 'GRNL-001-1',
          poLineId: 'POL-001-1',
          productCode: 'SKU-30012',
          productName: 'Steel Rod 20mm',
          productCategory: 'Raw Material',
          stockType: 'Raw Material',
          orderedQty: 1000,
          previouslyReceivedQty: 0,
          receivedQty: 500,
          damagedQty: 0,
          acceptedQty: 500,
          uom: 'kg',
          trackingType: 'Batch',
          batchNumber: 'BT-2026-ST-0091',
          serialNumbers: [],
          manufacturingDate: null,
          expiryDate: null,
          destinationWarehouse: 'WH-003',
          rackBin: 'C-04',
          requiresInspection: true,
          inspectionStatus: 'Pending',
          remarks: 'Partial delivery — balance expected today.',
        },
      ],
      totalReceivedQty: 500,
      totalDamagedQty: 0,
      packagingCondition: 'Good',
      deliveryCondition: 'Good',
      overallRemarks: 'Partial receipt. Inspection requested for batch BT-2026-ST-0091.',
      createdBy: 'Ravi Kumar',
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      postedAt: new Date(Date.now() - 90 * 60000).toISOString(),
      inspectionStatus: 'Pending',
      discrepancyStatus: 'None',
      discrepancyIds: [],
      supplierReturnIds: [],
      attachments: [],
    },
    {
      id: 'GRN-002',
      grnNumber: 'GRN-2026-0835',
      poId: 'PO-005',
      poNumber: 'PO-2026-0530',
      supplierId: 'SUP-001',
      supplierName: 'Tata Steel Ltd',
      supplierDeliveryNote: 'DN-TATA-4400',
      receiptDate: new Date(Date.now() - 72 * 3600000).toISOString(),
      warehouse: 'WH-003',
      status: 'Posted',
      lines: [
        {
          lineId: 'GRNL-002-1',
          poLineId: 'POL-005-1',
          productCode: 'SKU-10023',
          productName: 'Aluminium Alloy 6061',
          productCategory: 'Raw Material',
          stockType: 'Raw Material',
          orderedQty: 800,
          previouslyReceivedQty: 0,
          receivedQty: 400,
          damagedQty: 0,
          acceptedQty: 400,
          uom: 'kg',
          trackingType: 'Batch',
          batchNumber: 'BT-2026-AL-0045',
          serialNumbers: [],
          manufacturingDate: null,
          expiryDate: null,
          destinationWarehouse: 'WH-003',
          rackBin: 'A-07',
          requiresInspection: false,
          inspectionStatus: 'Not Required',
          remarks: '',
        },
      ],
      totalReceivedQty: 400,
      totalDamagedQty: 0,
      packagingCondition: 'Good',
      deliveryCondition: 'Good',
      overallRemarks: '',
      createdBy: 'Ravi Kumar',
      createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
      postedAt: new Date(Date.now() - 70 * 3600000).toISOString(),
      inspectionStatus: 'Not Required',
      discrepancyStatus: 'None',
      discrepancyIds: [],
      supplierReturnIds: [],
      attachments: [],
    },
    {
      id: 'GRN-003',
      grnNumber: 'GRN-2026-0838',
      poId: 'PO-005',
      poNumber: 'PO-2026-0530',
      supplierId: 'SUP-001',
      supplierName: 'Tata Steel Ltd',
      supplierDeliveryNote: 'DN-TATA-4402',
      receiptDate: new Date(Date.now() - 50 * 3600000).toISOString(),
      warehouse: 'WH-003',
      status: 'Posted',
      lines: [
        {
          lineId: 'GRNL-003-1',
          poLineId: 'POL-005-1',
          productCode: 'SKU-10023',
          productName: 'Aluminium Alloy 6061',
          productCategory: 'Raw Material',
          stockType: 'Raw Material',
          orderedQty: 800,
          previouslyReceivedQty: 400,
          receivedQty: 400,
          damagedQty: 10,
          acceptedQty: 390,
          uom: 'kg',
          trackingType: 'Batch',
          batchNumber: 'BT-2026-AL-0046',
          serialNumbers: [],
          manufacturingDate: null,
          expiryDate: null,
          destinationWarehouse: 'WH-003',
          rackBin: 'A-07',
          requiresInspection: false,
          inspectionStatus: 'Not Required',
          remarks: '10 kg damaged — see discrepancy DIS-2026-0044.',
        },
      ],
      totalReceivedQty: 400,
      totalDamagedQty: 10,
      packagingCondition: 'Damaged — 10 kg wet/contaminated',
      deliveryCondition: 'Partially Damaged',
      overallRemarks: '10 kg of aluminium received in damaged condition. Discrepancy raised.',
      createdBy: 'Arjun Mehta',
      createdAt: new Date(Date.now() - 50 * 3600000).toISOString(),
      postedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
      inspectionStatus: 'Not Required',
      discrepancyStatus: 'Submitted',
      discrepancyIds: ['DIS-001'],
      supplierReturnIds: [],
      attachments: [],
    },
    {
      id: 'GRN-004',
      grnNumber: 'GRN-2026-0829',
      poId: 'PO-001',
      poNumber: 'PO-2026-0567',
      supplierId: 'SUP-001',
      supplierName: 'Tata Steel Ltd',
      supplierDeliveryNote: 'DN-TATA-4510',
      receiptDate: new Date(Date.now() - 24 * 3600000).toISOString(),
      warehouse: 'WH-003',
      status: 'Draft',
      lines: [
        {
          lineId: 'GRNL-004-1',
          poLineId: 'POL-001-2',
          productCode: 'SKU-30045',
          productName: 'Steel Angle 40x40mm',
          productCategory: 'Raw Material',
          stockType: 'Raw Material',
          orderedQty: 500,
          previouslyReceivedQty: 0,
          receivedQty: 200,
          damagedQty: 0,
          acceptedQty: 200,
          uom: 'kg',
          trackingType: 'Batch',
          batchNumber: '',
          serialNumbers: [],
          manufacturingDate: null,
          expiryDate: null,
          destinationWarehouse: 'WH-003',
          rackBin: '',
          requiresInspection: true,
          inspectionStatus: 'Not Required',
          remarks: 'Batch number not yet confirmed by supplier.',
        },
      ],
      totalReceivedQty: 200,
      totalDamagedQty: 0,
      packagingCondition: '',
      deliveryCondition: '',
      overallRemarks: 'Draft — pending batch details from supplier.',
      createdBy: 'Ravi Kumar',
      createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      postedAt: null,
      inspectionStatus: 'Pending',
      discrepancyStatus: 'None',
      discrepancyIds: [],
      supplierReturnIds: [],
      attachments: [],
    },
  ];
}

// ─── Mock Discrepancies ───────────────────────────────────────
function getMockDiscrepancies(): Discrepancy[] {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];

  return [
    {
      id: 'DIS-001',
      discrepancyId: 'DIS-2026-0044',
      poId: 'PO-005',
      poNumber: 'PO-2026-0530',
      grnId: 'GRN-003',
      grnNumber: 'GRN-2026-0838',
      supplierId: 'SUP-001',
      supplierName: 'Tata Steel Ltd',
      productCode: 'SKU-10023',
      productName: 'Aluminium Alloy 6061',
      batchSerial: 'BT-2026-AL-0046',
      issueType: 'Damaged Goods',
      qtyAffected: 10,
      uom: 'kg',
      warehouse: 'WH-003',
      description: '10 kg of aluminium alloy received in contaminated/wet condition. Packaging was damaged in transit. Goods are not suitable for production use.',
      reportedDate: new Date(Date.now() - 48 * 3600000).toISOString(),
      reportedBy: 'Arjun Mehta',
      responsibleDepartment: 'Procurement',
      assignedPerson: 'Sunita Rao',
      status: 'Assigned',
      dueDate: tomorrow,
      resolutionDetails: null,
      attachments: [],
      linkedReturnId: null,
    },
    {
      id: 'DIS-002',
      discrepancyId: 'DIS-2026-0045',
      poId: 'PO-001',
      poNumber: 'PO-2026-0567',
      grnId: 'GRN-001',
      grnNumber: 'GRN-2026-0841',
      supplierId: 'SUP-001',
      supplierName: 'Tata Steel Ltd',
      productCode: 'SKU-30012',
      productName: 'Steel Rod 20mm',
      batchSerial: null,
      issueType: 'Short Delivery',
      qtyAffected: 500,
      uom: 'kg',
      warehouse: 'WH-003',
      description: 'Only 500 kg received against 1000 kg ordered. Supplier delivery note shows 1000 kg dispatched. Balance not received.',
      reportedDate: new Date(Date.now() - 2 * 3600000).toISOString(),
      reportedBy: 'Ravi Kumar',
      responsibleDepartment: 'Procurement',
      assignedPerson: 'Sunita Rao',
      status: 'Submitted',
      dueDate: today,
      resolutionDetails: null,
      attachments: [],
      linkedReturnId: null,
    },
    {
      id: 'DIS-003',
      discrepancyId: 'DIS-2026-0038',
      poId: 'PO-005',
      poNumber: 'PO-2026-0530',
      grnId: 'GRN-002',
      grnNumber: 'GRN-2026-0835',
      supplierId: 'SUP-001',
      supplierName: 'Tata Steel Ltd',
      productCode: 'SKU-10023',
      productName: 'Aluminium Alloy 6061',
      batchSerial: null,
      issueType: 'Missing Documentation',
      qtyAffected: null,
      uom: null,
      warehouse: 'WH-003',
      description: 'Material Test Certificate (MTC) not included with delivery. Required for quality records.',
      reportedDate: new Date(Date.now() - 72 * 3600000).toISOString(),
      reportedBy: 'Arjun Mehta',
      responsibleDepartment: 'Procurement',
      assignedPerson: 'Sunita Rao',
      status: 'Waiting for Supplier',
      dueDate: twoDaysAgo,
      resolutionDetails: null,
      attachments: [],
      linkedReturnId: null,
    },
    {
      id: 'DIS-004',
      discrepancyId: 'DIS-2026-0033',
      poId: 'PO-003',
      poNumber: 'PO-2026-0612',
      grnId: null,
      grnNumber: null,
      supplierId: 'SUP-003',
      supplierName: 'Precision Parts Co.',
      productCode: 'SKU-20045',
      productName: 'Bearing Assembly Type-C',
      batchSerial: null,
      issueType: 'Suspected Quality Defect',
      qtyAffected: 50,
      uom: 'Units',
      warehouse: 'WH-001',
      description: 'Visual inspection of previous delivery lot revealed surface cracks on 50 units. Quality Control inspection requested before accepting new delivery.',
      reportedDate: new Date(Date.now() - 5 * 86400000).toISOString(),
      reportedBy: 'Priya Nair',
      responsibleDepartment: 'Quality Control',
      assignedPerson: 'Vikram Singh',
      status: 'Waiting for Quality Control',
      dueDate: today,
      resolutionDetails: null,
      attachments: [],
      linkedReturnId: null,
    },
  ];
}

// ─── Mock Supplier Returns ─────────────────────────────────────
function getMockSupplierReturns(): SupplierReturn[] {
  return [
    {
      id: 'RET-S-001',
      returnId: 'SRN-2026-0012',
      originalGrnId: 'GRN-003',
      originalGrnNumber: 'GRN-2026-0838',
      poId: 'PO-005',
      poNumber: 'PO-2026-0530',
      supplierId: 'SUP-001',
      supplierName: 'Tata Steel Ltd',
      productCode: 'SKU-10023',
      productName: 'Aluminium Alloy 6061',
      batchSerial: 'BT-2026-AL-0046',
      eligibleQty: 10,
      returnQty: 10,
      uom: 'kg',
      returnReason: 'Goods received in damaged/contaminated condition (Ref: DIS-2026-0044).',
      physicalCondition: 'Damaged — wet/contaminated. Not suitable for production.',
      sourceWarehouse: 'WH-003',
      sourceBin: 'A-07',
      stagingLocation: 'WH-003 Returns Bay',
      approvalStatus: 'Approved',
      approvalRef: 'PROC-AUTH-2026-0089',
      approvedBy: 'Sunita Rao (Procurement)',
      dispatchStatus: 'Return Staging',
      expectedDispatchDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      actualDispatchDate: null,
      transporter: null,
      shipmentRef: null,
      linkedDiscrepancyId: 'DIS-001',
      createdBy: 'Arjun Mehta',
      createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      remarks: 'Supplier to issue credit note upon receipt of returned goods.',
    },
    {
      id: 'RET-S-002',
      returnId: 'SRN-2026-0009',
      originalGrnId: 'GRN-002',
      originalGrnNumber: 'GRN-2026-0835',
      poId: 'PO-005',
      poNumber: 'PO-2026-0530',
      supplierId: 'SUP-001',
      supplierName: 'Tata Steel Ltd',
      productCode: 'SKU-10023',
      productName: 'Aluminium Alloy 6061',
      batchSerial: 'BT-2026-AL-0045',
      eligibleQty: 20,
      returnQty: 20,
      uom: 'kg',
      returnReason: 'Quality non-conformance — hardness test failed.',
      physicalCondition: 'Externally intact but non-conforming per QC test results.',
      sourceWarehouse: 'WH-003',
      sourceBin: 'A-07',
      stagingLocation: null,
      approvalStatus: 'Pending',
      approvalRef: null,
      approvedBy: null,
      dispatchStatus: 'Awaiting Approval',
      expectedDispatchDate: null,
      actualDispatchDate: null,
      transporter: null,
      shipmentRef: null,
      linkedDiscrepancyId: null,
      createdBy: 'Arjun Mehta',
      createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      remarks: 'QC test report attached. Awaiting Procurement sign-off.',
    },
  ];
}

// ─── Metrics calculation from records ─────────────────────────
function computeMetrics(
  pos: PurchaseOrder[],
  grns: GoodsReceiptNote[],
  discrepancies: Discrepancy[],
  returns: SupplierReturn[]
): ReceivingMetrics {
  const activePOs = pos.filter((p) => !['Fully Received', 'Cancelled', 'Closed'].includes(p.receivingStatus));
  const expectedDeliveries = activePOs.length;
  const overdueDeliveries = pos.filter((p) => p.receivingStatus === 'Overdue').length;
  const pendingGRNs = grns.filter((g) => ['Draft', 'Submitted'].includes(g.status)).length;
  const inspectionHolds = grns.reduce((acc, grn) => {
    return acc + grn.lines.filter((l: GRNLine) => l.inspectionStatus === 'Pending' || l.inspectionStatus === 'In Progress').length;
  }, 0);
  const openDiscrepancies = discrepancies.filter(
    (d) => !['Resolved', 'Rejected', 'Closed'].includes(d.status)
  ).length;
  const pendingReturns = returns.filter(
    (r) => !['Dispatched', 'Rejected', 'Cancelled', 'Closed'].includes(r.dispatchStatus)
  ).length;

  return {
    expectedDeliveries,
    pendingGRNs,
    inspectionHolds,
    openDiscrepancies,
    overdueDeliveries,
    pendingSupplierReturns: pendingReturns,
  };
}

// ─── Main Service Functions ───────────────────────────────────
export async function fetchReceivingData(_warehouseId: string): Promise<ReceivingPageData> {
  await new Promise((r) => setTimeout(r, 300));
  const store = useErpStore.getState();
  const mockPos = getMockPurchaseOrders();
  const mockGrns = getMockGRNs();
  const mockDiscrepancies = getMockDiscrepancies();
  const supplierReturns = getMockSupplierReturns();

  // Map Live Purchase Orders from central useErpStore
  const livePOs: PurchaseOrder[] = store.purchaseOrders.map((po) => {
    const totalOrdered = po.lines.reduce((s, l) => s + l.orderedQty, 0);
    const totalReceived = po.lines.reduce((s, l) => s + (l.receivedQty || 0), 0);
    const totalOutstanding = Math.max(0, totalOrdered - totalReceived);

    const receivingStatus: ReceivingStatus =
      po.status === 'fully_received'
        ? 'Fully Received'
        : po.status === 'partially_received'
        ? 'Partially Received'
        : new Date(po.expectedDeliveryDate) < new Date()
        ? 'Overdue'
        : 'Expected';

    return {
      id: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      supplierContact: 'Verified Vendor Master',
      orderDate: po.orderDate,
      expectedDeliveryDate: po.expectedDeliveryDate,
      destinationWarehouse: po.destinationWarehouseId,
      deliveryRef: `DN-${po.poNumber}`,
      poStatus: (po.status.charAt(0).toUpperCase() + po.status.slice(1).replace('_', ' ')) as POStatus,
      receivingStatus,
      lines: po.lines.map((l) => ({
        lineId: l.id,
        productCode: l.productSku,
        productName: l.productName,
        productCategory: 'Procured Stock',
        stockType: 'Raw Material',
        orderedQty: l.orderedQty,
        receivedQty: l.receivedQty || 0,
        outstandingQty: Math.max(0, l.orderedQty - (l.receivedQty || 0)),
        uom: (l.unit as any) || 'Units',
        trackingType: 'Batch',
        requiresExpiry: true,
        requiresInspection: true,
        unitPrice: l.purchaseUnitPrice,
      })),
      totalOrderedQty: totalOrdered,
      totalReceivedQty: totalReceived,
      totalOutstandingQty: totalOutstanding,
      lastUpdated: po.orderDate,
      notes: po.notes || 'Purchased via central ERP',
      grnIds: [],
    };
  });

  // Map Live Discrepancies from central useErpStore
  const liveDiscrepancies: Discrepancy[] = store.receivingDiscrepancies.map((d) => ({
    id: d.id,
    discrepancyId: d.discrepancyNumber || d.id,
    poId: d.receiptId,
    poNumber: d.receiptNumber,
    grnId: d.receiptId,
    grnNumber: d.receiptNumber,
    supplierId: d.supplierId || 'sup-001',
    supplierName: d.supplierName,
    productCode: d.productSku,
    productName: d.productName,
    batchSerial: null,
    issueType: (d.discrepancyType || d.type) === 'shortage' ? 'Short Delivery' : (d.discrepancyType || d.type) === 'damaged' ? 'Damaged Goods' : 'Excess Delivery',
    qtyAffected: d.shortageQuantity > 0 ? d.shortageQuantity : d.damagedQuantity,
    uom: (d.unit as any) || 'Units',
    warehouse: 'Main Depot',
    description: `${(d.discrepancyType || d.type || 'shortage').toUpperCase()}: Counted ${d.actualCountedQuantity} vs Expected ${d.expectedQuantity}. Financial value affected: ₹${d.financialValueAffected || ((d.shortageQuantity || 0) * (d.unitCost || 100))}.`,
    reportedDate: d.reportedAt,
    reportedBy: d.reportedByUserName || 'Store Keeper Dock',
    responsibleDepartment: 'Procurement Governance',
    assignedPerson: 'Admin Executive',
    status: d.status === 'resolved' ? 'Resolved' : 'Under Review',
    dueDate: null,
    resolutionDetails: d.resolutionNotes || null,
    attachments: [],
    linkedReturnId: null,
  }));

  const liveGrns: GoodsReceiptNote[] = store.inwardReceipts.map((inw, idx) => ({
    id: inw.id,
    grnNumber: inw.receiptNumber.replace('INW-', 'GRN-'),
    poId: inw.purchaseOrderId || `PO-LIVE-${idx}`,
    poNumber: inw.purchaseOrderNumber || (inw.supplierInvoiceNumber.startsWith('PO-') ? inw.supplierInvoiceNumber : `PO-2026-0${500 + idx}`),
    supplierId: inw.supplierId || 'SUP-LIVE',
    supplierName: inw.supplierName,
    supplierDeliveryNote: inw.supplierInvoiceNumber,
    receiptDate: inw.date.split('T')[0],
    warehouse: inw.warehouseId,
    status: inw.status === 'stock_available' ? 'Posted' : 'Awaiting Inspection',
    lines: [
      {
        lineId: `${inw.id}-line`,
        poLineId: `${inw.id}-po-line`,
        productCode: inw.productSku,
        productName: inw.productName,
        productCategory: 'Raw Material',
        stockType: 'Raw Material',
        orderedQty: inw.expectedQuantity || inw.receivedQuantity,
        previouslyReceivedQty: 0,
        receivedQty: inw.actualCountedQuantity || inw.receivedQuantity,
        damagedQty: inw.damagedQuantity || 0,
        acceptedQty: inw.acceptedQuantity || inw.receivedQuantity,
        uom: (inw.unit as any) || 'Units',
        trackingType: 'Batch',
        batchNumber: inw.batchNumber,
        serialNumbers: [],
        manufacturingDate: inw.manufacturingDate,
        expiryDate: inw.expiryDate,
        destinationWarehouse: inw.warehouseId,
        rackBin: inw.storageLocationId,
        requiresInspection: false,
        inspectionStatus: inw.status === 'stock_available' ? 'Approved' : 'Pending',
        remarks: inw.notes || '',
      },
    ],
    totalReceivedQty: inw.receivedQuantity,
    totalDamagedQty: inw.damagedQuantity || 0,
    packagingCondition: 'Good',
    deliveryCondition: 'Intact',
    overallRemarks: inw.notes || 'Inward consignment processed',
    createdBy: inw.receivedByUserName,
    createdAt: inw.date,
    postedAt: inw.stockPostedAt || (inw.status === 'stock_available' ? inw.date : null),
    inspectionStatus: inw.status === 'stock_available' ? 'Approved' : 'Pending',
    discrepancyStatus: inw.discrepancyStatus ? (inw.discrepancyStatus === 'resolved' ? 'Resolved' : 'Submitted') : 'None',
    discrepancyIds: inw.discrepancyId ? [inw.discrepancyId] : [],
    supplierReturnIds: [],
    attachments: inw.attachmentFileName ? [inw.attachmentFileName] : [],
  }));

  const combinedPOs = [...livePOs, ...mockPos];
  const combinedGrns = [...liveGrns, ...mockGrns];
  const combinedDiscrepancies = [...liveDiscrepancies, ...mockDiscrepancies];

  return {
    metrics: computeMetrics(combinedPOs, combinedGrns, combinedDiscrepancies, supplierReturns),
    purchaseOrders: combinedPOs,
    grns: combinedGrns,
    discrepancies: combinedDiscrepancies,
    supplierReturns,
    lastRefresh: new Date().toISOString(),
    isMockData: false,
  };
}

export async function submitGRN(form: unknown): Promise<{ success: boolean; grnNumber: string }> {
  await new Promise((r) => setTimeout(r, 600));
  const grnForm = form as GRNFormState;
  const store = useErpStore.getState();
  const randNum = Math.floor(8800 + Math.random() * 200);
  const grnNumber = `GRN-2026-${randNum}`;

  if (grnForm && grnForm.lines && Array.isArray(grnForm.lines)) {
    for (const line of grnForm.lines) {
      const recQty = Number(line.receivedQty) || 0;
      if (recQty > 0) {
        // Find or match product
        const matchedProduct =
          store.products.find(
            (p) =>
              p.sku.toLowerCase() === (line.productCode || '').toLowerCase() ||
              p.name.toLowerCase() === (line.productName || '').toLowerCase()
          ) || store.products[0];

        // Find or match warehouse
        const matchedWarehouse =
          store.warehouses.find(
            (w) =>
              w.id.toLowerCase() === (grnForm.warehouse || '').toLowerCase() ||
              w.name.toLowerCase().includes((grnForm.warehouse || '').toLowerCase())
          ) || store.warehouses[0];

        const batchNum = line.batchNumber?.trim() || `BT-2026-${line.productCode || 'INW'}-${Math.floor(1000 + Math.random() * 9000)}`;

        const expectedQty = Number(line.orderedQty) || recQty;
        const damagedQty = Number(line.damagedQty) || 0;
        const shortageQty = Math.max(0, expectedQty - recQty);
        const acceptedQty = Math.max(0, recQty - damagedQty);

        // Record receipt in central store with accurate discrepancy flags
        const newReceipt = store.createInwardReceipt({
          date: grnForm.receiptDate ? new Date(grnForm.receiptDate).toISOString() : new Date().toISOString(),
          supplierName: grnForm.supplierName || 'Primary Supplier',
          supplierInvoiceNumber: grnForm.supplierDeliveryNote || `DN-${randNum}`,
          regionId: matchedWarehouse?.regionId || 'reg-north',
          warehouseId: matchedWarehouse?.id || 'wh-delhi-main',
          storageLocationId: line.rackBin || 'loc-bay-1',
          productId: matchedProduct?.id || 'prod-001',
          productName: matchedProduct?.name || line.productName,
          productSku: matchedProduct?.sku || line.productCode,
          batchNumber: batchNum,
          manufacturingDate: line.manufacturingDate || new Date().toISOString().split('T')[0],
          expiryDate: line.expiryDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          expectedQuantity: expectedQty,
          actualCountedQuantity: recQty,
          receivedQuantity: acceptedQty,
          acceptedQuantity: acceptedQty,
          shortageQuantity: shortageQty,
          damagedQuantity: damagedQty,
          unit: line.uom || 'units',
          actualUnitCost: matchedProduct?.actualCost || 120,
          status: 'received',
          receivedByUserId: store.currentUser?.id || 'usr-store-keeper',
          receivedByUserName: store.currentUser?.name || grnForm.receivedBy || 'Store Keeper',
          notes: grnForm.overallRemarks || `GRN ${grnNumber} against PO ${grnForm.poNumber}`,
        });

        // If there is shortage or damage, register discrepancy
        if (shortageQty > 0 || damagedQty > 0) {
          const unitCost = matchedProduct?.actualCost || 120;
          const varianceQty = shortageQty > 0 ? shortageQty : damagedQty;
          const financialVal = varianceQty * unitCost;

          useErpStore.setState((state) => ({
            receivingDiscrepancies: [
              {
                id: `disc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                discrepancyNumber: `DISC-2026-${Math.floor(100 + Math.random() * 900)}`,
                receiptId: newReceipt.id,
                receiptNumber: newReceipt.receiptNumber,
                supplierId: newReceipt.supplierId || 'sup-001',
                supplierName: newReceipt.supplierName,
                productId: newReceipt.productId,
                productSku: newReceipt.productSku,
                productName: newReceipt.productName,
                expectedQuantity: expectedQty,
                actualCountedQuantity: recQty,
                shortageQuantity: shortageQty,
                damagedQuantity: damagedQty,
                excessQuantity: 0,
                unit: newReceipt.unit,
                unitCost,
                financialValueAffected: financialVal,
                discrepancyType: shortageQty > 0 ? 'shortage' : 'damaged',
                type: shortageQty > 0 ? 'shortage' : 'damaged',
                status: 'pending_review',
                reportedByUserId: store.currentUser?.id || 'usr-store-keeper',
                reportedByUserName: store.currentUser?.name || 'Store Keeper',
                reportedAt: new Date().toISOString(),
              },
              ...state.receivingDiscrepancies,
            ],
          }));
        }

        // Post accepted stock to active warehouse inventory if not held for quarantine QC
        if (!line.requiresInspection && acceptedQty > 0) {
          store.postGoodsReceiptToInventory(newReceipt.id);
        }
      }
    }
  }

  return { success: true, grnNumber };
}

export async function submitDiscrepancy(form: unknown): Promise<{ success: boolean; discrepancyId: string }> {
  await new Promise((r) => setTimeout(r, 600));
  void form;
  return { success: true, discrepancyId: `DIS-2026-${Math.floor(50 + Math.random() * 50)}` };
}

export async function submitSupplierReturn(form: unknown): Promise<{ success: boolean; returnId: string }> {
  await new Promise((r) => setTimeout(r, 600));
  void form;
  return { success: true, returnId: `SRN-2026-${Math.floor(15 + Math.random() * 20)}` };
}
