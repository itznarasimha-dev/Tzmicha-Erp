import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Express } from 'express'
import { closePool } from './db/pool.js'
import { resetConfigCache } from './config.js'
import {
  numberToIndianWords,
  renderReceiptHtml,
  type DocumentSnapshot,
} from './routes/finance/documents.js'
import {
  sanitizeCsvCell,
  parseIndianNumber,
  parseIndianDate,
  isValidGstin,
  parseRawCsv,
  getTemplateCsv,
} from './routes/finance/imports.js'

let app: Express

beforeAll(async () => {
  process.env.NODE_ENV = 'test'
  process.env.LOG_LEVEL = 'silent'
  process.env.DB_ENFORCE_RLS = 'false'
  process.env.SUPABASE_JWT_SECRET = 'test-secret-value-that-is-long-enough-1234567890'
  delete process.env.SUPABASE_URL
  resetConfigCache()

  const { createApp } = await import('./app.js')
  app = createApp()
})

afterAll(async () => {
  await closePool()
})

describe('Finance Utilities & Document Helpers', () => {
  describe('numberToIndianWords', () => {
    it('handles zero and invalid inputs', () => {
      expect(numberToIndianWords(0)).toBe('Zero Rupees Only')
      expect(numberToIndianWords(NaN)).toBe('Zero Rupees Only')
    })

    it('formats numbers using Indian numbering system (Lakhs and Crores)', () => {
      expect(numberToIndianWords(500)).toBe('Five Hundred Rupees Only')
      expect(numberToIndianWords(1250)).toBe('One Thousand Two Hundred and Fifty Rupees Only')
      expect(numberToIndianWords(125000)).toBe('One Lakh Twenty-Five Thousand Rupees Only')
      expect(numberToIndianWords(2549900)).toBe('Twenty-Five Lakh Forty-Nine Thousand Nine Hundred Rupees Only')
      expect(numberToIndianWords(15000000)).toBe('One Crore Fifty Lakh Rupees Only')
    })
  })

  describe('CSV Injection Sanitization & Data Parsers', () => {
    it('neutralizes formula injection characters (=, +, -, @, \\t, \\r)', () => {
      expect(sanitizeCsvCell('=1+2')).toBe(`'=1+2`)
      expect(sanitizeCsvCell('+cmd|/c calc')).toBe(`'+cmd|/c calc`)
      expect(sanitizeCsvCell('-100')).toBe(`'-100`)
      expect(sanitizeCsvCell('@SUM(A1:B10)')).toBe(`'@SUM(A1:B10)`)
      expect(sanitizeCsvCell('\tmalicious')).toBe(`'\tmalicious`)
      expect(sanitizeCsvCell('Acme Industrial Solutions')).toBe('Acme Industrial Solutions')
      expect(sanitizeCsvCell('12500.50')).toBe('12500.50')
    })

    it('parses Indian comma-separated currency values accurately', () => {
      expect(parseIndianNumber('1,25,000.50')).toBe(125000.5)
      expect(parseIndianNumber('50,00,000')).toBe(5000000)
      expect(parseIndianNumber(4500)).toBe(4500)
      expect(parseIndianNumber('')).toBe(0)
      expect(parseIndianNumber(null)).toBe(0)
    })

    it('normalizes Indian and ISO date representations into YYYY-MM-DD', () => {
      expect(parseIndianDate('25/10/2026')).toBe('2026-10-25')
      expect(parseIndianDate('05-11-2026')).toBe('2026-11-05')
      expect(parseIndianDate('2026-12-31')).toBe('2026-12-31')
      expect(parseIndianDate('invalid-date')).toBeNull()
      expect(parseIndianDate(null)).toBeNull()
    })

    it('validates 15-character Indian GSTINs correctly', () => {
      expect(isValidGstin('27AAACA9012K1Z4')).toBe(true)
      expect(isValidGstin('27BBBCB8011J1Z2')).toBe(true)
      expect(isValidGstin('INVALID-GSTIN-01')).toBe(false)
      expect(isValidGstin('')).toBe(true) // optional GSTIN is valid
    })

    it('parses raw CSV text handling quotes and sanitization', () => {
      const csv = `doc_reference,customer_name,quantity,unit_price
QT-001,"Apex Precision, Pune",10,1250
QT-002,=cmd|' /C calc,5,2000`

      const rows = parseRawCsv(csv)
      expect(rows).toHaveLength(2)
      expect(rows[0].customer_name).toBe('Apex Precision, Pune')
      expect(rows[0].quantity).toBe('10')
      expect(rows[1].customer_name).toBe(`'=cmd|' /C calc`) // sanitized!
    })
  })

  describe('Receipt HTML Rendering', () => {
    it('renders clean white receipt HTML with tax details, bank info, and Inter font', () => {
      const mockSnapshot: DocumentSnapshot = {
        documentType: 'Tax Invoice',
        documentNumber: 'INV-2026-0042',
        issueDate: '2026-10-27',
        dueDate: '2026-11-27',
        status: 'issued',
        company: {
          legalName: 'ApexERP Industrial Solutions Pvt. Ltd.',
          tradeName: 'ApexERP',
          address: 'Plot 42, MIDC Bhosari, Pune 411026',
          gstin: '27AAACA9012K1Z4',
          pan: 'AAACA9012K',
          email: 'finance@apexflow-erp.com',
          phone: '+91 20 6712 4000',
          bankName: 'HDFC Bank Ltd.',
          accountNumber: '502000889921',
          ifsc: 'HDFC0001244',
          upiId: 'apexerpsolutions@hdfcbank',
        },
        party: {
          name: 'Precision Gear Corp',
          company: 'Precision Gear Works Ltd',
          address: 'GIDC Vatva, Ahmedabad, Gujarat',
          gstin: '24BBBBB0000A1Z5',
          email: 'purchase@precisiongear.com',
        },
        items: [
          {
            itemCode: 'VALVE-25',
            description: 'High-Viscosity Valve 25mm',
            hsnCode: '8481',
            quantity: 2,
            uom: 'Nos',
            unitRate: 15000,
            discountPercent: 0,
            taxableAmount: 30000,
            gstRate: 18,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 5400,
            totalAmount: 35400,
          },
        ],
        totals: {
          subtotal: 30000,
          totalDiscount: 0,
          taxableValue: 30000,
          cgstTotal: 0,
          sgstTotal: 0,
          igstTotal: 5400,
          totalTax: 5400,
          grandTotal: 35400,
          amountInWords: 'Thirty-Five Thousand Four Hundred Rupees Only',
        },
        generatedAt: '2026-10-27T10:00:00Z',
      }

      const html = renderReceiptHtml(mockSnapshot)
      expect(html).toContain('INV-2026-0042')
      expect(html).toContain('ApexERP Industrial Solutions Pvt. Ltd.')
      expect(html).toContain('27AAACA9012K1Z4')
      expect(html).toContain('502000889921')
      expect(html).toContain('HDFC0001244')
      expect(html).toContain('High-Viscosity Valve 25mm')
      expect(html).toContain('Thirty-Five Thousand Four Hundred Rupees Only')
      expect(html).toContain('Authorized Signatory')
      expect(html).toContain('font-family: \'Inter\'')
    })
  })
})

