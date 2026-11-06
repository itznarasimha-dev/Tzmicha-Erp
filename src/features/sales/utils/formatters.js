/**
 * Utility functions for currency, date formatting, and business calculations
 */

// Format Indian Rupee currency (e.g. ₹1,25,000 or ₹45,500.00)
export function formatINR(amount, includeDecimals = false) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  const num = Number(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: includeDecimals ? 2 : 0,
    minimumFractionDigits: includeDecimals ? 2 : 0,
  }).format(num);
}

export const formatCurrency = formatINR;

// Format numbers with Indian comma format (e.g. 1,25,000)
export function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
}

// Format readable dates (e.g. "21 Oct 2026" or "Today, 14:30")
export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

// Calculate days difference (e.g. for overdue calculation)
export function getDaysDifference(targetDate) {
  if (!targetDate) return 0;
  const target = new Date(targetDate);
  const now = new Date('2026-10-21'); // Consistent base date matching simulation
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Calculate line item subtotal, discount, tax, and total
export function calculateLineTotals(unitPrice, quantity, discountPercent = 0, taxRate = 18) {
  const baseAmount = Number(unitPrice || 0) * Number(quantity || 0);
  const discountAmount = (baseAmount * Number(discountPercent || 0)) / 100;
  const taxableAmount = Math.max(0, baseAmount - discountAmount);
  const taxAmount = (taxableAmount * Number(taxRate || 0)) / 100;
  const lineTotal = taxableAmount + taxAmount;

  return {
    baseAmount,
    discountAmount,
    taxableAmount,
    taxAmount,
    lineTotal,
  };
}

// Generate unique sequential reference IDs (e.g. QT-2026-084)
// Deterministic sequential numbering without random generation to prevent duplicates
export function generateReference(prefix, existingList = []) {
  const year = '2026';
  let maxSeq = 0;

  if (Array.isArray(existingList) && existingList.length > 0) {
    existingList.forEach((item) => {
      const code = item.id || item.quotationNo || item.orderNo || item.invoiceNo || item.receiptNo || item.dispatchNo || item.returnNo || item.claimNo || '';
      const match = code.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });
  }

  const nextSeq = maxSeq > 0 ? maxSeq + 1 : 101;
  const seqString = String(nextSeq).padStart(3, '0');
  return `${prefix}-${year}-${seqString}`;
}

/**
 * Generate a consistent product code following:
 * Format: YYYY-MM-MODEL-XXXX (Year, Month, Model, Unique Product ID)
 * Never generates random or duplicate identifiers.
 */
export function generateProductCode(model = 'MDL', existingProducts = [], dateStr = '2026-10-21') {
  const date = new Date(dateStr);
  const year = isNaN(date.getFullYear()) ? '2026' : String(date.getFullYear());
  const month = isNaN(date.getMonth()) ? '10' : String(date.getMonth() + 1).padStart(2, '0');
  const cleanModel = (model || 'MDL').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(4, 'X');

  let maxId = 100;
  if (Array.isArray(existingProducts)) {
    existingProducts.forEach((p) => {
      const pCode = p.code || p.id || '';
      const parts = pCode.split('-');
      if (parts.length >= 4) {
        const num = parseInt(parts[3], 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    });
  }

  const nextId = String(maxId + 1).padStart(4, '0');
  return `${year}-${month}-${cleanModel}-${nextId}`;
}

/**
 * Generate WhatsApp direct chat link using the contact's valid phone number.
 * Formats: +91 98220 14592 -> https://wa.me/919822014592
 */
export function getWhatsAppUrl(phone, defaultMessage = '') {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;

  // If standard 10 digit Indian mobile number, add 91 country code
  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  const encodedMsg = defaultMessage ? `?text=${encodeURIComponent(defaultMessage)}` : '';
  return `https://wa.me/${digits}${encodedMsg}`;
}
