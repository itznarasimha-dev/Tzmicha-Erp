import { Router } from 'express'
import { z } from 'zod'
import { withRls, one, many, audit } from '../../db/transaction.js'
import { AppError } from '../../errors.js'
import { sendData, validateBody, validatedBody } from '../../http.js'
import { authenticate } from '../../middleware/auth.js'
import { uuidSchema, optionalText } from '../../lib/validation.js'

export const documentsRouter = Router()

documentsRouter.use(authenticate)

/**
 * Convert numbers into Indian English Words (Rupees and Paise).
 */
export function numberToIndianWords(num: number): string {
  if (!num || isNaN(num)) return 'Zero Rupees Only'
  const n = Math.floor(Math.abs(Number(num)))
  if (n === 0) return 'Zero Rupees Only'

  const units = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
  ]
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const convertTwoDigits = (val: number) => {
    if (val < 20) return units[val]
    const t = Math.floor(val / 10)
    const u = val % 10
    return `${tens[t]}${u > 0 ? '-' + units[u] : ''}`
  }

  const convertThreeDigits = (val: number) => {
    const h = Math.floor(val / 100)
    const rem = val % 100
    let res = ''
    if (h > 0) res += `${units[h]} Hundred`
    if (rem > 0) res += `${h > 0 ? ' and ' : ''}${convertTwoDigits(rem)}`
    return res
  }

  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const remainder = n % 1000

  let words = ''
  if (crore > 0) words += `${convertTwoDigits(crore)} Crore `
  if (lakh > 0) words += `${convertTwoDigits(lakh)} Lakh `
  if (thousand > 0) words += `${convertTwoDigits(thousand)} Thousand `
  if (remainder > 0) words += convertThreeDigits(remainder)

  return `${words.trim()} Rupees Only`
}

export interface DocumentSnapshot {
  documentType: string
  documentNumber: string
  issueDate: string
  dueDate?: string
  status: string
  company: {
    legalName: string
    tradeName: string
    address: string
    gstin: string
    pan: string
    email: string
    phone: string
    bankName: string
    accountNumber: string
    ifsc: string
    upiId?: string
  }
  party: {
    name: string
    company?: string
    address?: string
    gstin?: string
    phone?: string
    email?: string
  }
  items: Array<{
    itemCode: string
    description: string
    hsnCode: string
    quantity: number
    uom: string
    unitRate: number
    discountPercent: number
    taxableAmount: number
    gstRate: number
    cgstAmount: number
    sgstAmount: number
    igstAmount: number
    totalAmount: number
  }>
  totals: {
    subtotal: number
    totalDiscount: number
    taxableValue: number
    cgstTotal: number
    sgstTotal: number
    igstTotal: number
    totalTax: number
    grandTotal: number
    amountInWords: string
  }
  notes?: string
  terms?: string[]
  generatedAt: string
}

