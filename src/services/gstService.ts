// Indian GST (Goods and Services Tax) Calculation & Validation Engine

export interface GstState {
  code: string; // 2-digit code, e.g. "07"
  name: string; // State Name, e.g. "Delhi"
}

export const INDIAN_GST_STATES: GstState[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
];

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

/**
 * Validate a 15-character GSTIN format and check that its state prefix matches a valid Indian state
 */
export function validateGstin(gstin: string | null | undefined): { isValid: boolean; message: string; state?: GstState } {
  if (!gstin || !gstin.trim()) {
    return { isValid: false, message: 'GSTIN cannot be empty' };
  }
  const clean = gstin.trim().toUpperCase();
  if (clean.length !== 15) {
    return { isValid: false, message: `GSTIN must be exactly 15 characters (currently ${clean.length})` };
  }
  if (!GSTIN_REGEX.test(clean)) {
    return { isValid: false, message: 'Invalid GSTIN format. Example: 07AABCT1234F1Z5' };
  }
  const stateCode = clean.substring(0, 2);
  const foundState = INDIAN_GST_STATES.find((s) => s.code === stateCode);
  if (!foundState) {
    return { isValid: false, message: `Invalid state code "${stateCode}" in GSTIN` };
  }
  return { isValid: true, message: `Valid GSTIN for ${foundState.name}`, state: foundState };
}

/**
 * Validate a 10-character Permanent Account Number (PAN)
 */
export function validatePan(pan: string | null | undefined): { isValid: boolean; message: string } {
  if (!pan || !pan.trim()) {
    return { isValid: false, message: 'PAN cannot be empty' };
  }
  const clean = pan.trim().toUpperCase();
  if (clean.length !== 10) {
    return { isValid: false, message: `PAN must be exactly 10 characters (currently ${clean.length})` };
  }
  if (!PAN_REGEX.test(clean)) {
    return { isValid: false, message: 'Invalid PAN format. Example: AABCT1234F' };
  }
  return { isValid: true, message: 'Valid PAN format' };
}

export interface TaxCalculatedLineItem {
  id?: string;
  hsnCode: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount: number;
  taxableValue: number;
  gstRate: number; // e.g. 18
  isInterstate: boolean;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  lineTotal: number;
}

export interface HsnTaxSummary {
  hsnCode: string;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
}

export interface DocumentTaxComputation {
  companyStateCode: string;
  customerStateCode: string;
  isInterstate: boolean;
  subtotal: number;
  totalDiscount: number;
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  lines: TaxCalculatedLineItem[];
  hsnSummary: HsnTaxSummary[];
}

/**
 * Calculate Indian GST Taxes based on Place of Supply
 */
export function calculateGstTaxes(
  companyStateCode: string,
  customerStateCode: string,
  rawItems: Array<{
    id?: string;
    hsnCode?: string;
    name: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    discountAmount?: number;
    gstRate?: number;
  }>,
  forceInterstate: boolean = false
): DocumentTaxComputation {
  const normCompany = (companyStateCode || '07').padStart(2, '0');
  const normCustomer = (customerStateCode || normCompany).padStart(2, '0');
  const isInterstate = forceInterstate || normCompany !== normCustomer;

  let subtotal = 0;
  let totalDiscount = 0;
  let taxableTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const lines: TaxCalculatedLineItem[] = [];
  const hsnMap = new Map<string, HsnTaxSummary>();

  for (const item of rawItems) {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const grossLine = qty * price;
    subtotal += grossLine;

    let discAmt = 0;
    if (item.discountAmount !== undefined && item.discountAmount > 0) {
      discAmt = Number(item.discountAmount);
    } else if (item.discountPercent !== undefined && item.discountPercent > 0) {
      discAmt = (grossLine * Number(item.discountPercent)) / 100;
    }
    // Round half up for discount
    discAmt = Math.round((discAmt + Number.EPSILON) * 100) / 100;
    totalDiscount += discAmt;

    const taxableValue = Math.max(0, Math.round((grossLine - discAmt + Number.EPSILON) * 100) / 100);
    taxableTotal += taxableValue;

    const rate = Number(item.gstRate ?? 18);
    const hsn = (item.hsnCode || '3208').trim();

    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;

    if (isInterstate) {
      igstRate = rate;
      igstAmount = Math.round(((taxableValue * igstRate) / 100 + Number.EPSILON) * 100) / 100;
      igstTotal += igstAmount;
    } else {
      cgstRate = rate / 2;
      sgstRate = rate / 2;
      cgstAmount = Math.round(((taxableValue * cgstRate) / 100 + Number.EPSILON) * 100) / 100;
      sgstAmount = Math.round(((taxableValue * sgstRate) / 100 + Number.EPSILON) * 100) / 100;
      cgstTotal += cgstAmount;
      sgstTotal += sgstAmount;
    }

    const totalLineTax = isInterstate ? igstAmount : cgstAmount + sgstAmount;
    const lineTotal = taxableValue + totalLineTax;

    lines.push({
      id: item.id,
      hsnCode: hsn,
      name: item.name,
      quantity: qty,
      unitPrice: price,
      discountPercent: item.discountPercent || 0,
      discountAmount: discAmt,
      taxableValue,
      gstRate: rate,
      isInterstate,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      totalTax: totalLineTax,
      lineTotal,
    });

    // Accumulate HSN summary
    const existingHsn = hsnMap.get(hsn) || {
      hsnCode: hsn,
      taxableValue: 0,
      cgstRate,
      cgstAmount: 0,
      sgstRate,
      sgstAmount: 0,
      igstRate,
      igstAmount: 0,
      totalTax: 0,
    };
    existingHsn.taxableValue = Math.round((existingHsn.taxableValue + taxableValue + Number.EPSILON) * 100) / 100;
    existingHsn.cgstAmount = Math.round((existingHsn.cgstAmount + cgstAmount + Number.EPSILON) * 100) / 100;
    existingHsn.sgstAmount = Math.round((existingHsn.sgstAmount + sgstAmount + Number.EPSILON) * 100) / 100;
    existingHsn.igstAmount = Math.round((existingHsn.igstAmount + igstAmount + Number.EPSILON) * 100) / 100;
    existingHsn.totalTax = Math.round((existingHsn.totalTax + totalLineTax + Number.EPSILON) * 100) / 100;
    hsnMap.set(hsn, existingHsn);
  }

  const totalTax = cgstTotal + sgstTotal + igstTotal;
  const rawGrandTotal = taxableTotal + totalTax;
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((roundedGrandTotal - rawGrandTotal + Number.EPSILON) * 100) / 100;

  return {
    companyStateCode: normCompany,
    customerStateCode: normCustomer,
    isInterstate,
    subtotal: Math.round((subtotal + Number.EPSILON) * 100) / 100,
    totalDiscount: Math.round((totalDiscount + Number.EPSILON) * 100) / 100,
    taxableTotal: Math.round((taxableTotal + Number.EPSILON) * 100) / 100,
    cgstTotal: Math.round((cgstTotal + Number.EPSILON) * 100) / 100,
    sgstTotal: Math.round((sgstTotal + Number.EPSILON) * 100) / 100,
    igstTotal: Math.round((igstTotal + Number.EPSILON) * 100) / 100,
    totalTax: Math.round((totalTax + Number.EPSILON) * 100) / 100,
    roundOff,
    grandTotal: roundedGrandTotal,
    lines,
    hsnSummary: Array.from(hsnMap.values()),
  };
}
