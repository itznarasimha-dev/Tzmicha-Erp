// ============================================================
// SERVICE — SALES FULFILMENT & RETURNS
// ============================================================

import type {
  FulfilmentMetrics,
  SalesOrder,
  PickList,
  DispatchRecord,
  CustomerReturn,
  FulfilmentException,
} from '../types';
import { useErpStore } from '../../../../store/useErpStore';

export async function fetchFulfilmentMetrics(): Promise<FulfilmentMetrics> {
  const erpStore = useErpStore.getState();
  const orders = erpStore.salesOrders || [];
  const awaiting = orders.filter((o) => o.status === 'reserved' || o.status === 'stock_verified').length;
  const inPicking = orders.filter((o) => o.status === 'picking').length;
  const readyDispatch = orders.filter((o) => o.status === 'dispatched' || o.status === 'completed').length;

  return {
    awaitingFulfilment: awaiting + 10,
    awaitingPicking: awaiting || 6,
    pickingInProgress: inPicking || 3,
    awaitingPacking: 5,
    readyForDispatch: readyDispatch || 8,
    partialFulfilment: 2,
    returnsAwaitingDisposition: 4,
    fulfilmentExceptions: 3,
    lastRefresh: new Date().toISOString(),
  };
}

export async function fetchAuthorizedOrders(_warehouseId: string): Promise<SalesOrder[]> {
  const erpStore = useErpStore.getState();
  const erpOrders = erpStore.salesOrders.filter(
    (o) => o.status === 'reserved' || o.status === 'stock_verified' || o.status === 'picking'
  );

  const mappedErpOrders: SalesOrder[] = erpOrders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    deliveryLocation: `${o.regionId.toUpperCase()} Distribution Region`,
    orderDate: o.createdAt,
    requiredDispatchDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    priority: o.totalAmount > 500000 ? 'High' : 'Medium',
    status: 'Authorized',
    fulfilmentStatus: o.status === 'picking' ? 'Picking in Progress' : 'Awaiting Picking',
    warehouseId: o.warehouseId || 'WH-002',
    warehouseName: 'Finished Goods Hub',
    totalItems: o.items.length,
    lines: o.items.map((it, idx) => ({
      id: `${o.id}-line-${idx}`,
      productId: it.productId,
      productName: it.productName,
      sku: it.productSku,
      orderedQty: it.quantity,
      fulfilledQty: 0,
      outstandingQty: it.quantity,
      reservedQty: it.quantity,
      uom: it.unit || 'units',
      status: 'Reserved',
    })),
  }));

  const defaultMockOrders: SalesOrder[] = [
    {
      id: 'so-001',
      orderNumber: 'SO-2026-1001',
      customerName: 'Global Tech Corp',
      deliveryLocation: 'New York, NY',
      orderDate: '2026-10-20T10:00:00Z',
      requiredDispatchDate: '2026-10-25T17:00:00Z',
      priority: 'High',
      status: 'Authorized',
      fulfilmentStatus: 'Awaiting Picking',
      warehouseId: 'WH-002',
      warehouseName: 'Finished Goods Store',
      totalItems: 2,
      lines: [
        { id: 'l1', productId: 'p1', productName: 'Industrial Gearbox G-200', sku: 'IGB-200-X', orderedQty: 10, fulfilledQty: 0, outstandingQty: 10, reservedQty: 10, uom: 'units', status: 'Reserved' },
        { id: 'l2', productId: 'p2', productName: 'Precision Valve V-10', sku: 'PV-10-S', orderedQty: 50, fulfilledQty: 0, outstandingQty: 50, reservedQty: 0, uom: 'units', status: 'Pending' },
      ],
    },
    {
      id: 'so-002',
      orderNumber: 'SO-2026-1002',
      customerName: 'Precision Parts Ltd',
      deliveryLocation: 'Chicago, IL',
      orderDate: '2026-10-21T14:00:00Z',
      requiredDispatchDate: '2026-10-26T17:00:00Z',
      priority: 'Medium',
      status: 'Authorized',
      fulfilmentStatus: 'Picking in Progress',
      warehouseId: 'WH-002',
      warehouseName: 'Finished Goods Store',
      totalItems: 1,
      lines: [
        { id: 'l3', productId: 'p3', productName: 'Hydraulic Pump P-50', sku: 'HPP-50-S', orderedQty: 5, fulfilledQty: 2, outstandingQty: 3, reservedQty: 3, uom: 'units', status: 'Picked' },
      ],
    },
  ];

  return [...mappedErpOrders, ...defaultMockOrders];
}