describe('Finance Bulk Import & Document Routes', () => {
  describe('CSV Templates Generator & Endpoints', () => {
    const validTemplates = ['quotation', 'invoice', 'sales_order', 'purchase_order']

    it.each(validTemplates)('generates valid template CSV structure for %s', (type) => {
      const tmpl = getTemplateCsv(type)
      expect(tmpl.filename).toBe(`${type}_import_template.csv`)
      expect(tmpl.content).toContain('doc_reference')
      expect(tmpl.content).toContain('sku_code')
    })

    it('throws error for unsupported template type in generator', () => {
      expect(() => getTemplateCsv('unsupported_type')).toThrow('Unsupported document template type')
    })

    it.each(validTemplates)('rejects GET /api/finance/imports/templates/%s without auth (401)', async (type) => {
      const res = await request(app).get(`/api/finance/imports/templates/${type}`)
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('unauthorized')
    })
  })

  describe('POST /api/finance/imports/preview', () => {
    it('rejects preview request without auth (401)', async () => {
      const res = await request(app)
        .post('/api/finance/imports/preview')
        .send({
          documentType: 'quotation',
          fileName: 'test.csv',
          csvData: 'doc_reference,customer_name\nQT-01,Test Cust',
        })
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('unauthorized')
    })

    it('validates schema and rejects empty or malformed request bodies with 400', async () => {
      const res = await request(app)
        .post('/api/finance/imports/preview')
        .set('Authorization', 'Bearer invalid-token')
        .send({})
      expect([400, 401]).toContain(res.status)
    })
  })

  describe('POST /api/finance/imports/confirm', () => {
    it('rejects confirm request without auth (401)', async () => {
      const res = await request(app)
        .post('/api/finance/imports/confirm')
        .send({
          documentType: 'quotation',
          fileName: 'quotes.csv',
          fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          rows: [{ docReference: 'QT-01', partyName: 'Customer A' }],
        })
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('unauthorized')
    })
  })

  describe('GET /api/finance/imports/history', () => {
    it('rejects history request without auth (401)', async () => {
      const res = await request(app).get('/api/finance/imports/history')
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('unauthorized')
    })
  })

  describe('Document Snapshot Endpoints', () => {
    it('rejects GET /api/finance/documents/:type/:id without auth (401)', async () => {
      const res = await request(app).get('/api/finance/documents/invoice/a0000000-0000-0000-0000-000000000001')
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('unauthorized')
    })

    it('rejects POST /api/finance/documents/:type/:id/email without auth (401)', async () => {
      const res = await request(app)
        .post('/api/finance/documents/invoice/a0000000-0000-0000-0000-000000000001/email')
        .send({ recipientEmail: 'client@example.com' })
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('unauthorized')
    })

    it('rejects POST /api/finance/documents/bulk-export without auth (401)', async () => {
      const res = await request(app)
        .post('/api/finance/documents/bulk-export')
        .send({ documentIds: ['a0000000-0000-0000-0000-000000000001'], type: 'invoice' })
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('unauthorized')
    })
  })
})
