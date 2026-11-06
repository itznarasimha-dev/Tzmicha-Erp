import { SalesOrder, Batch, ExpenseClaim, Customer, StockMovement } from '../types';

export interface FinanceSummary {
  totalSalesRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossMarginPercent: number;
  totalCollectedCash: number;
  outstandingReceivables: number;
  totalInventoryValuation: number;
  totalApprovedExpenses: number;
  pendingExpenseClaimsValue: number;
  companyTransportExpense: number;
  customerDeliveryRevenue: number;
  transportRecoveryVariance: number;
  netOperatingProfit: number;
  regionalBreakdown: {
    regionId: string;
    regionName: string;
    revenue: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    transportExpense: number;
    deliveryRevenue: number;
  }[];
}

export function calculateFinanceMetrics(
  salesOrders: SalesOrder[],
  batches: Batch[],
  customers: Customer[],
  expenseClaims: ExpenseClaim[],
  stockMovements: StockMovement[],
  regionFilter?: string
): FinanceSummary {
  // Filter by region if specified
  const filteredOrders = regionFilter && regionFilter !== 'all'
    ? salesOrders.filter((o) => o.regionId === regionFilter)
    : salesOrders;

  const filteredBatches = regionFilter && regionFilter !== 'all'
    ? batches.filter((b) => b.regionId === regionFilter)
    : batches;

  const filteredCustomers = regionFilter && regionFilter !== 'all'
    ? customers.filter((c) => c.regionId === regionFilter)
    : customers;

  const filteredExpenses = regionFilter && regionFilter !== 'all'
    ? expenseClaims.filter((e) => e.regionId === regionFilter)
    : expenseClaims;

  // 1. Total Sales Revenue: only counted for non-cancelled orders that are reserved or dispatched or completed
  // (Do not count cancelled or pending approval orders as final revenue!)
  const validOrders = filteredOrders.filter(
    (o) => o.status === 'dispatched' || o.status === 'completed' || o.status === 'reserved'
  );
  const totalSalesRevenue = validOrders.reduce((sum, o) => sum + o.subtotal - o.totalDiscount, 0);

  // 2. Cost of Goods Sold (COGS)
  // Calculated from the actual costs of dispatched items
  const dispatchedMovements = stockMovements.filter(
    (m) =>
      m.movementType === 'outward_dispatch' &&
      (!regionFilter || regionFilter === 'all' || m.regionId === regionFilter)
  );

  const costOfGoodsSold = dispatchedMovements.reduce(
    (sum, m) => sum + m.quantity * (m.unitCostAtMovement || 0),
    0
  );

  // 3. Gross Profit & Margin
  const grossProfit = totalSalesRevenue - costOfGoodsSold;
  const grossMarginPercent = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;

  // 4. Collected Cash vs Receivables
  const totalCollectedCash = validOrders.reduce((sum, o) => sum + (o.amountPaid || 0), 0);
  const outstandingReceivables = filteredCustomers.reduce((sum, c) => sum + c.currentOutstanding, 0);

  // 5. Total Stock Valuation (Actual Cost of all available + reserved units)
  const totalInventoryValuation = filteredBatches.reduce(
    (sum, b) => sum + (b.availableQuantity + b.reservedQuantity) * b.actualUnitCost,
    0
  );

  // 6. Expenses & Transport Calculations
  const approvedClaims = filteredExpenses.filter((e) => e.status === 'approved' || e.status === 'paid');
  const totalApprovedExpenses = approvedClaims.reduce((sum, e) => sum + e.amount, 0);

  const pendingClaims = filteredExpenses.filter((e) => e.status === 'submitted');
  const pendingExpenseClaimsValue = pendingClaims.reduce((sum, e) => sum + e.amount, 0);

  // Transport & Delivery Freight Accounting
  const companyTransportExpense = validOrders.reduce((sum, o) => sum + (o.companyTransportExpense || 0), 0);
  const customerDeliveryRevenue = validOrders.reduce((sum, o) => sum + (o.customerDeliveryCharge || 0), 0);
  const transportRecoveryVariance = customerDeliveryRevenue - companyTransportExpense;

  // 7. Net Profit (Gross Profit - Operating Expenses + Freight Recovery Variance)
  const netOperatingProfit = grossProfit - totalApprovedExpenses + transportRecoveryVariance;

  // 8. Regional Breakdown
  const regionMap: Record<string, { regionName: string; revenue: number; cogs: number; grossProfit: number; expenses: number; transportExpense: number; deliveryRevenue: number }> = {
    'reg-north': { regionName: 'North Region', revenue: 0, cogs: 0, grossProfit: 0, expenses: 0, transportExpense: 0, deliveryRevenue: 0 },
    'reg-west': { regionName: 'West Region', revenue: 0, cogs: 0, grossProfit: 0, expenses: 0, transportExpense: 0, deliveryRevenue: 0 },
    'reg-south': { regionName: 'South Region', revenue: 0, cogs: 0, grossProfit: 0, expenses: 0, transportExpense: 0, deliveryRevenue: 0 },
  };

  validOrders.forEach((o) => {
    if (regionMap[o.regionId]) {
      regionMap[o.regionId].revenue += (o.subtotal - o.totalDiscount);
      regionMap[o.regionId].transportExpense += (o.companyTransportExpense || 0);
      regionMap[o.regionId].deliveryRevenue += (o.customerDeliveryCharge || 0);
    }
  });

  dispatchedMovements.forEach((m) => {
    if (regionMap[m.regionId]) {
      regionMap[m.regionId].cogs += m.quantity * (m.unitCostAtMovement || 0);
    }
  });

  approvedClaims.forEach((e) => {
    if (regionMap[e.regionId]) {
      regionMap[e.regionId].expenses += e.amount;
    }
  });

  const regionalBreakdown = Object.entries(regionMap).map(([regionId, data]) => ({
    regionId,
    regionName: data.regionName,
    revenue: data.revenue,
    cogs: data.cogs,
    grossProfit: data.revenue - data.cogs,
    expenses: data.expenses,
    transportExpense: data.transportExpense,
    deliveryRevenue: data.deliveryRevenue,
  }));

  return {
    totalSalesRevenue,
    costOfGoodsSold,
    grossProfit,
    grossMarginPercent,
    totalCollectedCash,
    outstandingReceivables,
    totalInventoryValuation,
    totalApprovedExpenses,
    pendingExpenseClaimsValue,
    companyTransportExpense,
    customerDeliveryRevenue,
    transportRecoveryVariance,
    netOperatingProfit,
    regionalBreakdown,
  };
}