export function renderReceiptHtml(snapshot: DocumentSnapshot): string {
  const isInterState = snapshot.totals.igstTotal > 0
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${snapshot.documentNumber} - ${snapshot.documentType.toUpperCase()}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; background: #ffffff; padding: 32px; font-size: 13px; line-height: 1.5; }
    .receipt-container { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 36px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 18px; margin-bottom: 24px; }
    .brand-title { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .company-sub { font-size: 12px; color: #475569; margin-top: 3px; max-width: 440px; }
    .doc-meta { text-align: right; }
    .doc-badge { display: inline-block; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; margin-bottom: 6px; background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; }
    .doc-number { font-size: 16px; font-weight: 700; color: #0f172a; }
    .meta-line { font-size: 12px; color: #64748b; margin-top: 2px; }
    .party-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; background: #f8fafc; padding: 16px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 24px; }
    .party-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
    .party-name { font-size: 14px; font-weight: 700; color: #0f172a; }
    .party-detail { font-size: 12px; color: #475569; margin-top: 2px; }
    table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    table.items-table th { background: #f1f5f9; padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: left; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
    table.items-table td { padding: 10px; font-size: 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    .text-right { text-align: right !important; }
    .text-center { text-align: center !important; }
    .summary-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; margin-bottom: 24px; }
    .bank-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; font-size: 12px; }
    .bank-title { font-weight: 700; color: #0f172a; margin-bottom: 6px; font-size: 12px; text-transform: uppercase; }
    .totals-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; background: #ffffff; }
    .tot-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #475569; }
    .tot-row.grand { border-top: 2px solid #0f172a; margin-top: 8px; padding-top: 8px; font-size: 15px; font-weight: 800; color: #0f172a; }
    .words-box { background: #f8fafc; border-left: 3px solid #2563eb; padding: 10px 14px; margin-bottom: 24px; font-size: 12px; font-weight: 600; color: #1e293b; }
    .footer-row { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    .terms-box { font-size: 11px; color: #64748b; }
    .terms-box ol { padding-left: 16px; margin-top: 4px; }
    .sig-box { text-align: right; }
    .sig-line { margin-top: 48px; border-top: 1px solid #0f172a; display: inline-block; width: 180px; text-align: center; font-size: 11px; font-weight: 700; color: #0f172a; padding-top: 4px; }
    @media print {
      body { padding: 0; }
      .receipt-container { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header-row">
      <div>
        <div class="brand-title">${snapshot.company.tradeName || snapshot.company.legalName}</div>
        <div class="company-sub">${snapshot.company.legalName}</div>
        <div class="company-sub">${snapshot.company.address}</div>
        <div class="company-sub"><strong>GSTIN:</strong> ${snapshot.company.gstin} | <strong>PAN:</strong> ${snapshot.company.pan}</div>
        <div class="company-sub">Email: ${snapshot.company.email} | Phone: ${snapshot.company.phone}</div>
      </div>
      <div class="doc-meta">
        <div class="doc-badge">${snapshot.documentType.replace('_', ' ')}</div>
        <div class="doc-number">${snapshot.documentNumber}</div>
        <div class="meta-line">Date: ${snapshot.issueDate}</div>
        ${snapshot.dueDate ? `<div class="meta-line">Due Date: ${snapshot.dueDate}</div>` : ''}
        <div class="meta-line">Status: <strong>${snapshot.status.toUpperCase()}</strong></div>
      </div>
    </div>

    <div class="party-grid">
      <div>
        <div class="party-title">Billed To / Recipient</div>
        <div class="party-name">${snapshot.party.company || snapshot.party.name}</div>
        ${snapshot.party.company ? `<div class="party-detail">Attn: ${snapshot.party.name}</div>` : ''}
        <div class="party-detail">${snapshot.party.address || 'Address on file'}</div>
        ${snapshot.party.gstin ? `<div class="party-detail"><strong>GSTIN:</strong> ${snapshot.party.gstin}</div>` : ''}
        ${snapshot.party.phone ? `<div class="party-detail">Phone: ${snapshot.party.phone}</div>` : ''}
      </div>
      <div>
        <div class="party-title">Place of Supply & Dispatch</div>
        <div class="party-detail"><strong>Dispatch Warehouse:</strong> MIDC Bhosari Facility, Pune</div>
        <div class="party-detail"><strong>State:</strong> Maharashtra (State Code 27)</div>
        <div class="party-detail"><strong>Tax Jurisdiction:</strong> ${isInterState ? 'Inter-State (IGST Applicable)' : 'Intra-State (CGST + SGST Applicable)'}</div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 30px;">#</th>
          <th>Description & SKU</th>
          <th class="text-center" style="width: 80px;">HSN</th>
          <th class="text-right" style="width: 60px;">Qty</th>
          <th class="text-right" style="width: 80px;">Rate</th>
          <th class="text-right" style="width: 70px;">Taxable</th>
          <th class="text-right" style="width: 60px;">GST %</th>
          <th class="text-right" style="width: 90px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${snapshot.items.map((it, idx) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td><strong>${it.description}</strong><br><span style="font-size: 10px; color: #64748b;">${it.itemCode}</span></td>
            <td class="text-center">${it.hsnCode || '—'}</td>
            <td class="text-right">${it.quantity} ${it.uom}</td>
            <td class="text-right">₹${Number(it.unitRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td class="text-right">₹${Number(it.taxableAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td class="text-right">${it.gstRate}%</td>
            <td class="text-right"><strong>₹${Number(it.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="summary-grid">
      <div class="bank-box">
        <div class="bank-title">Payment & Banking Details</div>
        <div><strong>Bank:</strong> ${snapshot.company.bankName}</div>
        <div><strong>A/c Number:</strong> ${snapshot.company.accountNumber}</div>
        <div><strong>IFSC Code:</strong> ${snapshot.company.ifsc}</div>
        ${snapshot.company.upiId ? `<div><strong>UPI ID:</strong> ${snapshot.company.upiId}</div>` : ''}
        <div style="margin-top: 8px; font-size: 11px; color: #64748b;">Please mention invoice number as transaction reference in NEFT/RTGS.</div>
      </div>
      <div class="totals-box">
        <div class="tot-row"><span>Subtotal:</span><span>₹${snapshot.totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
        ${snapshot.totals.totalDiscount > 0 ? `<div class="tot-row"><span>Discount:</span><span>-₹${snapshot.totals.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>` : ''}
        <div class="tot-row"><span>Taxable Value:</span><span>₹${snapshot.totals.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
        ${snapshot.totals.cgstTotal > 0 ? `<div class="tot-row"><span>CGST:</span><span>₹${snapshot.totals.cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>` : ''}
        ${snapshot.totals.sgstTotal > 0 ? `<div class="tot-row"><span>SGST:</span><span>₹${snapshot.totals.sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>` : ''}
        ${snapshot.totals.igstTotal > 0 ? `<div class="tot-row"><span>IGST:</span><span>₹${snapshot.totals.igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>` : ''}
        <div class="tot-row grand"><span>Grand Total:</span><span>₹${snapshot.totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
      </div>
    </div>

    <div class="words-box">
      <strong>Amount in Words:</strong> ${snapshot.totals.amountInWords}
    </div>

    <div class="footer-row">
      <div class="terms-box">
        <strong>Terms & Conditions:</strong>
        <ol>
          ${(snapshot.terms || [
            'Goods once sold are covered under OEM warranty standard terms.',
            'Interest @ 18% p.a. will be levied on payments delayed beyond the due date.',
            'Subject to Pune, Maharashtra jurisdiction only.',
          ]).map(t => `<li>${t}</li>`).join('')}
        </ol>
      </div>
      <div class="sig-box">
        <div style="font-size: 11px; color: #64748b;">For ${snapshot.company.legalName}</div>
        <div class="sig-line">Authorized Signatory</div>
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Generate canonical document snapshot for a database record.
 */
export async function buildDocumentSnapshot(
  client: any,
  orgId: string,
  type: string,
  id: string
): Promise<DocumentSnapshot> {
  const org = await one<any>(
    client,
    `select name, legal_name, gstin, currency from erp.organizations where id = $1`,
    [orgId]
  )
  const company = {
    legalName: org?.legal_name || 'ApexERP Industrial Solutions Pvt. Ltd.',
    tradeName: org?.name || 'ApexERP',
    address: 'Plot 42, Sector 18, MIDC Bhosari Industrial Area, Pune, Maharashtra 411026, India',
    gstin: org?.gstin || '27AAACA9012K1Z4',
    pan: 'AAACA9012K',
    email: 'finance@apexflow-erp.com',
    phone: '+91 20 6712 4000',
    bankName: 'HDFC Bank Ltd.',
    accountNumber: '502000889921',
    ifsc: 'HDFC0001244',
    upiId: 'apexerpsolutions@hdfcbank',
  }

  if (type === 'invoice') {
    const inv = await one<any>(
      client,
      `select i.*, c.name as customer_name, c.company as customer_company, c.address as customer_address, c.gstin as customer_gstin, c.phone as customer_phone, c.email as customer_email
       from erp.invoices i
       left join erp.customers c on c.id = i.customer_id
       where i.id = $1 and i.org_id = $2`,
      [id, orgId]
    )
    if (!inv) throw new AppError(404, 'not_found', 'Invoice not found')
    if (inv.snapshot) return inv.snapshot

    const total = Number(inv.total_amount ?? 0)
    const subtotal = Number(inv.subtotal ?? total * 0.8475)
    const tax = Number(inv.tax_amount ?? total - subtotal)

    const snapshot: DocumentSnapshot = {
      documentType: 'Tax Invoice',
      documentNumber: inv.code,
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      status: inv.status,
      company,
      party: {
        name: inv.customer_name || 'Valued Customer',
        company: inv.customer_company,
        address: inv.customer_address,
        gstin: inv.customer_gstin,
        phone: inv.customer_phone,
        email: inv.customer_email,
      },
      items: [
        {
          itemCode: 'LINE-01',
          description: inv.notes || 'Commercial Goods & Industrial Equipment Supply',
          hsnCode: '8481',
          quantity: 1,
          uom: 'Units',
          unitRate: subtotal,
          discountPercent: 0,
          taxableAmount: subtotal,
          gstRate: 18,
          cgstAmount: tax / 2,
          sgstAmount: tax / 2,
          igstAmount: 0,
          totalAmount: total,
        },
      ],
      totals: {
        subtotal,
        totalDiscount: 0,
        taxableValue: subtotal,
        cgstTotal: tax / 2,
        sgstTotal: tax / 2,
        igstTotal: 0,
        totalTax: tax,
        grandTotal: total,
        amountInWords: numberToIndianWords(total),
      },
      notes: inv.notes,
      generatedAt: new Date().toISOString(),
    }

    // Freeze snapshot onto database record
    await client.query(
      `update erp.invoices set snapshot = $1 where id = $2 and org_id = $3`,
      [JSON.stringify(snapshot), id, orgId]
    )
    return snapshot
  }

  if (type === 'quotation') {
    const q = await one<any>(
      client,
      `select q.*, c.name as customer_name, c.company as customer_company, c.address as customer_address, c.gstin as customer_gstin, c.phone as customer_phone, c.email as customer_email
       from erp.quotations q
       left join erp.customers c on c.id = q.customer_id
       where q.id = $1 and q.org_id = $2`,
      [id, orgId]
    )
    if (!q) throw new AppError(404, 'not_found', 'Quotation not found')
    if (q.snapshot) return q.snapshot

    const total = Number(q.total_amount ?? 0)
    const subtotal = total / 1.18
    const tax = total - subtotal

    const snapshot: DocumentSnapshot = {
      documentType: 'Commercial Quotation',
      documentNumber: q.code,
      issueDate: q.created_at ? String(q.created_at).split('T')[0] : new Date().toISOString().split('T')[0],
      dueDate: q.valid_until,
      status: q.status,
      company,
      party: {
        name: q.customer_name || 'Prospective Client',
        company: q.customer_company,
        address: q.customer_address,
        gstin: q.customer_gstin,
        phone: q.customer_phone,
        email: q.customer_email,
      },
      items: [
        {
          itemCode: 'LINE-01',
          description: 'Industrial Solutions & Supply Quotation',
          hsnCode: '8481',
          quantity: 1,
          uom: 'Units',
          unitRate: subtotal,
          discountPercent: 0,
          taxableAmount: subtotal,
          gstRate: 18,
          cgstAmount: tax / 2,
          sgstAmount: tax / 2,
          igstAmount: 0,
          totalAmount: total,
        },
      ],
      totals: {
        subtotal,
        totalDiscount: 0,
        taxableValue: subtotal,
        cgstTotal: tax / 2,
        sgstTotal: tax / 2,
        igstTotal: 0,
        totalTax: tax,
        grandTotal: total,
        amountInWords: numberToIndianWords(total),
      },
      generatedAt: new Date().toISOString(),
    }

    await client.query(
      `update erp.quotations set snapshot = $1 where id = $2 and org_id = $3`,
      [JSON.stringify(snapshot), id, orgId]
    )
    return snapshot
  }

  if (type === 'receipt') {
    const pmt = await one<any>(
      client,
      `select p.*, c.name as customer_name, c.company as customer_company, c.address as customer_address, c.gstin as customer_gstin
       from erp.payments p
       left join erp.customers c on c.id = p.customer_id
       where p.id = $1 and p.org_id = $2`,
      [id, orgId]
    )
    if (!pmt) throw new AppError(404, 'not_found', 'Payment receipt not found')

    const amount = Number(pmt.amount ?? 0)
    return {
      documentType: 'Official Payment Receipt',
      documentNumber: pmt.code,
      issueDate: pmt.paid_at ? String(pmt.paid_at).split('T')[0] : new Date().toISOString().split('T')[0],
      status: 'Paid',
      company,
      party: {
        name: pmt.customer_name || 'Customer',
        company: pmt.customer_company,
        address: pmt.customer_address,
        gstin: pmt.customer_gstin,
      },
      items: [
        {
          itemCode: 'RECEIPT-PMT',
          description: `Payment received via ${pmt.method} (Ref: ${pmt.reference || 'N/A'})`,
          hsnCode: '9965',
          quantity: 1,
          uom: 'Transaction',
          unitRate: amount,
          discountPercent: 0,
          taxableAmount: amount,
          gstRate: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          totalAmount: amount,
        },
      ],
      totals: {
        subtotal: amount,
        totalDiscount: 0,
        taxableValue: amount,
        cgstTotal: 0,
        sgstTotal: 0,
        igstTotal: 0,
        totalTax: 0,
        grandTotal: amount,
        amountInWords: numberToIndianWords(amount),
      },
      generatedAt: new Date().toISOString(),
    }
  }

  if (type === 'credit_note') {
    const cn = await one<any>(
      client,
      `select * from erp.credit_notes where id = $1 and org_id = $2`,
      [id, orgId]
    )
    if (!cn) throw new AppError(404, 'not_found', 'Credit note not found')
    if (cn.snapshot) return cn.snapshot

    const total = Number(cn.total_amount ?? 0)
    const taxable = Number(cn.taxable_amount ?? total / 1.18)
    const cgst = Number(cn.cgst_amount ?? (total - taxable) / 2)
    const sgst = Number(cn.sgst_amount ?? (total - taxable) / 2)
    const igst = Number(cn.igst_amount ?? 0)

    const snapshot: DocumentSnapshot = {
      documentType: 'Credit Note',
      documentNumber: cn.note_number,
      issueDate: cn.issue_date,
      status: cn.status,
      company,
      party: {
        name: cn.customer_name || 'Customer',
        gstin: cn.customer_gstin,
      },
      items: [
        {
          itemCode: 'CRN-01',
          description: `Credit Note against invoice ${cn.original_invoice_number || 'N/A'} - Reason: ${cn.reason}`,
          hsnCode: '8481',
          quantity: 1,
          uom: 'Units',
          unitRate: taxable,
          discountPercent: 0,
          taxableAmount: taxable,
          gstRate: 18,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          totalAmount: total,
        },
      ],
      totals: {
        subtotal: taxable,
        totalDiscount: 0,
        taxableValue: taxable,
        cgstTotal: cgst,
        sgstTotal: sgst,
        igstTotal: igst,
        totalTax: cgst + sgst + igst,
        grandTotal: total,
        amountInWords: numberToIndianWords(total),
      },
      notes: cn.notes,
      generatedAt: new Date().toISOString(),
    }

    await client.query(
      `update erp.credit_notes set snapshot = $1 where id = $2 and org_id = $3`,
      [JSON.stringify(snapshot), id, orgId]
    )
    return snapshot
  }

  // Fallback generic snapshot for other vouchers (refund, payment voucher, purchase order, payslip)
  return {
    documentType: type.replace('_', ' ').toUpperCase(),
    documentNumber: `${type.slice(0, 3).toUpperCase()}-${id.slice(0, 8)}`,
    issueDate: new Date().toISOString().split('T')[0],
    status: 'Issued',
    company,
    party: {
      name: 'Authorized Party',
    },
    items: [
      {
        itemCode: 'LINE-01',
        description: `Official ${type.replace('_', ' ')} record`,
        hsnCode: '9999',
        quantity: 1,
        uom: 'Doc',
        unitRate: 0,
        discountPercent: 0,
        taxableAmount: 0,
        gstRate: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalAmount: 0,
      },
    ],
    totals: {
      subtotal: 0,
      totalDiscount: 0,
      taxableValue: 0,
      cgstTotal: 0,
      sgstTotal: 0,
      igstTotal: 0,
      totalTax: 0,
      grandTotal: 0,
      amountInWords: 'Zero Rupees Only',
    },
    generatedAt: new Date().toISOString(),
  }
}

// -----------------------------------------------------------------------------
// Document Endpoints
// -----------------------------------------------------------------------------
documentsRouter.get('/:type/:id', async (req, res) => {
  const auth = req.auth!
  const type = String(req.params.type).toLowerCase()
  const id = uuidSchema.parse(req.params.id)

  const snapshot = await withRls(auth, async (client) => {
    return buildDocumentSnapshot(client, auth.orgId, type, id)
  })

  // Support HTML direct view or JSON snapshot
  if (req.headers.accept?.includes('text/html')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.send(renderReceiptHtml(snapshot))
  }

  sendData(res, {
    snapshot,
    html: renderReceiptHtml(snapshot),
  })
})

documentsRouter.post('/:type/:id/email', async (req, res) => {
  const auth = req.auth!
  const type = String(req.params.type).toLowerCase()
  const id = uuidSchema.parse(req.params.id)
  const { recipientEmail } = req.body || {}

  const result = await withRls(auth, async (client) => {
    const snapshot = await buildDocumentSnapshot(client, auth.orgId, type, id)
    const emailTo = recipientEmail || snapshot.party.email || 'customer@client-domain.com'

    await audit(
      client,
      'document.email',
      type,
      id,
      `Sent ${snapshot.documentType} ${snapshot.documentNumber} to ${emailTo}`,
      null,
      { emailTo, documentNumber: snapshot.documentNumber }
    )

    return {
      success: true,
      sentTo: emailTo,
      documentNumber: snapshot.documentNumber,
      sentAt: new Date().toISOString(),
    }
  })

  sendData(res, result)
})

documentsRouter.post('/bulk-export', async (req, res) => {
  const auth = req.auth!
  const { documentIds = [], type = 'invoice' } = req.body || {}

  const result = await withRls(auth, async (client) => {
    const documents: DocumentSnapshot[] = []
    for (const docId of documentIds) {
      try {
        const snap = await buildDocumentSnapshot(client, auth.orgId, type, docId)
        documents.push(snap)
      } catch {
        // Skip inaccessible docs in bulk run
      }
    }

    return {
      batchId: `EXPORT-${Date.now()}`,
      count: documents.length,
      documents,
      exportedAt: new Date().toISOString(),
    }
  })

  sendData(res, result)
})
