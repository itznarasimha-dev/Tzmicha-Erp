// Comprehensive Indian Currency, Number to Words, and GST formatting helpers

/**
 * Format a number into Indian Rupees standard notation (e.g. 1,23,456.00)
 */
export function formatINR(amount: number | null | undefined, showSymbol: boolean = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? '₹0.00' : '0.00';
  }

  // Round half up to 2 decimal places
  const rounded = Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
  const parts = rounded.toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian numbering format: 3 digits at the right, then groups of 2
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  const result = `${formattedInteger}.${decimalPart}`;
  return showSymbol ? `₹${result}` : result;
}

/**
 * Convert any monetary number into Indian Currency Words (e.g. "Rupees One Lakh Twenty-Three Thousand Only")
 */
export function numberToIndianWords(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num) || num <= 0) {
    return 'Rupees Zero Only';
  }

  const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
  const parts = rounded.toFixed(2).split('.');
  const rupees = parseInt(parts[0], 10);
  const paise = parseInt(parts[1], 10);

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const twoDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tensMultiple = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n === 0) return '';
    if (n < 10) return singleDigits[n];
    if (n >= 10 && n < 20) return twoDigits[n - 10];
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return `${tensMultiple[tens]} ${singleDigits[ones]}`.trim();
  }

  function convertThreeDigits(n: number): string {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundreds > 0) {
      res += `${singleDigits[hundreds]} Hundred `;
    }
    if (rest > 0) {
      if (hundreds > 0) res += 'and ';
      res += convertTwoDigits(rest);
    }
    return res.trim();
  }

  // Indian scales: Crores (10^7), Lakhs (10^5), Thousands (10^3), Remainder
  let remaining = rupees;
  const crores = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  const lakhs = Math.floor(remaining / 100000);
  remaining %= 100000;
  const thousands = Math.floor(remaining / 1000);
  remaining %= 1000;

  const wordChunks: string[] = [];

  if (crores > 0) {
    wordChunks.push(`${convertTwoDigits(crores)} Crore`);
  }
  if (lakhs > 0) {
    wordChunks.push(`${convertTwoDigits(lakhs)} Lakh`);
  }
  if (thousands > 0) {
    wordChunks.push(`${convertTwoDigits(thousands)} Thousand`);
  }
  if (remaining > 0) {
    wordChunks.push(convertThreeDigits(remaining));
  }

  let words = wordChunks.join(' ').trim();
  if (!words) words = 'Zero';

  let finalWords = `Rupees ${words}`;
  if (paise > 0) {
    finalWords += ` and ${convertTwoDigits(paise)} Paise`;
  }
  finalWords += ' Only';

  return finalWords;
}

/**
 * Mask a bank account number showing only the last 4 digits (e.g. "•••• •••• 9921")
 */
export function maskAccountNumber(accNo: string | null | undefined): string {
  if (!accNo) return '••••';
  const clean = accNo.replace(/\s+/g, '');
  if (clean.length <= 4) return clean;
  const lastFour = clean.slice(-4);
  return `•••• •••• ${lastFour}`;
}
