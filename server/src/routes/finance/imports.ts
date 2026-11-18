import crypto from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import { withRls, one, many, count, audit, nextDocNumber } from '../../db/transaction.js'
import { AppError } from '../../errors.js'
import { sendData, validateBody, validatedBody } from '../../http.js'
import { authenticate } from '../../middleware/auth.js'
import { optionalText, uuidSchema } from '../../lib/validation.js'
import { buildDocumentSnapshot } from './documents.js'

export const importsRouter = Router()

importsRouter.use(authenticate)

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const MAX_ROW_LIMIT = 1000

/**
 * Sanitize cell content against CSV injection attacks.
 * If formula prefix (=, +, -, @, \t, \r) is found, prepend with single-quote.
 */
export function sanitizeCsvCell(val: string): string {
  if (!val || typeof val !== 'string') return val
  if (/^[=+\-@\t\r]/.test(val)) {
    return `'${val}`
  }
  return val.trim()
}

/**
 * Parse Indian currency / formatted numbers: "1,25,000.50" -> 125000.5
 */
export function parseIndianNumber(val: any): number {
  if (typeof val === 'number') return val
  if (!val) return 0
  const cleaned = String(val).replace(/,/g, '').trim()
  const num = Number(cleaned)
  return isNaN(num) ? 0 : num
}

/**
 * Parse date in formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
 */
