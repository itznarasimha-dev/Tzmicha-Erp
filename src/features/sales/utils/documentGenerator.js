import { formatINR, formatDate } from './formatters.js';
import { DEFAULT_COMPANY_CONFIG } from '../data/mockData.js';

/**
 * Convert numerical monetary amount into Indian English Words (Rupees and Paise)
 * e.g., 131157 -> "One Lakh Thirty-One Thousand One Hundred Fifty-Seven Rupees Only"
 */
export function numberToIndianWords(num) {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const n = Math.floor(Math.abs(Number(num)));
  if (n === 0) return 'Zero Rupees Only';

  const units = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (val) => {
    if (val < 20) return units[val];
    const t = Math.floor(val / 10);
    const u = val % 10;
    return `${tens[t]}${u > 0 ? '-' + units[u] : ''}`;
  };

  const convertThreeDigits = (val) => {
    const h = Math.floor(val / 100);
    const rem = val % 100;
    let res = '';
    if (h > 0) res += `${units[h]} Hundred`;
    if (rem > 0) res += `${h > 0 ? ' ' : ''}${convertTwoDigits(rem)}`;
    return res;
  };

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remainder = n % 1000;

  let words = '';
  if (crore > 0) words += `${convertTwoDigits(crore)} Crore `;
  if (lakh > 0) words += `${convertTwoDigits(lakh)} Lakh `;
  if (thousand > 0) words += `${convertTwoDigits(thousand)} Thousand `;
  if (remainder > 0) words += convertThreeDigits(remainder);

  return `${words.trim()} Rupees Only`;
}

/**
 * Open a styled, print-ready HTML document in a new window/tab for the user to view or print/save as PDF.
 */
