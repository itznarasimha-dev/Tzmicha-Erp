import { Batch, Product } from '../types';

export interface RegionalStockSummary {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  totalAvailable: number;
  totalReserved: number;
  totalDispatched: number;
  batchCount: number;
  lowStock: boolean;
}

export function aggregateRegionalStock(
  products: Product[],
  batches: Batch[],
  regionId?: string
): RegionalStockSummary[] {
  const filteredBatches = regionId && regionId !== 'all'
    ? batches.filter((b) => b.regionId === regionId)
    : batches;

  return products.map((product) => {
    const productBatches = filteredBatches.filter((b) => b.productId === product.id);
    const totalAvailable = productBatches.reduce((sum, b) => sum + b.availableQuantity, 0);
    const totalReserved = productBatches.reduce((sum, b) => sum + b.reservedQuantity, 0);
    const totalDispatched = productBatches.reduce((sum, b) => sum + b.dispatchedQuantity, 0);

    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      totalAvailable,
      totalReserved,
      totalDispatched,
      batchCount: productBatches.length,
      lowStock: totalAvailable <= product.lowStockThreshold,
    };
  });
}