export async function createPickList(orderId: string): Promise<{ success: boolean; pickListId: string }> {
  await new Promise((r) => setTimeout(r, 400));
  const store = useErpStore.getState();
  const order = store.salesOrders.find((o) => o.id === orderId || o.orderNumber === orderId);
  if (order && (order.status === 'reserved' || order.status === 'stock_verified')) {
    store.updateSalesOrderStatus(order.id, 'picking');
  }
  return { success: true, pickListId: `PKL-${Math.random().toString(36).substr(2, 9).toUpperCase()}` };
}

export async function fetchPickLists(_warehouseId: string): Promise<PickList[]> {
  return [
    {
      id: 'pkl-001',
      pickListNumber: 'PKL-2026-001',
      orderId: 'so-002',
      orderNumber: 'SO-2026-1002',
      warehouseId: 'WH-002',
      assignedPicker: 'Bob Picker',
      status: 'Picking',
      createdAt: new Date().toISOString(),
      lines: [
        { id: 'pl1', lineId: 'l3', productId: 'p3', sku: 'HPP-50-S', binLocation: 'BIN-C-101', requiredQty: 5, pickedQty: 2, uom: 'units', batchNumber: 'B-X', serialNumbers: [] },
      ],
    },
  ];
}

export async function postDispatch(dispatchId: string): Promise<{ success: boolean }> {
  await new Promise((r) => setTimeout(r, 500));
  const store = useErpStore.getState();
  const order = store.salesOrders.find(
    (o) => o.id === dispatchId || o.orderNumber === dispatchId || o.status === 'picking' || o.status === 'reserved'
  );
  if (order) {
    store.allocateAndDispatchOrder(
      order.id,
      [],
      order.warehouseId || store.warehouses[0]?.id || 'wh-delhi-main',
      `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`
    );
  }
  return { success: true };
}

export async function fetchDispatches(_warehouseId: string): Promise<DispatchRecord[]> {
  return [
    {
      id: 'dsp-001',
      dispatchNumber: 'DSP-2026-001',
      orderId: 'so-000',
      warehouseId: 'WH-002',
      dispatchDate: '2026-10-22T09:00:00Z',
      carrier: 'FedEx',
      trackingNumber: 'TRK123456789',
      status: 'Handed Over',
      packages: 2,
      lines: [
        { productId: 'p1', sku: 'IGB-200-X', qty: 10, uom: 'units', batchNumber: 'B-1' },
      ],
    },
  ];
}

export async function fetchCustomerReturns(_warehouseId: string): Promise<CustomerReturn[]> {
  return [
    {
      id: 'ret-001',
      returnReference: 'RET-2026-001',
      customerName: 'Global Tech Corp',
      orderId: 'so-001',
      dispatchReference: 'DSP-2026-001',
      receivedDate: '2026-10-23T10:00:00Z',
      status: 'Received',
      reason: 'Incorrect Specification',
      lines: [
        { id: 'rl1', productId: 'p1', sku: 'IGB-200-X', qtyReceived: 2, uom: 'units', condition: 'New', qcStatus: 'Awaiting Inspection', batchNumber: 'B-1' },
      ],
    },
  ];
}

export async function fetchFulfilmentExceptions(_warehouseId: string): Promise<FulfilmentException[]> {
  return [
    {
      id: 'exc-001',
      exceptionRef: 'EXC-FUL-001',
      orderId: 'so-001',
      productId: 'p2',
      sku: 'PV-10-S',
      type: 'Shortage',
      description: 'Eligible stock found to be damaged during picking.',
      severity: 'High',
      status: 'Open',
      reportedBy: 'Bob Picker',
      createdAt: new Date().toISOString(),
    },
  ];
}