function openPrintWindow(title, htmlContent) {
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    alert('Please allow popups to download or print documents.');
    return;
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          background: #f8fafc;
          padding: 40px;
          line-height: 1.5;
        }
        .doc-card {
          max-width: 800px;
          margin: 0 auto;
          background: #ffffff;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
        }
        .doc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 24px;
        }
        .company-title {
          font-size: 24px;
          font-weight: 800;
          color: #1e293b;
        }
        .company-subtitle {
          font-size: 13px;
          color: #64748b;
          margin-top: 4px;
        }
        .doc-meta {
          text-align: right;
        }
        .doc-badge {
          display: inline-block;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 4px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .badge-paid { background: #dcfce7; color: #166534; }
        .badge-quote { background: #e0f2fe; color: #0369a1; }
        .badge-receipt { background: #fef3c7; color: #92400e; }
        .doc-number {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
        }
        .doc-date {
          font-size: 13px;
          color: #64748b;
          margin-top: 4px;
        }
        .parties-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 6px;
          border: 1px solid #f1f5f9;
        }
        .party-box h4 {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          margin-bottom: 6px;
        }
        .party-name {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }
        .party-details {
          font-size: 13px;
          color: #475569;
          margin-top: 4px;
        }
        table.items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        table.items-table th {
          background: #f1f5f9;
          color: #475569;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid #cbd5e1;
        }
        table.items-table td {
          padding: 12px;
          font-size: 13px;
          border-bottom: 1px solid #e2e8f0;
          color: #1e293b;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 24px;
        }
        .totals-box {
          width: 320px;
          background: #f8fafc;
          padding: 16px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #475569;
          margin-bottom: 6px;
        }
        .totals-row.grand-total {
          border-top: 2px solid #cbd5e1;
          padding-top: 8px;
          margin-top: 8px;
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
        }
        .doc-footer {
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #94a3b8;
        }
        .action-bar {
          max-width: 800px;
          margin: 0 auto 16px auto;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .btn-print {
          background: #2563eb;
          color: white;
          border: none;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
        }
        .btn-print:hover { background: #1d4ed8; }
        @media print {
          body { background: white; padding: 0; }
          .action-bar { display: none; }
          .doc-card { box-shadow: none; border: none; padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="action-bar">
        <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
      </div>
      <div class="doc-card">
        ${htmlContent}
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(fullHtml);
  printWindow.document.close();
}

/**
 * Generates an actual, valid PDF-1.4 binary string for commercial quotations
 */
export function generateQuotationPDFBinary(quote) {
  const sanitize = (str) => String(str || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  
  const stream = [];
  const addText = (text, x, y, size = 10, isBold = false, color = [0.1, 0.15, 0.25]) => {
    stream.push(`${color[0]} ${color[1]} ${color[2]} rg`);
    stream.push(`BT /F${isBold ? 2 : 1} ${size} Tf ${x} ${y} Td (${sanitize(text)}) Tj ET`);
  };

  const addLine = (x1, y1, x2, y2, color = [0.8, 0.85, 0.9], width = 1) => {
    stream.push(`${color[0]} ${color[1]} ${color[2]} RG`);
    stream.push(`${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  };

  const addRect = (x, y, w, h, fillColor = [0.95, 0.97, 1.0], strokeColor = [0.8, 0.85, 0.9]) => {
    stream.push(`${fillColor[0]} ${fillColor[1]} ${fillColor[2]} rg`);
    stream.push(`${strokeColor[0]} ${strokeColor[1]} ${strokeColor[2]} RG`);
    stream.push(`1 w ${x} ${y} ${w} ${h} re B`);
  };

  // Page dimensions: A4 (595.28 x 841.89 pt)
  // 1. Header Banner - ApexERP Corporate Branding
  addRect(40, 750, 515, 60, [0.1, 0.25, 0.5], [0.1, 0.25, 0.5]);
  addText('ApexERP Industrial Solutions Pvt. Ltd.', 55, 792, 14, true, [1, 1, 1]);
  addText('MIDC Bhosari Industrial Area, Pune, Maharashtra 411026 | GSTIN: 27AAACA9012K1Z4 | CIN: U29299PN2018PTC174820', 55, 778, 7.5, false, [0.85, 0.92, 1]);
  addText('Official Sales & Distribution Division | Phone: +91 20 6712 4000 | Email: sales@apexerpsolutions.demo', 55, 764, 7.5, false, [0.85, 0.92, 1]);
  addText('QUOTATION', 440, 785, 13, true, [1, 1, 1]);

  // 2. Quotation & Customer ID Meta Box
  addRect(40, 680, 515, 60, [0.98, 0.99, 1], [0.85, 0.9, 0.95]);
  addText(`Quotation No: ${quote.quotationNo}`, 55, 722, 11, true, [0.1, 0.2, 0.4]);
  addText(`Customer ID: ${quote.customerDisplayId || quote.customerId || 'CUS-000001'}`, 55, 704, 11, true, [0.15, 0.4, 0.8]);
  addText(`Payment Terms: ${quote.paymentTerms || '50% Advance, Balance Before Dispatch'}`, 55, 688, 8.5, false, [0.3, 0.35, 0.4]);
  addText(`Date: ${formatDate(quote.createdDate)}`, 360, 722, 10, false, [0.3, 0.35, 0.4]);
  addText(`Valid Until: ${formatDate(quote.validUntil)} (15 Days)`, 360, 704, 10, true, [0.8, 0.2, 0.2]);
  addText(`Delivery Terms: ${quote.deliveryTerms || 'Ex-Works Pune Central Plant (7-10 Days)'}`, 360, 688, 8.5, false, [0.3, 0.35, 0.4]);

  // 3. Customer Bill To Box
  addRect(40, 600, 515, 70, [0.96, 0.98, 1], [0.85, 0.9, 0.95]);
  addText('CUSTOMER BILL TO & SHIP TO:', 55, 654, 8.5, true, [0.1, 0.25, 0.5]);
  addText(`Company: ${quote.customerName}`, 55, 640, 10, true, [0.1, 0.1, 0.1]);
  addText(`Contact Person: ${quote.contactPerson || 'Procurement Lead'}  |  Phone: ${quote.customerPhone || 'N/A'}  |  Email: ${quote.customerEmail || 'N/A'}`, 55, 626, 8, false, [0.3, 0.3, 0.3]);
  addText(`Billing Address: ${quote.customerAddress || 'Client Site / Works'}  |  GSTIN: ${quote.customerGstin || 'Unregistered'}`, 55, 612, 8, false, [0.3, 0.3, 0.3]);

  // 4. Product Table Header
  let currentY = 570;
  addRect(40, currentY, 515, 20, [0.9, 0.93, 0.98], [0.8, 0.85, 0.9]);
  addText('#', 48, currentY + 6, 8, true, [0.2, 0.3, 0.4]);
  addText('Product Description & SKU', 65, currentY + 6, 8, true, [0.2, 0.3, 0.4]);
  addText('Qty', 260, currentY + 6, 8, true, [0.2, 0.3, 0.4]);
  addText('Rate (INR)', 310, currentY + 6, 8, true, [0.2, 0.3, 0.4]);
  addText('Disc %', 380, currentY + 6, 8, true, [0.2, 0.3, 0.4]);
  addText('GST %', 430, currentY + 6, 8, true, [0.2, 0.3, 0.4]);
  addText('Total (INR)', 485, currentY + 6, 8, true, [0.2, 0.3, 0.4]);

  // Table rows
  (quote.items || []).forEach((it, idx) => {
    currentY -= 20;
    addLine(40, currentY, 555, currentY, [0.9, 0.9, 0.9], 0.5);
    addText(String(idx + 1), 48, currentY + 5, 7.5, false);
    addText(it.productName || 'Product Line Item', 65, currentY + 5, 8, true);
    addText(`${it.qty} ${it.uom || 'Nos'}`, 260, currentY + 5, 8, false);
    addText(Number(it.unitPrice || 0).toLocaleString('en-IN'), 310, currentY + 5, 8, false);
    addText(`${it.discountPercent || 0}%`, 380, currentY + 5, 8, false);
    addText(`${it.taxRate || 18}%`, 430, currentY + 5, 8, false);
    addText(Number(it.lineTotal || 0).toLocaleString('en-IN'), 485, currentY + 5, 8, true);
  });

  // 5. Financial Summary & Amount in Words
  currentY -= 40;
  const taxableVal = (quote.subtotal || 0) - (quote.discountTotal || 0);
  const advanceReq = Math.round((quote.grandTotal || 0) * 0.5);
  const words = numberToIndianWords(quote.grandTotal || 0);

  // Left Box: Amount in Words & Advance
  addRect(40, currentY - 50, 260, 68, [0.98, 0.99, 1], [0.85, 0.9, 0.95]);
  addText('AMOUNT IN WORDS:', 48, currentY + 8, 7.5, true, [0.1, 0.25, 0.5]);
  addText(words.length > 55 ? words.substring(0, 55) + '...' : words, 48, currentY - 5, 7.5, true, [0.1, 0.2, 0.4]);
  addLine(45, currentY - 12, 295, currentY - 12, [0.85, 0.9, 0.95], 0.5);
  addText(`Standard 50% Advance Required: INR ${advanceReq.toLocaleString('en-IN')}`, 48, currentY - 26, 7.5, true, [0.1, 0.5, 0.2]);
  addText(`Balance Payable Prior to Dispatch: INR ${Number((quote.grandTotal || 0) - advanceReq).toLocaleString('en-IN')}`, 48, currentY - 40, 7.5, false, [0.3, 0.35, 0.4]);

  // Right Box: Totals Breakdown
  addRect(310, currentY - 50, 245, 68, [0.97, 0.98, 1], [0.85, 0.9, 0.95]);
  addText(`Subtotal: INR ${Number(quote.subtotal || 0).toLocaleString('en-IN')}`, 320, currentY + 8, 8, false);
  addText(`Discount Total: - INR ${Number(quote.discountTotal || 0).toLocaleString('en-IN')}`, 320, currentY - 4, 8, false, [0.1, 0.6, 0.2]);
  addText(`Applicable GST: + INR ${Number(quote.taxTotal || 0).toLocaleString('en-IN')}`, 320, currentY - 16, 8, false);
  addLine(315, currentY - 22, 550, currentY - 22, [0.7, 0.75, 0.8], 1);
  addText(`Grand Total: INR ${Number(quote.grandTotal || 0).toLocaleString('en-IN')}`, 320, currentY - 38, 10, true, [0.1, 0.2, 0.5]);

  // 6. Dedicated ApexERP Company Bank Details (for receiving payment)
  currentY -= 75;
  addRect(40, currentY - 25, 515, 42, [0.95, 0.99, 0.96], [0.75, 0.9, 0.8]);
  addText('APEXERP COMPANY BANK DETAILS (REMIT PAYMENT TO):', 48, currentY + 8, 8, true, [0.1, 0.45, 0.2]);
  addText('Beneficiary: ApexERP Industrial Solutions Pvt. Ltd. | Bank: HDFC Bank Ltd. (Bhosari Branch, Pune)', 48, currentY - 5, 7.5, false, [0.1, 0.15, 0.2]);
  addText('Account No: 50200034891278 (Current) | IFSC: HDFC0001842 | Official UPI: apexerpsolutions@hdfcbank', 48, currentY - 18, 7.5, true, [0.1, 0.25, 0.5]);

  // 7. Commercial Terms Clause Reference
  currentY -= 48;
  addRect(40, currentY - 25, 515, 38, [0.99, 0.99, 0.99], [0.9, 0.9, 0.9]);
  addText('COMMERCIAL TERMS & SALE CONDITIONS:', 48, currentY + 5, 7.5, true, [0.3, 0.3, 0.3]);
  addText('15 Standard Company Terms apply: Validity 15 days; 50% advance upon confirmation; 12-month standard warranty;', 48, currentY - 7, 7, false, [0.4, 0.4, 0.4]);
  addText('Jurisdiction Pune, Maharashtra. Detailed clauses available on customer portal and snapshot quotation archive.', 48, currentY - 19, 7, false, [0.4, 0.4, 0.4]);

  // 8. Dual Authorization Signatures
  currentY -= 45;
  addLine(40, currentY + 5, 240, currentY + 5, [0.6, 0.65, 0.7], 0.8);
  addText(`Prepared By: ${quote.salesOwner || quote.createdByName || 'Sales Staff'}`, 40, currentY - 8, 7.5, true, [0.2, 0.2, 0.2]);
  addText(`Field Sales Division | ApexERP`, 40, currentY - 19, 7, false, [0.5, 0.5, 0.5]);

  addLine(350, currentY + 5, 555, currentY + 5, [0.6, 0.65, 0.7], 0.8);
  addText('For ApexERP Industrial Solutions Pvt. Ltd.', 350, currentY - 8, 7.5, true, [0.1, 0.25, 0.5]);
  addText('Ananya Roy (Head of Commercial Sales / Sales Manager)', 350, currentY - 19, 7, false, [0.2, 0.2, 0.2]);
  addText('Authorized Signatory — Commercial Sales Division', 350, currentY - 29, 6.5, true, [0.1, 0.4, 0.8]);

  // Footer
  addText('ApexERP Official Standard Quotation Document  |  Confidential Commercial Document', 140, 25, 7.5, false, [0.6, 0.6, 0.6]);

  const contentStream = stream.join('\n');
  const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  const streamLength = encoder ? encoder.encode(contentStream).length : Buffer.byteLength(contentStream, 'utf8');

  // Build PDF structure
  const objects = [];
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);
  objects.push(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n`);
  objects.push(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`);
  objects.push(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);
  objects.push(`6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`);

  let offset = 9; // "%PDF-1.4\n"
  const xref = ['xref\n0 7\n0000000000 65535 f \n'];
  let body = '%PDF-1.4\n';

  objects.forEach((obj) => {
    xref.push(String(offset).padStart(10, '0') + ' 00000 n \n');
    body += obj;
    offset += encoder ? encoder.encode(obj).length : Buffer.byteLength(obj, 'utf8');
  });

  const startxref = offset;
  const trailer = `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  return body + xref.join('') + trailer;
}

/**
 * Download or Print Formal Quotation Document
 * Supports both actual browser file download (.pdf) and print preview.
 */
export function downloadQuotationDocument(quote, options = false) {
  const isBypass = typeof options === 'boolean' ? options : Boolean(options.bypassSecurityCheck || options.isCoordinator || quote.status === 'Approved');
  const isPreviewOnly = typeof options === 'object' && Boolean(options.previewOnly);

  // If previewOnly is requested, open styled print window with complete formal sections
  if (isPreviewOnly) {
    const terms = quote.termsAndConditions || DEFAULT_COMPANY_CONFIG.defaultTerms;
    const bank = DEFAULT_COMPANY_CONFIG.bankDetails;
    const advanceReq = Math.round(Number(quote.grandTotal || 0) * 0.5);
    const amountWords = numberToIndianWords(quote.grandTotal || 0);

    const itemsHtml = (quote.items || [])
      .map(
        (item, idx) => {
          const itemSub = Number(item.unitPrice || 0) * Number(item.qty || 1);
          const discAmt = itemSub * (Number(item.discountPercent || 0) / 100);
          const taxable = itemSub - discAmt;
          const gstAmt = taxable * (Number(item.taxRate || 18) / 100);
          return `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td>
              <strong>${item.productName}</strong>
              <div style="font-size: 11px; color: #64748b;">SKU / Code: ${item.productId || 'N/A'}</div>
            </td>
            <td class="text-center">${item.qty} ${item.uom || 'Nos'}</td>
            <td class="text-right">${formatINR(item.unitPrice)}</td>
            <td class="text-center">${item.discountPercent || 0}%</td>
            <td class="text-right">${formatINR(taxable)}</td>
            <td class="text-center">${item.taxRate || 18}%</td>
            <td class="text-right"><strong>${formatINR(item.lineTotal || (taxable + gstAmt))}</strong></td>
          </tr>
        `;
        }
      )
      .join('');

    const termsHtml = terms
      .map((t) => `<li style="margin-bottom: 3px;"><strong>${t.title}:</strong> ${t.clause}</li>`)
      .join('');

    const html = `
      <div class="doc-header">
        <div>
          <div class="company-title">ApexERP Industrial Solutions Pvt. Ltd.</div>
          <div class="company-subtitle">Precision Manufacturing &amp; Wholesale Distribution</div>
          <div class="company-subtitle" style="font-size: 11px; color: #64748b; margin-top: 3px;">
            Plot 42, Sector 18, MIDC Bhosari Industrial Area, Pune, Maharashtra 411026
          </div>
          <div class="company-subtitle" style="font-size: 11px; color: #334155; margin-top: 3px;">
            <strong>GSTIN:</strong> 27AAACA9012K1Z4 | <strong>PAN:</strong> AAACA9012K | <strong>CIN:</strong> U29299PN2018PTC174820
          </div>
          <div class="company-subtitle" style="font-size: 11px; color: #64748b;">
            Phone: +91 20 6712 4000 | Email: sales@apexerpsolutions.demo | Web: www.apexerpsolutions.demo
          </div>
        </div>
        <div class="doc-meta">
          <span class="doc-badge badge-quote" style="font-size: 14px; padding: 6px 14px; letter-spacing: 0.05em;">QUOTATION</span>
          <div class="doc-number" style="font-family: monospace; font-size: 18px; color: #0f172a; margin-top: 4px;">${quote.quotationNo}</div>
          <div class="doc-date">Date: <strong>${formatDate(quote.createdDate)}</strong></div>
          <div class="doc-date" style="color: #b91c1c;">Valid Until: <strong>${formatDate(quote.validUntil)}</strong> (15 Days)</div>
        </div>
      </div>

      <div class="parties-grid">
        <div class="party-box">
          <h4>Customer Bill To &amp; Ship To</h4>
          <div class="party-name">${quote.customerName}</div>
          <div class="party-details" style="color: #2563eb; font-weight: 700;">Customer ID: ${quote.customerDisplayId || quote.customerId || 'CUS-000001'}</div>
          <div class="party-details">Contact: ${quote.contactPerson || 'Procurement Lead'}</div>
          <div class="party-details">Phone: ${quote.customerPhone || 'N/A'} | Email: ${quote.customerEmail || 'N/A'}</div>
          <div class="party-details">Address: ${quote.customerAddress || 'Client Site / Works'}</div>
          <div class="party-details"><strong>GSTIN:</strong> ${quote.customerGstin || 'Unregistered / On File'}</div>
        </div>
        <div class="party-box">
          <h4>Commercial Terms &amp; Prepared By</h4>
          <div class="party-name">${quote.salesOwner || quote.createdByName || 'Sales Staff'}</div>
          <div class="party-details">Payment Terms: <strong>${quote.paymentTerms || '50% Advance, Balance Before Dispatch'}</strong></div>
          <div class="party-details">Delivery Terms: <strong>${quote.deliveryTerms || 'Ex-Works Pune Central Plant (7-10 Days)'}</strong></div>
          <div class="party-details">Quotation Status: <strong>${quote.status}</strong> ${quote.approvedBy ? `(Approved by ${quote.approvedBy})` : ''}</div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th class="text-center" style="width: 35px;">#</th>
            <th>Product / Description</th>
            <th class="text-center" style="width: 55px;">Qty</th>
            <th class="text-right" style="width: 90px;">Rate</th>
            <th class="text-center" style="width: 55px;">Disc</th>
            <th class="text-right" style="width: 90px;">Taxable</th>
            <th class="text-center" style="width: 65px;">GST</th>
            <th class="text-right" style="width: 105px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; margin-bottom: 24px;">
        <div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Amount in Words (INR):</div>
            <strong style="font-size: 13px; color: #1e40af; line-height: 1.4;">${amountWords}</strong>
          </div>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 12px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Standard Advance Required (50%):</span>
              <strong style="color: #1e40af;">${formatINR(advanceReq)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 4px; font-weight: 700;">
              <span>Balance Payable Prior to Dispatch:</span>
              <span>${formatINR((quote.grandTotal || 0) - advanceReq)}</span>
            </div>
          </div>
        </div>

        <div class="totals-box" style="margin: 0; max-width: 100%;">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>${formatINR(quote.subtotal)}</span>
          </div>
          <div class="totals-row">
            <span>Discount Total:</span>
            <span style="color: #16a34a;">-${formatINR(quote.discountTotal || 0)}</span>
          </div>
          <div class="totals-row">
            <span>Applicable GST:</span>
            <span>+${formatINR(quote.taxTotal || 0)}</span>
          </div>
          <div class="totals-row grand-total">
            <span>Quotation Total:</span>
            <span>${formatINR(quote.grandTotal)}</span>
          </div>
        </div>
      </div>

      <!-- Dedicated ApexERP Company Bank Details -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 14px; margin-bottom: 20px;">
        <strong style="font-size: 12px; color: #166534; text-transform: uppercase; letter-spacing: 0.04em; display: block; margin-bottom: 8px;">
          ApexERP Company Bank Details (Remit Payment To)
        </strong>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 12px;">
          <div><span style="color: #15803d;">Beneficiary:</span> <strong>${bank.accountHolderName}</strong></div>
          <div><span style="color: #15803d;">Bank &amp; Branch:</span> <strong>${bank.bankName} (${bank.branch})</strong></div>
          <div><span style="color: #15803d;">A/C Number:</span> <strong style="font-family: monospace;">${bank.accountNumber}</strong></div>
          <div><span style="color: #15803d;">IFSC Code:</span> <strong style="font-family: monospace;">${bank.ifscCode}</strong></div>
          <div><span style="color: #15803d;">Collection UPI:</span> <strong>${bank.upiId}</strong></div>
        </div>
      </div>

      <!-- 15 Editable Terms & Conditions clauses -->
      <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 24px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 6px;">
          Commercial Terms &amp; Conditions of Sale
        </div>
        <ol style="padding-left: 18px; margin: 0; font-size: 11px; color: #475569; line-height: 1.45;">
          ${termsHtml}
        </ol>
      </div>

      <!-- Signatures -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; border-top: 1px solid #cbd5e1; padding-top: 24px; margin-top: 16px;">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 30px;">
            Prepared &amp; Submitted By:
          </div>
          <div style="border-top: 1px solid #94a3b8; padding-top: 6px; width: 220px;">
            <strong style="color: #0f172a; display: block;">${quote.salesOwner || quote.createdByName || 'Sales Staff'}</strong>
            <span style="font-size: 11px; color: #64748b;">Commercial Sales Division • ApexERP</span>
          </div>
        </div>

        <div style="text-align: right; display: flex; flexDirection: column; align-items: flex-end;">
          <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 30px;">
            For ApexERP Industrial Solutions Pvt. Ltd.:
          </div>
          <div style="border-top: 1px solid #94a3b8; padding-top: 6px; width: 260px; text-align: right;">
            <strong style="color: #0f172a; display: block;">Ananya Roy</strong>
            <span style="font-size: 11px; color: #64748b; display: block;">Head of Commercial Sales / Sales Manager</span>
            <span style="font-size: 10px; color: #1e40af; font-weight: 600;">Authorized Signatory</span>
          </div>
        </div>
      </div>

      <div class="doc-footer" style="margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: center;">
        <div>This is a computer-generated official quotation document issued via ApexERP Commercial System.</div>
      </div>
    `;

    openPrintWindow(`Quotation_${quote.quotationNo}`, html);
    return true;
  }

  // Trigger actual file download (.pdf)
  try {
    const pdfData = generateQuotationPDFBinary(quote);
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([pdfData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quote.quotationNo}_Commercial_Quotation.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return true;
    }
    return true;
  } catch (err) {
    throw new Error(`Failed to generate and download PDF: ${err.message}`);
  }
}

/**
 * Generates an actual, valid PDF-1.4 binary string for formal commercial Tax Invoices
 */
export function generateInvoicePDFBinary(invoice, customer = {}, order = {}) {
  const sanitize = (str) => String(str || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const stream = [];
  const addText = (text, x, y, size = 10, isBold = false, color = [0.1, 0.15, 0.25]) => {
    stream.push(`${color[0]} ${color[1]} ${color[2]} rg`);
    stream.push(`BT /F${isBold ? 2 : 1} ${size} Tf ${x} ${y} Td (${sanitize(text)}) Tj ET`);
  };

  const addLine = (x1, y1, x2, y2, color = [0.8, 0.85, 0.9], width = 1) => {
    stream.push(`${color[0]} ${color[1]} ${color[2]} RG`);
    stream.push(`${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  };

  const addRect = (x, y, w, h, fillColor = [0.95, 0.97, 1.0], strokeColor = [0.8, 0.85, 0.9]) => {
    stream.push(`${fillColor[0]} ${fillColor[1]} ${fillColor[2]} rg`);
    stream.push(`${strokeColor[0]} ${strokeColor[1]} ${strokeColor[2]} RG`);
    stream.push(`1 w ${x} ${y} ${w} ${h} re B`);
  };

  const totalAmount = Number(invoice.totalAmount || 0);
  const paidAmount = Number(invoice.paidAmount || 0);
  const balance = Number(invoice.balance !== undefined ? invoice.balance : Math.max(0, totalAmount - paidAmount));
  const isPaid = balance <= 0 || invoice.status === 'Paid';
  const advanceReq = Math.round(totalAmount * 0.5);
  const words = numberToIndianWords(totalAmount);

  const items = (invoice.items && invoice.items.length > 0)
    ? invoice.items
    : (order.items && order.items.length > 0)
    ? order.items
    : [
        {
          productId: 'PROD-LOT',
          productName: `Commercial Industrial Supply (Per Sales Order ${invoice.orderNo || 'SO-2026'})`,
          qty: 1,
          uom: 'Lot',
          unitPrice: Math.round(totalAmount / 1.18),
          discountPercent: 0,
          taxRate: 18,
          lineTotal: totalAmount,
        },
      ];

  // Page dimensions: A4 (595.28 x 841.89 pt)
  // 1. Header Banner - ApexERP Corporate Branding
  addRect(40, 750, 515, 60, [0.1, 0.25, 0.5], [0.1, 0.25, 0.5]);
  addText('ApexERP Industrial Solutions Pvt. Ltd.', 55, 792, 14, true, [1, 1, 1]);
  addText('Plot 42, Sector 18, MIDC Bhosari Industrial Area, Pune, Maharashtra 411026 | GSTIN: 27AAACA9012K1Z4 | CIN: U29299PN2018PTC174820', 55, 778, 7, false, [0.85, 0.92, 1]);
  addText('Commercial Invoicing & Accounts Division | Phone: +91 20 6712 4000 | Email: billing@apexerpsolutions.demo', 55, 764, 7.5, false, [0.85, 0.92, 1]);
  addText(isPaid ? 'TAX INVOICE (PAID)' : 'TAX INVOICE', 420, 785, 12, true, [1, 1, 1]);

  // 2. Invoice & Customer ID Meta Box
  addRect(40, 680, 515, 60, [0.98, 0.99, 1], [0.85, 0.9, 0.95]);
  addText(`Invoice No: ${invoice.invoiceNo}`, 55, 722, 11, true, [0.1, 0.2, 0.4]);
  addText(`Customer ID: ${invoice.customerDisplayId || invoice.customerId || customer.customerId || customer.id || 'CUS-000001'}`, 55, 704, 11, true, [0.15, 0.4, 0.8]);
  addText(`Sales Order Ref: ${invoice.orderNo || 'SO-2026'}`, 55, 688, 8.5, false, [0.3, 0.35, 0.4]);
  addText(`Invoice Date: ${formatDate(invoice.invoiceDate)}`, 360, 722, 10, false, [0.3, 0.35, 0.4]);
  addText(`Due Date: ${formatDate(invoice.dueDate)}`, 360, 704, 10, true, isPaid ? [0.1, 0.5, 0.2] : [0.8, 0.2, 0.2]);
  addText(`Payment Status: ${invoice.status || (isPaid ? 'Paid' : 'Payment Due')}`, 360, 688, 8.5, true, isPaid ? [0.1, 0.5, 0.2] : [0.8, 0.2, 0.2]);

  // 3. Customer Bill To Box
  addRect(40, 600, 515, 70, [0.96, 0.98, 1], [0.85, 0.9, 0.95]);
  addText('CUSTOMER BILL TO & SHIP TO:', 55, 654, 8.5, true, [0.1, 0.25, 0.5]);
  addText(`Company: ${invoice.customerName}`, 55, 640, 10, true, [0.1, 0.1, 0.1]);
  addText(`Contact Person: ${customer.contactPerson || 'Finance / Procurement Lead'}  |  Phone: ${customer.phone || invoice.customerPhone || 'N/A'}  |  Email: ${customer.email || invoice.customerEmail || 'N/A'}`, 55, 626, 8, false, [0.3, 0.3, 0.3]);
  addText(`Billing Address: ${customer.address || invoice.customerAddress || customer.city || 'Commercial Industrial Premises'}  |  GSTIN: ${customer.gstin || invoice.customerGstin || '27AABCM8291F1Z8'}`, 55, 612, 8, false, [0.3, 0.3, 0.3]);

  // 4. Product Table Header
  let currentY = 570;
  addRect(40, currentY, 515, 20, [0.9, 0.93, 0.98], [0.8, 0.85, 0.9]);
  addText('#', 48, currentY + 6, 8, true, [0.2, 0.3, 0.4]);
  addText('Product Description & SKU', 65, currentY + 6, 8, true, [0.2, 0.3, 0.4]);
  addText('Qty', 260, currentY + 6, 8, true, [0.2, 0.3, 0.4]);
  addText('Rate (INR)', 310, currentY + 6, 8, true, [0.2, 0.3, 0.4]);
  addText('Disc %', 380, currentY + 6, 8, true, [0.2, 0.3, 0.4]);
  addText('GST %', 430, currentY + 6, 8, true, [0.2, 0.3, 0.4]);
  addText('Total (INR)', 485, currentY + 6, 8, true, [0.2, 0.3, 0.4]);

  // Table rows
  items.slice(0, 5).forEach((it, idx) => {
    currentY -= 20;
    addLine(40, currentY, 555, currentY, [0.9, 0.9, 0.9], 0.5);
    addText(String(idx + 1), 48, currentY + 5, 7.5, false);
    addText(it.productName || 'Industrial Supply Item', 65, currentY + 5, 8, true);
    addText(`${it.qty || it.orderedQty || 1} ${it.uom || 'Nos'}`, 260, currentY + 5, 8, false);
    addText(Number(it.unitPrice || 0).toLocaleString('en-IN'), 310, currentY + 5, 8, false);
    addText(`${it.discountPercent || 0}%`, 380, currentY + 5, 8, false);
    addText(`${it.taxRate || 18}%`, 430, currentY + 5, 8, false);
    addText(Number(it.lineTotal || 0).toLocaleString('en-IN'), 485, currentY + 5, 8, true);
  });

  // 5. Financial Summary & Amount in Words
  currentY -= 40;
  const taxableVal = Math.round(totalAmount / 1.18);
  const cgstVal = Math.round((totalAmount - taxableVal) / 2);
  const sgstVal = totalAmount - taxableVal - cgstVal;

  // Left Box: Amount in Words & Payment Reconciliation
  addRect(40, currentY - 50, 260, 68, [0.98, 0.99, 1], [0.85, 0.9, 0.95]);
  addText('INVOICE AMOUNT IN WORDS:', 48, currentY + 8, 7.5, true, [0.1, 0.25, 0.5]);
  addText(words.length > 55 ? words.substring(0, 55) + '...' : words, 48, currentY - 5, 7.5, true, [0.1, 0.2, 0.4]);
  addLine(45, currentY - 12, 295, currentY - 12, [0.85, 0.9, 0.95], 0.5);
  addText(`Advance Requirement (50%): INR ${advanceReq.toLocaleString('en-IN')}`, 48, currentY - 26, 7.5, true, [0.1, 0.4, 0.8]);
  addText(`Validated Paid: INR ${paidAmount.toLocaleString('en-IN')} | Balance Due: INR ${balance.toLocaleString('en-IN')}`, 48, currentY - 40, 7.5, true, balance > 0 ? [0.8, 0.2, 0.2] : [0.1, 0.5, 0.2]);

  // Right Box: Totals Breakdown
  addRect(310, currentY - 50, 245, 68, [0.97, 0.98, 1], [0.85, 0.9, 0.95]);
  addText(`Taxable Value: INR ${taxableVal.toLocaleString('en-IN')}`, 320, currentY + 8, 8, false);
  addText(`CGST (9%): + INR ${cgstVal.toLocaleString('en-IN')}`, 320, currentY - 4, 8, false);
  addText(`SGST (9%): + INR ${sgstVal.toLocaleString('en-IN')}`, 320, currentY - 16, 8, false);
  addLine(315, currentY - 22, 550, currentY - 22, [0.7, 0.75, 0.8], 1);
  addText(`Grand Total: INR ${totalAmount.toLocaleString('en-IN')}`, 320, currentY - 38, 10, true, [0.1, 0.2, 0.5]);

  // 6. Dedicated ApexERP Company Bank Details (for receiving payment)
  currentY -= 75;
  addRect(40, currentY - 25, 515, 42, [0.95, 0.99, 0.96], [0.75, 0.9, 0.8]);
  addText('APEXERP COMPANY BANK DETAILS (REMIT PAYMENT TO):', 48, currentY + 8, 8, true, [0.1, 0.45, 0.2]);
  addText('Beneficiary: ApexERP Industrial Solutions Pvt. Ltd. | Bank: HDFC Bank Ltd. (Bhosari Branch, Pune)', 48, currentY - 5, 7.5, false, [0.1, 0.15, 0.2]);
  addText('Account No: 50200034891278 (Current) | IFSC: HDFC0001842 | Official UPI: apexerpsolutions@hdfcbank', 48, currentY - 18, 7.5, true, [0.1, 0.25, 0.5]);

  // 7. Commercial Terms Clause Reference
  currentY -= 48;
  addRect(40, currentY - 25, 515, 38, [0.99, 0.99, 0.99], [0.9, 0.9, 0.9]);
  addText('COMMERCIAL TERMS & SALE CONDITIONS:', 48, currentY + 5, 7.5, true, [0.3, 0.3, 0.3]);
  addText('15 Standard Company Terms apply: Subject to Pune jurisdiction; Interest @18% p.a. chargeable on overdue accounts;', 48, currentY - 7, 7, false, [0.4, 0.4, 0.4]);
  addText('Goods once sold are covered under 12-month manufacturer warranty. ITC admissible under Section 31 CGST Act.', 48, currentY - 19, 7, false, [0.4, 0.4, 0.4]);

  // 8. Dual Authorization Signatures (Admin and Finance / Accountant)
  currentY -= 45;
  addLine(40, currentY + 5, 240, currentY + 5, [0.6, 0.65, 0.7], 0.8);
  addText('Authorized by Admin / Commercial Operations:', 40, currentY - 8, 7.5, true, [0.2, 0.2, 0.2]);
  addText('Ananya Roy (Head of Commercial Sales / Sales Manager)', 40, currentY - 19, 7, false, [0.4, 0.4, 0.4]);

  addLine(350, currentY + 5, 555, currentY + 5, [0.6, 0.65, 0.7], 0.8);
  addText('Authorized by Finance / Accountant:', 350, currentY - 8, 7.5, true, [0.1, 0.25, 0.5]);
  addText(`${invoice.approvedBy || 'Rajesh Singhania'} (${invoice.approvedRole || 'Accountant'})`, 350, currentY - 19, 7, false, [0.2, 0.2, 0.2]);
  addText('Verified Electronic Signatory — Finance Division', 350, currentY - 29, 6.5, true, [0.1, 0.4, 0.8]);

  // Assemble PDF Structure
  const content = stream.join('\n');
  const contentLength = content.length;

  const pdf = `%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 595.28 841.89]
  /Contents 4 0 R
  /Resources <<
    /Font <<
      /F1 <<
        /Type /Font
        /Subtype /Type1
        /BaseFont /Helvetica
      >>
      /F2 <<
        /Type /Font
        /Subtype /Type1
        /BaseFont /Helvetica-Bold
      >>
    >>
  >>
>>
endobj
4 0 obj
<<
  /Length ${contentLength}
>>
stream
${content}
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000350 00000 n 
trailer
<<
  /Size 5
  /Root 1 0 R
>>
startxref
${420 + contentLength}
%%EOF`;

  return pdf;
}

/**
 * Download or Print Tax Invoice Document (Accessible to all Sales roles for authorized invoices)
 */
export function downloadInvoiceDocument(invoice, customer = {}, order = {}, options = {}) {
  if (!invoice) return;

  const isPaid = (invoice.balance <= 0) || invoice.status === 'Paid';
  const totalAmount = Number(invoice.totalAmount || 0);
  const paidAmount = Number(invoice.paidAmount || 0);
  const balance = Number(invoice.balance !== undefined ? invoice.balance : Math.max(0, totalAmount - paidAmount));
  const advanceReq = Math.round(totalAmount * 0.5);
  const amountWords = numberToIndianWords(totalAmount);
  const bank = DEFAULT_COMPANY_CONFIG.bankDetails;
  const termsList = DEFAULT_COMPANY_CONFIG.defaultTerms;

  const items = (invoice.items && invoice.items.length > 0)
    ? invoice.items
    : (order.items && order.items.length > 0)
    ? order.items
    : [
        {
          productId: 'PROD-LOT',
          productName: `Commercial Industrial Supply (Per Sales Order ${invoice.orderNo || 'SO-2026'})`,
          qty: 1,
          uom: 'Lot',
          unitPrice: Math.round(totalAmount / 1.18),
          discountPercent: 0,
          taxRate: 18,
          lineTotal: totalAmount,
        },
      ];

  const itemsHtml = items
    .map(
      (item, idx) => `
    <tr>
      <td class="text-center">${idx + 1}</td>
      <td>
        <strong>${item.productName}</strong>
        <div style="font-size: 11px; color: #64748b;">SKU / ID: ${item.productId || 'N/A'}</div>
      </td>
      <td class="text-center">${item.orderedQty || item.qty} ${item.uom || 'Nos'}</td>
      <td class="text-right">${formatINR(item.unitPrice)}</td>
      <td class="text-center">${item.discountPercent || 0}%</td>
      <td class="text-center">${item.taxRate || 18}%</td>
      <td class="text-right"><strong>${formatINR(item.lineTotal)}</strong></td>
    </tr>
  `
    )
    .join('');

  const termsHtml = termsList.map((t) => `<li style="margin-bottom: 2px;">${t}</li>`).join('');

  if (options && options.previewOnly) {
    const html = `
      <div class="doc-header">
        <div>
          <div class="company-title">ApexERP Industrial Solutions Pvt. Ltd.</div>
          <div class="company-subtitle">Precision Manufacturing &amp; Wholesale Distribution</div>
          <div class="company-subtitle">Plot 42, Sector 18, MIDC Bhosari Industrial Area, Pune 411026</div>
          <div class="company-subtitle">GSTIN: 27AAACA9012K1Z4 | PAN: AAACA9012K | CIN: U29299PN2018PTC174820</div>
        </div>
        <div class="doc-meta">
          ${
            isPaid
              ? '<span class="doc-badge badge-paid">ORIGINAL TAX INVOICE (PAID)</span>'
              : '<span class="doc-badge" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;">TAX INVOICE — PAYMENT DUE</span>'
          }
          <div class="doc-number">${invoice.invoiceNo}</div>
          <div class="doc-date">Invoice Date: ${formatDate(invoice.invoiceDate)}</div>
          <div class="doc-date">Due Date: <strong>${formatDate(invoice.dueDate)}</strong></div>
          <div class="doc-date">Sales Order Ref: <strong>${invoice.orderNo || 'SO-2026'}</strong></div>
          <div class="doc-date">Customer ID: <strong style="color: #2563eb;">${invoice.customerDisplayId || invoice.customerId || customer.customerId || customer.id || 'CUS-000001'}</strong></div>
        </div>
      </div>

      <div class="parties-grid">
        <div class="party-box">
          <h4>Billed To &amp; Shipped To (Customer)</h4>
          <div class="party-name">${invoice.customerName}</div>
          <div class="party-details">Customer ID: <strong>${invoice.customerDisplayId || invoice.customerId || customer.customerId || customer.id || 'CUS-000001'}</strong></div>
          <div class="party-details">Contact Person: ${customer.contactPerson || 'Finance / Procurement Lead'}</div>
          <div class="party-details">GSTIN: ${customer.gstin || invoice.customerGstin || '27AABCM8291F1Z8'}</div>
          <div class="party-details">Address: ${customer.address || invoice.customerAddress || customer.city || 'Commercial Industrial Premises'}</div>
        </div>
        <div class="party-box">
          <h4>Accounting &amp; Settlement Details</h4>
          <div class="party-details">Payment Status: <strong style="color: ${isPaid ? '#166534' : '#b45309'};">${isPaid ? 'Fully Settled &amp; Verified' : (invoice.status || 'Payment Due')}</strong></div>
          <div class="party-details">Total Amount Invoiced: <strong>${formatINR(totalAmount)}</strong></div>
          <div class="party-details">Validated Amount Paid: <strong style="color: #166534;">${formatINR(paidAmount)}</strong></div>
          <div class="party-details">Outstanding Balance: <strong style="color: ${isPaid ? '#166534' : '#dc2626'};">${formatINR(balance)}</strong></div>
          <div class="party-details">Internal Approval: <strong style="color: #166534;">${invoice.approvalStatus || 'Approved'}</strong> (by ${invoice.approvedBy || 'Rajesh Singhania'})</div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th class="text-center" style="width: 35px;">#</th>
            <th>Product Description &amp; SKU</th>
            <th class="text-center" style="width: 60px;">Qty</th>
            <th class="text-right" style="width: 90px;">Unit Rate</th>
            <th class="text-center" style="width: 60px;">Disc %</th>
            <th class="text-center" style="width: 60px;">GST %</th>
            <th class="text-right" style="width: 110px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; margin-bottom: 24px;">
        <div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Amount in Words (INR):</div>
            <strong style="font-size: 13px; color: #1e40af; line-height: 1.4;">${amountWords}</strong>
          </div>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 12px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Standard Advance Requirement (50%):</span>
              <strong style="color: #1e40af;">${formatINR(advanceReq)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Validated Collections Received:</span>
              <strong style="color: #166534;">${formatINR(paidAmount)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 4px; font-weight: 700;">
              <span>Remaining Balance Payable:</span>
              <span style="color: ${balance > 0 ? '#dc2626' : '#166534'};">${formatINR(balance)}</span>
            </div>
          </div>
        </div>

        <div class="totals-box" style="margin: 0; max-width: 100%;">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>${formatINR(Math.round(totalAmount / 1.18))}</span>
          </div>
          <div class="totals-row">
            <span>CGST (9%):</span>
            <span>+${formatINR(invoice.taxBreakdown?.cgst || Math.round((totalAmount - totalAmount / 1.18) / 2))}</span>
          </div>
          <div class="totals-row">
            <span>SGST (9%):</span>
            <span>+${formatINR(invoice.taxBreakdown?.sgst || Math.round((totalAmount - totalAmount / 1.18) / 2))}</span>
          </div>
          <div class="totals-row grand-total">
            <span>Invoice Grand Total:</span>
            <span>${formatINR(totalAmount)}</span>
          </div>
        </div>
      </div>

      <!-- Dedicated ApexERP Company Bank Details -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 14px; margin-bottom: 20px;">
        <strong style="font-size: 12px; color: #166534; text-transform: uppercase; letter-spacing: 0.04em; display: block; margin-bottom: 8px;">
          ApexERP Company Bank Details (Remit Payment To)
        </strong>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 12px;">
          <div><span style="color: #15803d;">Beneficiary:</span> <strong>${bank.accountHolderName}</strong></div>
          <div><span style="color: #15803d;">Bank &amp; Branch:</span> <strong>${bank.bankName} (${bank.branch})</strong></div>
          <div><span style="color: #15803d;">A/C Number:</span> <strong style="font-family: monospace;">${bank.accountNumber}</strong></div>
          <div><span style="color: #15803d;">IFSC Code:</span> <strong style="font-family: monospace;">${bank.ifscCode}</strong></div>
          <div><span style="color: #15803d;">Collection UPI:</span> <strong>${bank.upiId}</strong></div>
        </div>
      </div>

      <!-- 15 Standard Commercial Terms & Conditions -->
      <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 24px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 6px;">
          Commercial Terms &amp; Conditions of Sale
        </div>
        <ol style="padding-left: 18px; margin: 0; font-size: 11px; color: #475569; line-height: 1.45;">
          ${termsHtml}
        </ol>
      </div>

      <!-- Signatures -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; border-top: 1px solid #cbd5e1; padding-top: 24px; margin-top: 16px;">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 30px;">
            Authorized by Admin / Commercial Operations:
          </div>
          <div style="border-top: 1px solid #94a3b8; padding-top: 6px; width: 220px;">
            <strong style="color: #0f172a; display: block;">Ananya Roy</strong>
            <span style="font-size: 11px; color: #64748b;">Head of Commercial Sales • ApexERP</span>
          </div>
        </div>

        <div style="text-align: right; display: flex; flexDirection: column; align-items: flex-end;">
          <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 30px;">
            Authorized by Finance / Accountant:
          </div>
          <div style="border-top: 1px solid #94a3b8; padding-top: 6px; width: 260px; text-align: right;">
            <strong style="color: #0f172a; display: block;">${invoice.approvedBy || 'Rajesh Singhania'}</strong>
            <span style="font-size: 11px; color: #64748b; display: block;">${invoice.approvedRole || 'Accountant'} • Finance Department</span>
            <span style="font-size: 10px; color: #166534; font-weight: 600;">✓ Verified Electronic Signatory</span>
          </div>
        </div>
      </div>

      <div class="doc-footer" style="margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: center;">
        <div>This is a computer-generated tax invoice issued via ApexERP Commercial System under Section 31 of CGST Act.</div>
      </div>
    `;

    openPrintWindow(`Tax_Invoice_${invoice.invoiceNo}`, html);
    return true;
  }

  // Trigger actual file download (.pdf)
  try {
    const pdfData = generateInvoicePDFBinary(invoice, customer, order);
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([pdfData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNo}_Tax_Invoice.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return true;
    }
    return true;
  } catch (err) {
    throw new Error(`Failed to generate and download Invoice PDF: ${err.message}`);
  }
}

/**
 * Download or Print Customer Payment Receipt
 */
export function downloadPaymentReceipt(payment, customer = {}, invoice = {}) {
  const html = `
    <div class="doc-header">
      <div>
        <div class="company-title">ApexERP Sales &amp; Distribution</div>
        <div class="company-subtitle">Customer Payment &amp; Receipt Acknowledgement</div>
        <div class="company-subtitle">GSTIN: 27AAACA9012K1Z4 | Accounts Department</div>
      </div>
      <div class="doc-meta">
        <span class="doc-badge badge-receipt">OFFICIAL RECEIPT</span>
        <div class="doc-number">${payment.receiptNo}</div>
        <div class="doc-date">Receipt Date: ${formatDate(payment.paymentDate)}</div>
      </div>
    </div>

    <div class="parties-grid">
      <div class="party-box">
        <h4>Received From (Customer)</h4>
        <div class="party-name">${payment.customerName}</div>
        <div class="party-details">Customer ID: ${payment.customerId}</div>
        <div class="party-details">${customer.city ? `City: ${customer.city}` : ''}</div>
      </div>
      <div class="party-box">
        <h4>Settlement Mode &amp; Reference</h4>
        <div class="party-details">Payment Method: <strong>${payment.method}</strong></div>
        <div class="party-details">Bank / UTR Reference: <strong>${payment.referenceNo}</strong></div>
        <div class="party-details">Settled Against Invoice: <strong>${payment.invoiceNo}</strong></div>
      </div>
    </div>

    <div style="margin: 30px 0; padding: 24px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; text-align: center;">
      <div style="font-size: 13px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em;">Amount Received</div>
      <div style="font-size: 32px; font-weight: 800; color: #166534; margin: 8px 0;">${formatINR(payment.amount)}</div>
      <div style="font-size: 13px; color: #475569;">Received with thanks against settlement of Tax Invoice <strong>${payment.invoiceNo}</strong>.</div>
    </div>

    ${invoice.totalAmount ? `
      <div style="margin-bottom: 24px; padding: 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Invoice Total:</span>
          <strong>${formatINR(invoice.totalAmount)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Total Payments Recorded to Date:</span>
          <strong style="color: #166534;">${formatINR(invoice.paidAmount)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px;">
          <span>Remaining Balance Due:</span>
          <strong style="color: ${invoice.balance > 0 ? '#dc2626' : '#166534'};">${formatINR(invoice.balance)}</strong>
        </div>
      </div>
    ` : ''}

    ${payment.notes ? `<div style="font-size: 13px; color: #64748b; margin-bottom: 20px;"><strong>Notes:</strong> ${payment.notes}</div>` : ''}

    <div class="doc-footer">
      <div>Electronic receipt generated by ApexERP. Subject to realization of cheque / payment clearance.</div>
      <div>Commercial Accounts Division</div>
    </div>
  `;

  openPrintWindow(`Receipt_${payment.receiptNo}`, html);
}
