import { useState } from 'react';
import Modal from '../common/Modal';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate } from '../../utils/formatters';
import { Mail, Paperclip, Send, AlertTriangle, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';
import { downloadQuotationDocument } from '../../utils/documentGenerator';

export default function SendQuotationEmailModal({ isOpen, onClose, quotation, customer }) {
  const { sendQuotationEmail, emailConfig, userProfile } = useSales();
  const { showToast } = useToast();

  const recipientEmail = customer?.email || quotation?.customerEmail || '';
  const defaultCC = 'sneha.patil@apexerpsolutions.demo, ananya.roy@apexerpsolutions.demo';

  const defaultBody = `Dear ${quotation?.customerName || 'Valued Customer'},

Please find attached our official commercial quotation ${quotation?.quotationNo} for your review.

Quotation Summary:
• Quotation Number: ${quotation?.quotationNo}
• Total Amount: ${quotation ? formatINR(quotation.grandTotal) : ''} (including applicable GST)
• Valid Until: ${quotation ? formatDate(quotation.validUntil) : ''}
• Payment Terms: ${quotation?.paymentTerms || '30 Days Net'}
• Delivery Terms: ${quotation?.deliveryTerms || 'Immediate / Ex-Works'}

If you have any questions or wish to confirm this proposal, please reply to this email or contact your sales representative directly.

Warm regards,
${userProfile?.fullName || 'Sales Team'}
Apex Industrial Solutions Pvt. Ltd.`;

  const [to, setTo] = useState(recipientEmail);
  const [cc, setCc] = useState(defaultCC);
  const [subject, setSubject] = useState(`Commercial Quotation ${quotation?.quotationNo} - Apex Industrial Solutions`);
  const [message, setMessage] = useState(defaultBody);
  const [isSending, setIsSending] = useState(false);
  const [configNotice, setConfigNotice] = useState(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  if (!quotation) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!to || !to.trim()) {
      showToast('Recipient email address (To) is required', 'danger');
      return;
    }

    setIsSending(true);
    setConfigNotice(null);

    try {
      await sendQuotationEmail({
        quotationId: quotation.id,
        to,
        cc,
        subject,
        message,
      });

      setSendSuccess(true);
      showToast(`Quotation ${quotation.quotationNo} emailed successfully to ${to}`, 'success');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      if (err.isConfigMissing) {
        setConfigNotice(err.message);
      } else {
        showToast(err.message || 'Failed to send email', 'danger');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleMailtoFallback = () => {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(message);
    const encodedCc = encodeURIComponent(cc);
    const mailtoUrl = `mailto:${encodeURIComponent(to)}?cc=${encodedCc}&subject=${encodedSubject}&body=${encodedBody}`;
    window.open(mailtoUrl, '_blank');
    showToast('Draft opened in local email client', 'info');
  };

  const handlePreviewPdf = () => {
    downloadQuotationDocument(quotation, { previewOnly: true });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={`Send Quotation via Email: ${quotation.quotationNo}`}
      subtitle={`Email formal commercial proposal to ${quotation.customerName}`}
    >
      <form onSubmit={handleSend} className="space-y-4">
        {sendSuccess ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Quotation email successfully transmitted!</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Dispatch has been registered in the system communications log.
              </p>
            </div>
          </div>
        ) : null}

        {configNotice && (
          <div
            className="p-3.5 rounded-lg border text-xs"
            style={{
              backgroundColor: '#fffbeb',
              borderColor: '#fde68a',
              color: '#92400e',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  Email Transport Integration Required
                </div>
                <div style={{ lineHeight: '1.4', marginBottom: '8px', color: '#78350f' }}>
                  {configNotice}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleMailtoFallback}
                    className="btn btn-sm btn-icon-text"
                    style={{
                      backgroundColor: '#d97706',
                      color: '#ffffff',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <ExternalLink size={12} />
                    <span>Open Draft in Local Email Client</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePreviewPdf}
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                  >
                    Preview Attached Quotation PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          {/* Sender */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              From (Company Sender)
            </label>
            <input
              type="text"
              readOnly
              className="form-input"
              value={`${emailConfig?.fromName || 'Apex Industrial Solutions'} <${emailConfig?.fromEmail || 'quotations@apexerpsolutions.demo'}>`}
              style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
            />
          </div>

          {/* Recipient To */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
              To (Customer Recipient) *
            </label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="customer@domain.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          {/* CC */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
              CC (Sales Team &amp; Coordinator)
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="coordinator@domain.com, manager@domain.com"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
            />
            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'block' }}>
              Comma-separated list of sales internal recipients
            </span>
          </div>

          {/* Subject */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
              Subject *
            </label>
            <input
              type="text"
              required
              className="form-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Attachment chip */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
              Attached Document
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} style={{ color: '#dc2626' }} />
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                    {quotation.quotationNo}_Commercial_Proposal.pdf
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>
                    (Auto-generated official PDF)
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handlePreviewPdf}
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                Preview Document
              </button>
            </div>
          </div>

          {/* Message Body */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
              Cover Message
            </label>
            <textarea
              rows={8}
              className="form-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ fontFamily: 'inherit', fontSize: '13px', lineHeight: '1.5' }}
            />
          </div>
        </div>

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSending}
            className="btn btn-primary btn-icon-text"
          >
            <Send size={14} />
            <span>{isSending ? 'Sending Proposal...' : 'Send Quotation Email'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