export function parseIndianDate(val: any): string | null {
  if (!val) return null
  const str = String(val).trim()
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

  // DD/MM/YYYY or DD-MM-YYYY
  const match = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (match) {
    const [, d, m, y] = match
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

/**
 * Validate GSTIN format (15 characters alphanumeric)
 */
export function isValidGstin(gstin?: string): boolean {
  if (!gstin) return true // optional
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim())
}

/**
 * Generate CSV template structure and sample content.
 */
export function getTemplateCsv(type: string): { filename: string; content: string } {
  const normalizedType = String(type).toLowerCase()

  const templates: Record<string, { filename: string; headers: string[]; sample: string[][] }> = {
    quotation: {
      filename: 'quotation_import_template.csv',
      headers: ['doc_reference', 'customer_name', 'customer_gstin', 'valid_until', 'sku_code', 'description', 'hsn_code', 'quantity', 'unit_price', 'discount_percent', 'tax_rate', 'notes'],
      sample: [
        ['QT-IMPORT-001', 'Apex Precision Tools Ltd', '27AAACA9012K1Z4', '2026-12-31', 'HV25-0101', 'High-Viscosity Chemical Valve 25mm', '8481', '5', '12500', '0', '18', 'Urgent batch'],
        ['QT-IMPORT-001', 'Apex Precision Tools Ltd', '27AAACA9012K1Z4', '2026-12-31', 'FP40-0102', 'Food-Grade Stainless Flange Pipe 40mm', '7307', '10', '4200', '5', '18', 'Include test certificates'],
        ['QT-IMPORT-002', 'Shree Agro Chemical Dist', '27BBBCB8011J1Z2', '2026-11-30', 'DM60-0201', 'Drum Mixer Impeller 60cm', '8479', '2', '28000', '0', '18', 'Standard packing'],
      ],
    },
    invoice: {
      filename: 'invoice_import_template.csv',
      headers: ['doc_reference', 'customer_name', 'customer_gstin', 'invoice_date', 'due_date', 'sku_code', 'description', 'hsn_code', 'quantity', 'unit_price', 'tax_rate', 'notes'],
      sample: [
        ['INV-IMPORT-001', 'Apex Precision Tools Ltd', '27AAACA9012K1Z4', '2026-10-25', '2026-11-25', 'HV25-0101', 'High-Viscosity Chemical Valve 25mm', '8481', '2', '12500', '18', 'PO-2026-901'],
        ['INV-IMPORT-002', 'Kirloskar Fluid Systems', '27CCCC1234F1Z8', '2026-10-26', '2026-11-26', 'FP40-0102', 'Food-Grade Stainless Flange Pipe 40mm', '7307', '4', '4200', '18', 'Dispatch Ref: DSP-092'],
      ],
    },
    sales_order: {
      filename: 'sales_order_import_template.csv',
      headers: ['doc_reference', 'customer_name', 'customer_gstin', 'order_date', 'required_date', 'sku_code', 'description', 'hsn_code', 'quantity', 'unit_price', 'discount_percent', 'tax_rate'],
      sample: [
        ['SO-IMPORT-001', 'Apex Precision Tools Ltd', '27AAACA9012K1Z4', '2026-10-26', '2026-11-05', 'HV25-0101', 'Chemical Valve 25mm', '8481', '10', '12000', '5', '18'],
      ],
    },
    purchase_order: {
      filename: 'purchase_order_import_template.csv',
      headers: ['doc_reference', 'supplier_name', 'supplier_gstin', 'order_date', 'expected_date', 'sku_code', 'description', 'hsn_code', 'quantity', 'unit_price', 'tax_rate', 'notes'],
      sample: [
        ['PO-IMPORT-001', 'Kalyani Steels & Forgings Ltd', '27KKKK1234K1Z9', '2026-10-20', '2026-11-10', 'RM-SS316-01', 'Raw SS316 Round Bar 50mm', '7222', '500', '320', '18', 'Include mill test cert'],
      ],
    },
  }

  const tmpl = templates[normalizedType]
  if (!tmpl) {
    throw AppError.badRequest(`Unsupported document template type: ${type}`)
  }

  const content = [
    tmpl.headers.join(','),
    ...tmpl.sample.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\r\n')

  return { filename: tmpl.filename, content }
}

// -----------------------------------------------------------------------------
// 1. Template Download Endpoint
// -----------------------------------------------------------------------------
importsRouter.get('/templates/:type', (req, res) => {
  const { filename, content } = getTemplateCsv(req.params.type)

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(content)
})

// -----------------------------------------------------------------------------
// 2. Validation Preview Endpoint (Does NOT save records)
// -----------------------------------------------------------------------------
const previewSchema = z.object({
  documentType: z.enum(['quotation', 'invoice', 'sales_order', 'purchase_order']),
  fileName: z.string().min(1),
  csvData: z.string().min(1),
})

export function parseRawCsv(csvText: string): Array<Record<string, string>> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  // Split headers
  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase())

  const rows: Array<Record<string, string>> = []
  for (let i = 1; i < lines.length; i++) {
    // Regex matching CSV tokens with quote handling
    const matches = lines[i].match(/(?!\s*$)\s*(?:"([^"]*(?:""[^"]*)*)"|([^,]*))\s*(?:,|$)/g)
    if (!matches) continue

    const rowObj: Record<string, string> = {}
    headers.forEach((h, idx) => {
      let rawVal = matches[idx] ? matches[idx].replace(/,$/, '').trim() : ''
      if (rawVal.startsWith('"') && rawVal.endsWith('"')) {
        rawVal = rawVal.slice(1, -1).replace(/""/g, '"')
      }
      rowObj[h] = sanitizeCsvCell(rawVal)
    })
    rows.push(rowObj)
  }
  return rows
}

importsRouter.post('/preview', validateBody(previewSchema), async (req, res) => {
  const auth = req.auth!
  const { documentType, fileName, csvData } = validatedBody<z.infer<typeof previewSchema>>(req)

  if (Buffer.byteLength(csvData, 'utf8') > MAX_FILE_SIZE_BYTES) {
    throw AppError.badRequest('File size exceeds maximum 5MB limit')
  }

  const rawRows = parseRawCsv(csvData)
  if (rawRows.length === 0) {
    throw AppError.badRequest('The uploaded CSV file contains no data rows.')
  }
  if (rawRows.length > MAX_ROW_LIMIT) {
    throw AppError.badRequest(`Maximum allowable rows per import is ${MAX_ROW_LIMIT}. Found ${rawRows.length}.`)
  }

  // Compute SHA256 file hash for idempotency detection
  const fileHash = crypto.createHash('sha256').update(csvData).digest('hex')

  const isDuplicate = await withRls(auth, async (client) => {
    const existing = await one<any>(
      client,
      `select id, batch_number, created_at from erp.import_batches where org_id = $1 and file_hash = $2`,
      [auth.orgId, fileHash]
    )
    return existing
  })

  // Validate rows
  const rowResults: Array<{
    rowNumber: number
    docReference: string
    status: 'valid' | 'warning' | 'error'
    messages: string[]
    data: Record<string, any>
  }> = []

  let validCount = 0
  let warningCount = 0
  let errorCount = 0
  const docRefMap = new Map<string, number>()

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2 // 1-based, accounting for header
    const messages: string[] = []
    let status: 'valid' | 'warning' | 'error' = 'valid'

    const docRef = row.doc_reference || row.reference || `REF-${rowNum}`
    docRefMap.set(docRef, (docRefMap.get(docRef) || 0) + 1)

    const party = row.customer_name || row.supplier_name || row.party_name
    if (!party) {
      status = 'error'
      messages.push('Party name (customer or supplier) is required')
    }

    const gstin = row.customer_gstin || row.supplier_gstin || row.gstin
    if (gstin && !isValidGstin(gstin)) {
      status = 'warning'
      messages.push(`Invalid GSTIN format: ${gstin}`)
    }

    const qty = parseIndianNumber(row.quantity || row.qty)
    if (qty <= 0) {
      status = 'error'
      messages.push(`Quantity must be greater than 0. Found: ${row.quantity}`)
    }

    const rate = parseIndianNumber(row.unit_price || row.rate || row.price)
    if (rate < 0) {
      status = 'error'
      messages.push(`Unit price cannot be negative. Found: ${row.unit_price}`)
    }

    const taxRate = parseIndianNumber(row.tax_rate || 18)
    if (![0, 5, 12, 18, 28].includes(taxRate)) {
      status = status === 'error' ? 'error' : 'warning'
      messages.push(`Non-standard GST tax rate: ${taxRate}%. Standard slabs: 0%, 5%, 12%, 18%, 28%`)
    }

    if (status === 'valid') validCount++
    else if (status === 'warning') warningCount++
    else errorCount++

    rowResults.push({
      rowNumber: rowNum,
      docReference: docRef,
      status,
      messages,
      data: {
        docReference: docRef,
        partyName: party,
        gstin,
        skuCode: row.sku_code || 'GEN-SKU',
        description: row.description || 'Imported Line Item',
        quantity: qty,
        unitPrice: rate,
        taxRate,
        lineTotal: qty * rate * (1 + taxRate / 100),
      },
    })
  })

  sendData(res, {
    fileHash,
    fileName,
    documentType,
    isDuplicateAlreadyImported: Boolean(isDuplicate),
    duplicateBatchNumber: isDuplicate?.batch_number,
    summary: {
      totalRows: rawRows.length,
      validRows: validCount,
      warningRows: warningCount,
      errorRows: errorCount,
      estimatedDocuments: docRefMap.size,
    },
    rows: rowResults,
  })
})

