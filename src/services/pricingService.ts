import { Product, User } from '../types';

export interface RepPricingView {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  standardSellingPrice: number;
  minAllowedPrice: number;
  userMaxDiscountPercent: number;
  maxPermittedDiscountAmount: number;
  minimumPermittedPriceForUser: number;
  taxRatePercent: number;
}

export function getRepPricing(product: Product, user: User): RepPricingView {
  const userMaxDisc = user.maxDiscountPercent || 0;
  const maxPermittedDiscountAmount = (product.standardSellingPrice * userMaxDisc) / 100;
  const minimumPermittedPriceForUser = Math.max(
    product.minAllowedPrice,
    product.standardSellingPrice - maxPermittedDiscountAmount
  );

  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    unit: product.unit,
    standardSellingPrice: product.standardSellingPrice,
    minAllowedPrice: product.minAllowedPrice,
    userMaxDiscountPercent: userMaxDisc,
    maxPermittedDiscountAmount,
    minimumPermittedPriceForUser,
    taxRatePercent: product.taxRatePercent,
  };
}

export function calculateQuotationLine(
  standardPrice: number,
  quantity: number,
  discountPercent: number,
  taxRatePercent: number = 18
) {
  const baseTotal = quantity * standardPrice;
  const discountAmount = (baseTotal * discountPercent) / 100;
  const taxableAmount = baseTotal - discountAmount;
  const taxAmount = (taxableAmount * taxRatePercent) / 100;
  const netTotal = taxableAmount + taxAmount;
  const effectiveUnitPrice = standardPrice * (1 - discountPercent / 100);

  return {
    baseTotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    netTotal,
    effectiveUnitPrice,
  };
}
