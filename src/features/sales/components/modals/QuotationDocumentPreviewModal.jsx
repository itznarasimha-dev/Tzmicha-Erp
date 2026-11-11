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
} from 'lucide-react';
import Modal from '../common/Modal';
import { formatINR, formatDate } from '../../utils/formatters';
import { numberToIndianWords, downloadQuotationDocument } from '../../utils/documentGenerator';
import { DEFAULT_COMPANY_CONFIG } from '../../data/mockData';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';

export default function QuotationDocumentPreviewModal({ isOpen, onClose, quotation }) {
  const { companyConfig = DEFAULT_COMPANY_CONFIG, userRole } = useSales();
  const { showToast } = useToast();

  if (!quotation) return null;

  const terms = quotation.termsAndConditions || companyConfig.defaultTerms || DEFAULT_COMPANY_CONFIG.defaultTerms;
  const bank = companyConfig.bankDetails || DEFAULT_COMPANY_CONFIG.bankDetails;
  const signatory = companyConfig.authorizedSignatory || DEFAULT_COMPANY_CONFIG.authorizedSignatory;

  const advanceRequired = Math.round(Number(quotation.grandTotal || 0) * 0.5);
  const advanceReceived = Number(quotation.advanceReceived || 0);
  const balanceDue = Number(quotation.grandTotal || 0) - advanceReceived;
  const amountWords = numberToIndianWords(quotation.grandTotal || 0);

  const handlePrint = () => {
    try {
      downloadQuotationDocument(quotation, { previewOnly: true, bypassSecurityCheck: true });
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleDownloadPDF = () => {
    try {
      downloadQuotationDocument(quotation, { bypassSecurityCheck: true });
      showToast(`Downloading quotation ${quotation.quotationNo} as PDF...`, 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={`Formal Quotation Document: ${quotation.quotationNo}`}
      subtitle={`Previewing standardized quotation layout with ApexERP seller branding, customer bill-to, and company bank details`}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Status: <strong style={{ color: quotation.status === 'Approved' ? '#16a34a' : '#d97706' }}>{quotation.status}</strong>
            {quotation.approvedBy && ` (Approved by: ${quotation.approvedBy})`}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
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
        className="quotation-document-sheet"
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
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', maxWidth: '420px', lineHeight: '1.4' }}>
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
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                padding: '4px 12px',
                borderRadius: '4px',
                fontWeight: '800',
                fontSize: '13px',
                letterSpacing: '0.05em',
                marginBottom: '8px',
              }}
            >
              QUOTATION
            </span>
            <div style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>
              {quotation.quotationNo}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Date: <strong>{formatDate(quotation.createdDate)}</strong>
            </div>
            <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '2px' }}>
              Valid Until: <strong>{formatDate(quotation.validUntil)}</strong> (15 Days)
            </div>
          </div>
        </div>

        {/* 2. PARTIES & COMMERCIAL TERMS GRID */}
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
              {quotation.customerName}
            </div>
            <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '700', marginTop: '2px' }}>
              Customer ID: {quotation.customerDisplayId || quotation.customerId}
            </div>
            <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}>
              Contact: <strong>{quotation.contactPerson || 'Procurement In-Charge'}</strong>
            </div>
            <div style={{ fontSize: '11px', color: '#475569' }}>
              Phone: {quotation.customerPhone || '—'} | Email: {quotation.customerEmail || '—'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Address: {quotation.customerAddress || 'Client Site / Works'}
            </div>
            <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}>
              <strong>GSTIN:</strong> {quotation.customerGstin || 'Unregistered / On File'}
            </div>
          </div>

          {/* Quotation Metadata */}
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Commercial Terms &amp; Ownership
            </div>
            <div style={{ fontSize: '12px', color: '#0f172a', marginBottom: '3px' }}>
              Payment Terms: <strong>{quotation.paymentTerms || '50% Advance, Balance Before Dispatch'}</strong>
            </div>
            <div style={{ fontSize: '12px', color: '#0f172a', marginBottom: '3px' }}>
              Delivery Terms: <strong>{quotation.deliveryTerms || 'Ex-Works Pune Central Plant (7-10 Days)'}</strong>
            </div>
            <div style={{ fontSize: '12px', color: '#0f172a', marginBottom: '3px' }}>
              Prepared By: <strong>{quotation.salesOwner || quotation.createdByName || 'Sales Staff'}</strong> ({quotation.createdByRole ? quotation.createdByRole.replace('_', ' ') : 'Sales'})
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Approval Status: <strong style={{ color: quotation.status === 'Approved' ? '#16a34a' : '#d97706' }}>{quotation.status}</strong>
              {quotation.approvedBy && ` (Authorized by ${quotation.approvedBy})`}
            </div>
          </div>
        </div>

        {/* 3. ITEMIZED PRODUCT TABLE */}
        <div style={{ marginBottom: '16px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#334155', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '8px 6px', width: '30px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '8px 8px' }}>Product Description</th>
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
              {(quotation.items || []).map((it, idx) => {
                const itemSub = Number(it.unitPrice || 0) * Number(it.qty || 1);
                const discAmt = itemSub * (Number(it.discountPercent || 0) / 100);
                const taxable = itemSub - discAmt;
                const gstAmt = taxable * (Number(it.taxRate || 18) / 100);
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 8px' }}>
                      <strong style={{ color: '#0f172a' }}>{it.productName}</strong>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>SKU: {it.productId}</div>
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: '600' }}>{it.qty}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b' }}>{it.uom || 'Nos'}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right' }}>{formatINR(it.unitPrice)}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', color: it.discountPercent > 0 ? '#16a34a' : '#64748b' }}>
                      {it.discountPercent || 0}%
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right' }}>{formatINR(taxable)}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b' }}>{it.taxRate || 18}%</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right' }}>{formatINR(gstAmt)}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                      {formatINR(it.lineTotal || (taxable + gstAmt))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 4. FINANCIAL SUMMARY & AMOUNT IN WORDS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700', display: 'block' }}>
                Amount in Words (INR):
              </span>
              <strong style={{ fontSize: '12px', color: '#1e40af', lineHeight: '1.4' }}>
                {amountWords}
              </strong>
            </div>

            {/* Advance & Balance Breakdown */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '10px 12px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span>Standard Advance Required (50%):</span>
                <strong style={{ color: '#1e40af' }}>{formatINR(advanceRequired)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span>Advance Received to Date:</span>
                <strong style={{ color: '#16a34a' }}>{formatINR(advanceReceived)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '3px', fontWeight: '700' }}>
                <span>Balance Payable Before Dispatch:</span>
                <span style={{ color: '#0f172a' }}>{formatINR(balanceDue)}</span>
              </div>
            </div>
          </div>

          {/* Mathematical Summary Column */}
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#64748b' }}>Subtotal (Ex-Works):</span>
              <strong style={{ color: '#0f172a' }}>{formatINR(quotation.subtotal)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#64748b' }}>Discount Total:</span>
              <span style={{ color: '#16a34a', fontWeight: '600' }}>- {formatINR(quotation.discountTotal || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#64748b' }}>Taxable Value:</span>
              <span>{formatINR((quotation.subtotal || 0) - (quotation.discountTotal || 0))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>Applicable GST:</span>
              <span style={{ fontWeight: '600' }}>+ {formatINR(quotation.taxTotal || 0)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '2px solid #0f172a',
                paddingTop: '6px',
                fontSize: '14px',
                fontWeight: '800',
                color: '#0f172a',
              }}
            >
              <span>Total Quotation Value:</span>
              <span style={{ color: '#2563eb' }}>{formatINR(quotation.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* 5. DEDICATED APEXERP COMPANY BANK DETAILS */}
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            padding: '12px 14px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <CreditCard size={15} className="text-success" />
            <strong style={{ fontSize: '12px', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ApexERP Company Bank Details (Remit Payment To)
            </strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '11px' }}>
            <div>
              <span style={{ color: '#15803d', display: 'block' }}>Account Holder Name:</span>
              <strong style={{ color: '#0f172a' }}>{bank.accountHolderName}</strong>
            </div>
            <div>
              <span style={{ color: '#15803d', display: 'block' }}>Bank Name &amp; Branch:</span>
              <strong style={{ color: '#0f172a' }}>{bank.bankName} — {bank.branch}</strong>
            </div>
            <div>
              <span style={{ color: '#15803d', display: 'block' }}>Current Account Number:</span>
              <strong style={{ color: '#1e40af', fontFamily: 'monospace', fontSize: '12px' }}>{bank.accountNumber}</strong>
            </div>
            <div>
              <span style={{ color: '#15803d', display: 'block' }}>RTGS / NEFT / IFSC Code:</span>
              <strong style={{ color: '#1e40af', fontFamily: 'monospace', fontSize: '12px' }}>{bank.ifscCode}</strong>
            </div>
            <div>
              <span style={{ color: '#15803d', display: 'block' }}>Official UPI Collection ID:</span>
              <strong style={{ color: '#0f172a' }}>{bank.upiId}</strong>
            </div>
          </div>
        </div>

        {/* 6. 15 COMMERCIAL TERMS & CONDITIONS CLAUSES */}
        <div style={{ marginBottom: '18px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
          <h4 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Commercial Terms &amp; Standard Conditions of Sale
          </h4>
          <ol style={{ paddingLeft: '18px', margin: 0, fontSize: '10px', color: '#475569', lineHeight: '1.5' }}>
            {terms.map((t) => (
              <li key={t.id} style={{ marginBottom: '3px' }}>
                <strong>{t.title}:</strong> {t.clause}
              </li>
            ))}
          </ol>
        </div>

        {/* 7. DUAL AUTHORIZATION SIGNATURES */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '32px',
            borderTop: '1px solid #cbd5e1',
            paddingTop: '20px',
            marginTop: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700', marginBottom: '24px' }}>
              Prepared &amp; Submitted By:
            </div>
            <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '6px', width: '220px' }}>
              <strong style={{ color: '#0f172a', display: 'block' }}>
                {quotation.salesOwner || quotation.createdByName || 'Sales Staff'}
              </strong>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                {quotation.createdByRole ? quotation.createdByRole.replace('_', ' ') : 'Sales Division'} • ApexERP
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700', marginBottom: '24px' }}>
              For ApexERP Industrial Solutions Pvt. Ltd.:
            </div>
            <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '6px', width: '260px', textAlign: 'right' }}>
              <strong style={{ color: '#0f172a', display: 'block' }}>
                {signatory.name || 'Ananya Roy'}
              </strong>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>
                {signatory.designation || 'Head of Commercial Sales / Sales Manager'}
              </span>
              <span style={{ fontSize: '9px', color: '#1e40af', fontWeight: '600' }}>
                {signatory.signatureBlock || 'Authorized Signatory — Commercial Sales Division'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}