// -----------------------------------------------------------------------------
// 3. Confirm Import Endpoint (Transactional per document)
// -----------------------------------------------------------------------------
const confirmSchema = z.object({
  documentType: z.enum(['quotation', 'invoice', 'sales_order', 'purchase_order']),
  fileName: z.string().min(1),
  fileHash: z.string().min(1),
  rows: z.array(z.record(z.any())).min(1),
})

importsRouter.post('/confirm', validateBody(confirmSchema), async (req, res) => {
  const auth = req.auth!
  const { documentType, fileName, fileHash, rows } = validatedBody<z.infer<typeof confirmSchema>>(req)

  const result = await withRls(auth, async (client) => {
    // 1. Idempotency Check
    const existing = await one<any>(
      client,
      `select id, batch_number from erp.import_batches where org_id = $1 and file_hash = $2`,
      [auth.orgId, fileHash]
    )
    if (existing) {
      throw AppError.conflict(`This file has already been imported under batch ${existing.batch_number}`)
    }

    // 2. Create Batch Record
    const batchNumber = `IMP-${Date.now().toString().slice(-8)}`
    const batch = await one<{ id: string; batch_number: string }>(
      client,
      `insert into erp.import_batches (
        org_id, batch_number, document_type, file_name, file_hash, total_rows, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7)
      returning id, batch_number`,
      [auth.orgId, batchNumber, documentType, fileName, fileHash, rows.length, auth.userId]
    )
    if (!batch) throw new AppError(500, 'internal_error', 'Failed to register import batch')

    // 3. Group rows by Document Reference
    const groups = new Map<string, Array<Record<string, any>>>()
    rows.forEach((r) => {
      const docRef = r.docReference || r.doc_reference || `DOC-${r.rowNumber}`
      if (!groups.has(docRef)) groups.set(docRef, [])
      groups.get(docRef)!.push(r)
    })

    let importedDocs = 0
    let failedDocs = 0
    const errorLogs: Array<{ docRef: string; error: string; rows: number[] }> = []

    // 4. Process Each Document with Savepoints
    for (const [docRef, docRows] of groups.entries()) {
      const savepoint = `sp_import_${docRef.replace(/[^a-zA-Z0-9]/g, '_')}`
      try {
        await client.query(`SAVEPOINT ${savepoint}`)

        // Resolve or create Customer / Supplier
        const firstRow = docRows[0]
        const partyName = firstRow.partyName || firstRow.customer_name || firstRow.supplier_name || 'Imported Party'
        const gstin = firstRow.gstin || firstRow.customer_gstin || firstRow.supplier_gstin || null

        let partyId: string | null = null
        if (documentType === 'purchase_order') {
          let sup = await one<{ id: string }>(
            client,
            `select id from erp.suppliers where org_id = $1 and (name ilike $2 or gstin = $3) limit 1`,
            [auth.orgId, partyName, gstin]
          )
          if (!sup) {
            sup = await one<{ id: string }>(
              client,
              `insert into erp.suppliers (org_id, code, name, gstin) values ($1, $2, $3, $4) returning id`,
              [auth.orgId, `SUP-${Date.now().toString().slice(-6)}`, partyName, gstin]
            )
          }
          partyId = sup?.id || null
        } else {
          let cust = await one<{ id: string }>(
            client,
            `select id from erp.customers where org_id = $1 and (name ilike $2 or gstin = $3) limit 1`,
            [auth.orgId, partyName, gstin]
          )
          if (!cust) {
            cust = await one<{ id: string }>(
              client,
              `insert into erp.customers (org_id, code, name, gstin) values ($1, $2, $3, $4) returning id`,
              [auth.orgId, `CUST-${Date.now().toString().slice(-6)}`, partyName, gstin]
            )
          }
          partyId = cust?.id || null
        }

        // Generate doc code from sequence
        const docCode = await nextDocNumber(client, auth.orgId, documentType)

        // Compute financial totals
        let subtotal = 0
        let totalTax = 0
        docRows.forEach((r) => {
          const q = Number(r.quantity || 1)
          const p = Number(r.unitPrice || 0)
          const tax = Number(r.taxRate || 18)
          const lineTaxable = q * p
          subtotal += lineTaxable
          totalTax += (lineTaxable * tax) / 100
        })
        const grandTotal = subtotal + totalTax

        // Insert into targeted table
        if (documentType === 'invoice') {
          await client.query(
            `insert into erp.invoices (
              org_id, code, customer_id, status, total_amount, subtotal, tax_amount, notes
            ) values ($1, $2, $3, 'issued', $4, $5, $6, $7)`,
            [auth.orgId, docCode, partyId, grandTotal, subtotal, totalTax, `Imported via Batch ${batch.batch_number}`]
          )
        } else if (documentType === 'quotation') {
          await client.query(
            `insert into erp.quotations (
              org_id, code, customer_id, status, total_amount
            ) values ($1, $2, $3, 'draft', $4)`,
            [auth.orgId, docCode, partyId, grandTotal]
          )
        } else if (documentType === 'sales_order') {
          await client.query(
            `insert into erp.sales_orders (
              org_id, code, customer_id, status, total_amount
            ) values ($1, $2, $3, 'confirmed', $4)`,
            [auth.orgId, docCode, partyId, grandTotal]
          )
        }

        await client.query(`RELEASE SAVEPOINT ${savepoint}`)
        importedDocs++
      } catch (err: any) {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`)
        failedDocs++
        errorLogs.push({
          docRef,
          error: err?.message || 'Database error during document insertion',
          rows: docRows.map((r) => r.rowNumber),
        })
      }
    }

    // 5. Update Batch Status
    await client.query(
      `update erp.import_batches
       set imported_count = $1, failed_count = $2, error_log = $3, status = $4
       where id = $5 and org_id = $6`,
      [importedDocs, failedDocs, JSON.stringify(errorLogs), failedDocs === 0 ? 'completed' : 'completed_with_errors', batch.id, auth.orgId]
    )

    await audit(
      client,
      'bulk_import.execute',
      'import_batch',
      batch.id,
      `Executed bulk import ${batch.batch_number}: ${importedDocs} docs imported, ${failedDocs} failed`,
      null,
      { batchNumber: batch.batch_number, documentType, importedDocs, failedDocs }
    )

    return {
      batchId: batch.id,
      batchNumber: batch.batch_number,
      totalRows: rows.length,
      importedDocuments: importedDocs,
      failedDocuments: failedDocs,
      errors: errorLogs,
    }
  })

  sendData(res, result, 201)
})

// -----------------------------------------------------------------------------
// 4. Import History Endpoint
// -----------------------------------------------------------------------------
importsRouter.get('/history', async (req, res) => {
  const auth = req.auth!

  const history = await withRls(auth, async (client) => {
    return many(
      client,
      `select id, batch_number, document_type, file_name, total_rows, imported_count, failed_count, status, created_at
       from erp.import_batches
       where org_id = $1
       order by created_at desc limit 50`,
      [auth.orgId]
    )
  }, { readOnly: true })

  sendData(res, history)
})
