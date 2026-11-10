/**
 * Utility functions for currency, date formatting, and business calculations
 * Aligned with Sales Module conventions
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

// Generate unique sequential reference IDs (e.g. SR-2026-084)
export function generateReference(prefix) {
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `${prefix}-2026-${randomNum}`;
}
