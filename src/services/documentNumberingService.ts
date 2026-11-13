// Gapless Document Numbering Generator & GST 16-Character Compliance Guard

export type DocumentType =
  | 'quotation'
  | 'invoice'
  | 'credit_note'
  | 'debit_note'
  | 'receipt'
  | 'refund'
  | 'supplier_bill'
  | 'payment_voucher';

export interface DocumentNumberingConfig {
  companyProfileId: string;
  docType: DocumentType;
  fiscalYear: string; // e.g. "2026-27"
  prefix: string; // e.g. "TZM/26-27/"
  currentNumber: number;
  paddingLength: number; // e.g. 4 -> "0001"
}

/**
 * Returns current Indian Financial Year string (e.g. "26-27" or "2026-2027")
 */
export function getCurrentFiscalYear(date: Date = new Date(), startMonth: number = 4): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const fyStart = month >= startMonth ? year : year - 1;
  const fyEnd = fyStart + 1;
  const shortStart = String(fyStart).slice(-2);
  const shortEnd = String(fyEnd).slice(-2);
  return `${shortStart}-${shortEnd}`;
}

/**
 * Generates next sequential document number and checks GST 16-character limit rule
 */
export function generateDocumentNumber(
  prefix: string,
  sequenceNumber: number,
  paddingLength: number = 4
): { documentNumber: string; isGstCompliant: boolean; length: number; warning?: string } {
  const seqStr = String(sequenceNumber).padStart(paddingLength, '0');
  const docNo = `${prefix}${seqStr}`.trim();
  const len = docNo.length;
  const isGstCompliant = len <= 16;

  let warning: string | undefined;
  if (!isGstCompliant) {
    warning = `Invoice number "${docNo}" has ${len} characters. Indian GST Rule 46(b) mandates invoice numbers must not exceed 16 characters.`;
  }

  return {
    documentNumber: docNo,
    isGstCompliant,
    length: len,
    warning,
  };
}
