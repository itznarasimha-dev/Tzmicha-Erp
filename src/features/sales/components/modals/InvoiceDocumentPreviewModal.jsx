import { useMemo } from 'react';
import {
  Printer,
  Download,
  Building2,
  CheckCircle,
  FileText,
  CreditCard,
  ShieldCheck,
  X,
  Lock,
  Mail,
  MessageSquare,
} from 'lucide-react';
import Modal from '../common/Modal';
import { formatINR, formatDate } from '../../utils/formatters';
import { numberToIndianWords, downloadInvoiceDocument } from '../../utils/documentGenerator';
import { DEFAULT_COMPANY_CONFIG } from '../../data/mockData';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';

export default function InvoiceDocumentPreviewModal({ isOpen, onClose, invoice }) {
  const { companyConfig = DEFAULT_COMPANY_CONFIG, customers, orders, userRole } = useSales();
  const { showToast } = useToast();

  if (!invoice) return null;

  const customer = customers.find(
    (c) => c.id === invoice.customerId || c.customerId === invoice.customerId || c.name === invoice.customerName
  ) || {};

  const order = orders.find((o) => o.orderNo === invoice.orderNo || o.id === invoice.orderNo) || {};

  const terms = invoice.termsAndConditions || companyConfig.defaultTerms || DEFAULT_COMPANY_CONFIG.defaultTerms;
  const bank = companyConfig.bankDetails || DEFAULT_COMPANY_CONFIG.bankDetails;

  const totalAmount = Number(invoice.totalAmount || 0);
  const paidAmount = Number(invoice.paidAmount || 0);
  const balance = Number(invoice.balance !== undefined ? invoice.balance : Math.max(0, totalAmount - paidAmount));
  const advanceRequired = Math.round(totalAmount * 0.5);
  const amountWords = numberToIndianWords(totalAmount);
  const isPaid = balance <= 0 || invoice.status === 'Paid';

  // Items resolution
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
          taxableValue: Math.round(totalAmount / 1.18),
          lineTotal: totalAmount,
        },
      ];

  const handlePrint = () => {
    try {
      downloadInvoiceDocument(invoice, customer, order, { previewOnly: true });
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleDownloadPDF = () => {
    try {
      downloadInvoiceDocument(invoice, customer, order);
      showToast(`Downloading Tax Invoice ${invoice.invoiceNo} as PDF...`, 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleSimulateEmail = () => {
    const emailTo = customer.email || 'accounts@client-enterprise.demo';
    showToast(`Simulated: Tax Invoice ${invoice.invoiceNo} successfully dispatched via Email to ${emailTo}. (Frontend simulation)`, 'success');
  };

  const handleSimulateWhatsApp = () => {
    const phoneTo = customer.phone || '+91 98490 12345';
    showToast(`Simulated: Tax Invoice ${invoice.invoiceNo} payment link sent to WhatsApp (${phoneTo}). (Frontend simulation)`, 'success');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={`Formal Tax Invoice: ${invoice.invoiceNo}`}
      subtitle={`Previewing standardized invoice document with ApexERP seller details, GST breakdown, company bank details, and dual authorization`}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Approval Status:{' '}
            <strong style={{ color: invoice.approvalStatus === 'Approved' ? '#16a34a' : '#d97706' }}>
              {invoice.approvalStatus || 'Approved'}
            </strong>
            {invoice.approvedBy && ` (Authorized by: ${invoice.approvedBy})`}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary btn-icon-text" onClick={handleSimulateEmail} title="Simulate sending invoice via email">
              <Mail size={15} />
              <span>Send Email</span>
            </button>
            <button type="button" className="btn btn-secondary btn-icon-text" onClick={handleSimulateWhatsApp} title="Simulate sending invoice via WhatsApp">
              <MessageSquare size={15} />
              <span>Send WhatsApp</span>
            </button>
            <button type="button" className="btn btn-secondary btn-icon-text" onClick={handlePrint}>
              <Printer size={15} />
              <span>Print Preview</span>
            </button>
            <button type="button" className="btn btn-primary btn-icon-text" onClick={handleDownloadPDF}>
              <Download size={15} />
              <span>Download PDF</span>
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      }
    >
      <div
        className="invoice-document-sheet"
        style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '28px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          fontSize: '12px',
          color: '#1e293b',
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
      >
        {/* 1. SELLER / COMPANY HEADER */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #2563eb',
            paddingBottom: '16px',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: '#2563eb',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '18px',
                }}
              >
                A
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                {companyConfig.name || DEFAULT_COMPANY_CONFIG.name}
              </h2>
            </div>
            <div style={{ fontSize: '11px', color: '#475569', fontWeight: '500' }}>
              {companyConfig.tagline || DEFAULT_COMPANY_CONFIG.tagline}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', maxWidth: '440px', lineHeight: '1.4' }}>
              {companyConfig.registeredAddress || DEFAULT_COMPANY_CONFIG.registeredAddress}
            </div>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
              <strong>GSTIN:</strong> {companyConfig.gstin || DEFAULT_COMPANY_CONFIG.gstin} | <strong>PAN:</strong> {companyConfig.pan || DEFAULT_COMPANY_CONFIG.pan} | <strong>CIN:</strong> {companyConfig.cin || DEFAULT_COMPANY_CONFIG.cin}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Phone: {companyConfig.phone || DEFAULT_COMPANY_CONFIG.phone} | Email: {companyConfig.email || DEFAULT_COMPANY_CONFIG.email} | Web: {companyConfig.website || DEFAULT_COMPANY_CONFIG.website}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                display: 'inline-block',
                background: isPaid ? '#dcfce7' : '#eff6ff',
                color: isPaid ? '#166534' : '#1d4ed8',
                border: isPaid ? '1px solid #bbf7d0' : '1px solid #bfdbfe',
                padding: '4px 12px',
                borderRadius: '4px',
                fontWeight: '800',
                fontSize: '13px',
                letterSpacing: '0.05em',
                marginBottom: '8px',
              }}
            >
              {isPaid ? 'TAX INVOICE (PAID IN FULL)' : 'TAX INVOICE'}
            </span>
            <div style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>
              {invoice.invoiceNo}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Invoice Date: <strong>{formatDate(invoice.invoiceDate)}</strong>
            </div>
            <div style={{ fontSize: '11px', color: isPaid ? '#166534' : '#b91c1c', marginTop: '2px' }}>
              Due Date: <strong>{formatDate(invoice.dueDate)}</strong>
            </div>
            {invoice.orderNo && (
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                Sales Order Ref: <strong className="font-mono">{invoice.orderNo}</strong>
              </div>
            )}
            {invoice.quotationNo && (
              <div style={{ fontSize: '11px', color: '#475569' }}>
                Quotation Ref: <strong className="font-mono">{invoice.quotationNo}</strong>
              </div>
            )}
          </div>
        </div>

        {/* 2. CUSTOMER BILL TO & SHIP TO */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '12px 14px',
            marginBottom: '16px',
          }}
        >
          {/* Customer Bill To */}
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Customer / Bill To &amp; Ship To
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
              {invoice.customerName}
            </div>
            <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '700', marginTop: '2px' }}>
              Customer ID: {invoice.customerDisplayId || invoice.customerId || customer.customerId || customer.id || 'CUST-001'}
            </div>
            <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}>
              Contact Person: <strong>{customer.contactPerson || 'Procurement / Finance Lead'}</strong>
            </div>
            <div style={{ fontSize: '11px', color: '#475569' }}>
              Phone: {customer.phone || invoice.customerPhone || '—'} | Email: {customer.email || invoice.customerEmail || '—'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Billing Address: {customer.address || invoice.customerAddress || customer.city || 'Commercial Industrial Premises'}
            </div>
            <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}>
              <strong>Customer GSTIN:</strong> {customer.gstin || invoice.customerGstin || '27AABCM8291F1Z8'} | State: Maharashtra (27)
            </div>
          </div>

          {/* Settlement Status & Invoice Metadata */}
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Settlement Status &amp; Accounting Terms
            </div>
            <div style={{ fontSize: '12px', color: '#0f172a', marginBottom: '3px' }}>
              Payment Status:{' '}
              <strong style={{ color: isPaid ? '#166534' : invoice.status === 'Overdue' ? '#dc2626' : '#d97706' }}>
                {invoice.status || (isPaid ? 'Paid' : 'Payment Due')}
              </strong>
            </div>
            <div style={{ fontSize: '12px', color: '#0f172a', marginBottom: '3px' }}>
              Total Invoiced Value: <strong>{formatINR(totalAmount)}</strong>
            </div>
            <div style={{ fontSize: '12px', color: '#166534', marginBottom: '3px' }}>
              Validated Payment Received: <strong>{formatINR(paidAmount)}</strong>
            </div>
            <div style={{ fontSize: '12px', color: balance > 0 ? '#dc2626' : '#166534', marginBottom: '3px' }}>
              Remaining Balance Due: <strong>{formatINR(balance)}</strong>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Internal Authorization: <strong style={{ color: '#166534' }}>{invoice.approvalStatus || 'Approved'}</strong>
              {invoice.approvedBy && ` (by ${invoice.approvedBy})`}
            </div>
          </div>
        </div>

        {/* 3. ITEMIZED PRODUCT TABLE */}
        <div style={{ marginBottom: '16px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#334155', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '8px 6px', width: '30px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '8px 8px' }}>Product ID &amp; Description</th>
                <th style={{ padding: '8px 6px', textAlign: 'center', width: '50px' }}>Qty</th>
                <th style={{ padding: '8px 6px', textAlign: 'center', width: '50px' }}>UOM</th>
                <th style={{ padding: '8px 8px', textAlign: 'right', width: '80px' }}>Unit Rate</th>
                <th style={{ padding: '8px 6px', textAlign: 'center', width: '50px' }}>Disc %</th>
                <th style={{ padding: '8px 8px', textAlign: 'right', width: '85px' }}>Taxable Val</th>
                <th style={{ padding: '8px 6px', textAlign: 'center', width: '50px' }}>GST %</th>
                <th style={{ padding: '8px 8px', textAlign: 'right', width: '80px' }}>GST Amt</th>
                <th style={{ padding: '8px 8px', textAlign: 'right', width: '95px' }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const unitPrice = Number(it.unitPrice || 0);
                const qty = Number(it.qty || it.orderedQty || 1);
                const disc = Number(it.discountPercent || 0);
                const taxable = Number(it.taxableValue || (unitPrice * qty * (1 - disc / 100)));
                const taxRate = Number(it.taxRate || 18);
                const taxAmt = taxable * (taxRate / 100);
                const lineTotal = Number(it.lineTotal || (taxable + taxAmt));

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 8px' }}>
                      <strong style={{ color: '#0f172a', display: 'block' }}>{it.productName}</strong>
                      <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                        SKU: {it.productId}
                      </span>
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: '600' }}>{qty}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b' }}>{it.uom || 'Nos'}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right' }}>{formatINR(unitPrice)}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', color: disc > 0 ? '#16a34a' : '#64748b' }}>
                      {disc > 0 ? `${disc}%` : '—'}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right' }}>{formatINR(taxable)}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b' }}>{taxRate}%</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right' }}>{formatINR(taxAmt)}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                      {formatINR(lineTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 4. FINANCIAL SUMMARY & AMOUNT IN WORDS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '16px' }}>
          <div>
            {/* Amount in words */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '12px',
              }}
            >
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700', letterSpacing: '0.04em' }}>
                Invoice Amount in Words (Indian Rupees):
              </div>
              <strong style={{ fontSize: '13px', color: '#1e40af', lineHeight: '1.4', display: 'block', marginTop: '2px' }}>
                {amountWords}
              </strong>
            </div>

            {/* Advance payment reconciliation */}
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '11px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span>Standard Advance Requirement (50%):</span>
                <strong style={{ color: '#1e40af' }}>{formatINR(advanceRequired)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span>Validated Collections Received:</span>
                <strong style={{ color: '#16a34a' }}>{formatINR(paidAmount)}</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #cbd5e1',
                  paddingTop: '3px',
                  fontWeight: '700',
                }}
              >
                <span>Balance Due Prior to Final Settlement:</span>
                <span style={{ color: balance > 0 ? '#dc2626' : '#16a34a' }}>{formatINR(balance)}</span>
              </div>
            </div>
          </div>

          {/* Totals Table */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '12px 16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#475569' }}>
              <span>Subtotal:</span>
              <span>{formatINR(invoice.totalAmount ? Math.round(invoice.totalAmount / 1.18) : totalAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#475569' }}>
              <span>CGST (9%):</span>
              <span>+{formatINR(invoice.taxBreakdown?.cgst || Math.round((totalAmount - totalAmount / 1.18) / 2))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#475569' }}>
              <span>SGST (9%):</span>
              <span>+{formatINR(invoice.taxBreakdown?.sgst || Math.round((totalAmount - totalAmount / 1.18) / 2))}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '2px solid #cbd5e1',
                paddingTop: '6px',
                marginTop: '6px',
                fontSize: '15px',
                fontWeight: '800',
                color: '#0f172a',
              }}
            >
              <span>Grand Total:</span>
              <span className="text-primary">{formatINR(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* 5. DEDICATED APEXERP COMPANY BANK DETAILS */}
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            padding: '14px',
            marginBottom: '16px',
          }}
        >
          <strong
            style={{
              fontSize: '11px',
              color: '#166534',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'block',
              marginBottom: '8px',
            }}
          >
            ApexERP Company Bank Details (Remit Payment To)
          </strong>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '8px',
              fontSize: '11px',
            }}
          >
            <div>
              <span style={{ color: '#15803d' }}>Beneficiary:</span> <strong>{bank.accountHolderName}</strong>
            </div>
            <div>
              <span style={{ color: '#15803d' }}>Bank &amp; Branch:</span> <strong>{bank.bankName} ({bank.branch})</strong>
            </div>
            <div>
              <span style={{ color: '#15803d' }}>A/C Number:</span> <strong className="font-mono">{bank.accountNumber}</strong>
            </div>
            <div>
              <span style={{ color: '#15803d' }}>IFSC Code:</span> <strong className="font-mono">{bank.ifscCode}</strong>
            </div>
            <div>
              <span style={{ color: '#15803d' }}>Collection UPI:</span> <strong>{bank.upiId}</strong>
            </div>
          </div>
        </div>

        {/* 6. 15 STANDARD COMMERCIAL TERMS & CONDITIONS */}
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
            Commercial Terms &amp; Conditions of Sale
          </div>
          <ol style={{ paddingLeft: '18px', margin: 0, fontSize: '10.5px', color: '#475569', lineHeight: '1.45' }}>
            {terms.map((t, idx) => (
              <li key={idx} style={{ marginBottom: '2px' }}>
                {t}
              </li>
            ))}
          </ol>
        </div>

        {/* 7. DUAL AUTHORIZATION SIGNATURES */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '40px',
            borderTop: '1px solid #cbd5e1',
            paddingTop: '20px',
            marginTop: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700', marginBottom: '24px' }}>
              Authorized by Admin / Commercial Operations:
            </div>
            <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '6px', width: '220px' }}>
              <strong style={{ color: '#0f172a', display: 'block' }}>Ananya Roy</strong>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Head of Commercial Sales • ApexERP HQ</span>
            </div>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700', marginBottom: '24px' }}>
              Authorized by Finance / Accountant:
            </div>
            <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '6px', width: '240px', textAlign: 'right' }}>
              <strong style={{ color: '#0f172a', display: 'block' }}>
                {invoice.approvedBy || 'Rajesh Singhania'}
              </strong>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                {invoice.approvedRole || 'Accountant'} • Finance &amp; Accounts Division
              </span>
              <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '600' }}>✓ Verified Electronic Signatory</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>
          This is a computer-generated tax invoice issued via ApexERP Commercial System under Section 31 of CGST Act. Retain for GST Input Tax Credit.
        </div>
      </div>
    </Modal>
  );
}
