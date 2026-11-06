import { useState, useMemo, useEffect } from 'react';
import Modal from '../common/Modal';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate } from '../../utils/formatters';
import { DEFAULT_COMPANY_CONFIG } from '../../data/mockData';
import {
  MessageSquare,
  Mail,
  Send,
  ExternalLink,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Copy,
  Clock,
  Phone,
} from 'lucide-react';

export default function PaymentReminderModal({
  isOpen,
  onClose,
  invoice,
  customer: propCustomer = null,
  order: propOrder = null,
}) {
  const { customers, orders, dispatches, recordPaymentReminder, userProfile, userRole, companyConfig = DEFAULT_COMPANY_CONFIG } = useSales();
  const { showToast } = useToast();

  const [channel, setChannel] = useState('whatsapp'); // 'whatsapp' | 'email'
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [copied, setCopied] = useState(false);

  // Resolve customer record
  const customer = useMemo(() => {
    if (propCustomer) return propCustomer;
    if (!invoice) return null;
    return customers.find(
      (c) => c.id === invoice.customerId || c.customerId === invoice.customerId || c.name === invoice.customerName
    ) || {};
  }, [propCustomer, invoice, customers]);

  // Resolve linked sales order
  const order = useMemo(() => {
    if (propOrder) return propOrder;
    if (!invoice || !invoice.orderNo) return null;
    return orders.find((o) => o.orderNo === invoice.orderNo || o.id === invoice.orderNo);
  }, [propOrder, invoice, orders]);

  // Resolve linked dispatch note if available
  const dispatch = useMemo(() => {
    if (!invoice) return null;
    return dispatches.find((d) => d.orderNo === invoice.orderNo || d.customerId === invoice.customerId);
  }, [invoice, dispatches]);

  // Determine scenario:
  // Scenario A: Partially Paid Invoice (has paid > 0, balance > 0)
  // Scenario B: Overdue Invoice (dueDate < today or status === 'Overdue')
  // Scenario C: Payment Due Soon (not overdue, balance > 0)
  const scenarioInfo = useMemo(() => {
    if (!invoice) return { scenario: 'due_soon', title: 'Payment Due Notice' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let isOverdue = invoice.status === 'Overdue';
    if (invoice.dueDate) {
      const due = new Date(invoice.dueDate);
      due.setHours(0, 0, 0, 0);
      if (due < today) isOverdue = true;
    }

    const paid = Number(invoice.paidAmount || 0);
    const balance = Number(invoice.balance !== undefined ? invoice.balance : (Number(invoice.totalAmount || 0) - paid));

    if (isOverdue) {
      return {
        scenario: 'overdue',
        badge: 'Scenario B: Overdue Invoice',
        title: 'Urgent Overdue Settlement Reminder',
        color: '#dc2626',
        bg: '#fee2e2',
        border: '#fca5a5',
      };
    }

    if (paid > 0 && balance > 0) {
      return {
        scenario: 'partially_paid',
        badge: 'Scenario A: Partially Paid Invoice',
        title: 'Partial Payment Reconciliation & Balance Request',
        color: '#d97706',
        bg: '#fef3c7',
        border: '#fde68a',
      };
    }

    return {
      scenario: 'due_soon',
      badge: 'Scenario C: Payment Due Soon',
      title: 'Upcoming Payment Due Notice',
      color: '#2563eb',
      bg: '#eff6ff',
      border: '#bfdbfe',
    };
  }, [invoice]);

  // Auto-generate customized template message based on Scenario A, B, or C
  useEffect(() => {
    if (!invoice || !isOpen) return;

    const bank = companyConfig.bankDetails || DEFAULT_COMPANY_CONFIG.bankDetails;
    const senderName = userProfile?.fullName || 'Sales Representative';
    const senderRole = userProfile?.jobTitle || (userRole === 'sales_manager' ? 'Sales Manager' : userRole === 'sales_coordinator' ? 'Sales Coordinator' : 'Senior Sales Representative');
    const senderPhone = userProfile?.phone || companyConfig.phone || '+91 20 6712 4000';
    const contactPerson = customer?.contactPerson || 'Procurement & Finance Lead';
    const customerName = invoice.customerName || customer?.name || 'Valued Customer';
    const balanceStr = formatINR(invoice.balance);
    const totalStr = formatINR(invoice.totalAmount);
    const paidStr = formatINR(invoice.paidAmount || 0);
    const dueStr = formatDate(invoice.dueDate);
    const orderNo = invoice.orderNo || 'SO-2026';
    const invoiceNo = invoice.invoiceNo;

    // Delivery details string if available
    const deliveryDetailStr = dispatch
      ? `Consignment ${dispatch.dispatchNo} was ${dispatch.status.toLowerCase()} via ${dispatch.carrier} (Tracking: ${dispatch.trackingNo})${dispatch.deliveredDate ? ` and delivered on ${formatDate(dispatch.deliveredDate)}` : ''}.`
      : `Goods corresponding to Sales Order ${orderNo} have been fulfilled and dispatched in good condition.`;

    let generatedSubject = '';
    let generatedBody = '';

    if (scenarioInfo.scenario === 'partially_paid') {
      generatedSubject = `Payment Acknowledgement & Outstanding Balance Reminder: Invoice ${invoiceNo} (Order ${orderNo})`;
      generatedBody =
`Dear ${contactPerson},

Greetings from ApexERP Industrial Solutions Pvt. Ltd.

We would like to acknowledge and thank you for the payment of ${paidStr} received towards Tax Invoice ${invoiceNo} (linked to Sales Order ${orderNo}).

${deliveryDetailStr}

As per our commercial terms, the remaining outstanding balance of ${balanceStr} is now due for settlement by ${dueStr}. We kindly request you to process the pending settlement at your earliest convenience to reconcile the account.

Remittance Bank Details:
• Beneficiary: ${bank.accountHolderName}
• Bank & Branch: ${bank.bankName} (${bank.branch})
• Current A/C: ${bank.accountNumber}
• IFSC Code: ${bank.ifscCode}
• Collection UPI: ${bank.upiId}

Kindly share the UTR / bank reference number once transferred so our Finance department can issue the final payment receipt.

Warm regards,

${senderName}
${senderRole}
ApexERP Industrial Solutions Pvt. Ltd.
Phone: ${senderPhone}
Email: ${userProfile?.email || companyConfig.email}`;
    } else if (scenarioInfo.scenario === 'overdue') {
      generatedSubject = `URGENT: Overdue Payment Notice — Invoice ${invoiceNo} (${customerName})`;
      generatedBody =
`URGENT & CONFIDENTIAL: Payment Overdue Notice

Dear ${contactPerson},

Greetings from ApexERP Industrial Solutions Pvt. Ltd.

This is an urgent reminder that Tax Invoice ${invoiceNo} for Sales Order ${orderNo} (Total Invoiced: ${totalStr}) had a due date of ${dueStr} and is currently OVERDUE with an outstanding balance of ${balanceStr}.

We understand operational delays may happen, but we request your immediate cooperation to settle this balance within 48 hours to maintain uninterrupted supply and avoid commercial credit holds.

${deliveryDetailStr}

Bank Transfer Details:
• Beneficiary: ${bank.accountHolderName}
• Bank: ${bank.bankName} (${bank.branch})
• Current A/C No: ${bank.accountNumber}
• IFSC Code: ${bank.ifscCode}
• Instant UPI: ${bank.upiId}

Please forward the UTR / transaction receipt immediately upon remittance so we may update the accounts ledger.

Sincerely,

${senderName}
${senderRole}
ApexERP Industrial Solutions Pvt. Ltd.
Phone: ${senderPhone}
Email: ${userProfile?.email || companyConfig.email}`;
    } else {
      // Scenario C: Due Soon
      generatedSubject = `Upcoming Payment Notice: Tax Invoice ${invoiceNo} due on ${dueStr}`;
      generatedBody =
`Dear ${contactPerson},

Greetings from ApexERP Industrial Solutions Pvt. Ltd.

This is a friendly reminder that Tax Invoice ${invoiceNo} in the amount of ${balanceStr} for Sales Order ${orderNo} is scheduled for payment on ${dueStr}.

${deliveryDetailStr}

Kindly arrange to schedule this payment for timely processing. Bank remittance details are provided below for your reference:

• Beneficiary: ${bank.accountHolderName}
• Bank & Branch: ${bank.bankName} (${bank.branch})
• Current A/C: ${bank.accountNumber}
• IFSC Code: ${bank.ifscCode}
• Collection UPI: ${bank.upiId}

If you have already initiated this transaction, please disregard this notice or reply with the UTR number for confirmation.

Best regards,

${senderName}
${senderRole}
ApexERP Industrial Solutions Pvt. Ltd.
Phone: ${senderPhone}
Email: ${userProfile?.email || companyConfig.email}`;
    }

    setSubject(generatedSubject);
    setMessageBody(generatedBody);

    // Pre-populate recipient based on channel
    if (channel === 'whatsapp') {
      const phone = customer?.phone || customer?.mobile || '';
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      setRecipient(cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone || '919820011223');
    } else {
      setRecipient(customer?.email || 'accounts@clientcompany.demo');
    }
  }, [invoice, customer, order, dispatch, scenarioInfo, companyConfig, userProfile, userRole, isOpen, channel]);

  // Handle channel change
  const handleChannelChange = (newChannel) => {
    setChannel(newChannel);
    if (newChannel === 'whatsapp') {
      const phone = customer?.phone || customer?.mobile || '';
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      setRecipient(cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone || '919820011223');
    } else {
      setRecipient(customer?.email || 'accounts@clientcompany.demo');
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageBody);
    setCopied(true);
    showToast('Reminder message copied to clipboard', 'info');
    setTimeout(() => setCopied(false), 2500);
  };

  // Launch WhatsApp with explicit user action
  const handleLaunchWhatsApp = () => {
    if (!recipient.trim()) {
      showToast('Please provide a valid recipient phone number.', 'danger');
      return;
    }

    const cleanNumber = recipient.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(messageBody);
    const waUrl = `https://wa.me/${cleanNumber}?text=${encoded}`;

    // Record the reminder action in context and audit logs
    recordPaymentReminder({
      invoiceNo: invoice.invoiceNo,
      orderNo: invoice.orderNo,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      channel: 'WhatsApp',
      recipient: cleanNumber,
      message: messageBody,
      status: 'Opened in WhatsApp',
      scenario: scenarioInfo.scenario,
    });

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    showToast(`WhatsApp reminder prepared for ${invoice.customerName} (${cleanNumber})`, 'success');
    onClose();
  };

  // Launch Email client with explicit user action
  const handleLaunchEmail = () => {
    if (!recipient.trim()) {
      showToast('Please provide a valid recipient email address.', 'danger');
      return;
    }

    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(messageBody);
    const mailtoUrl = `mailto:${recipient}?subject=${encodedSubject}&body=${encodedBody}`;

    // Record the reminder action in context and audit logs
    recordPaymentReminder({
      invoiceNo: invoice.invoiceNo,
      orderNo: invoice.orderNo,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      channel: 'Email',
      recipient: recipient,
      message: messageBody,
      status: 'Opened in Email',
      scenario: scenarioInfo.scenario,
    });

    window.location.href = mailtoUrl;
    showToast(`Email client opened with payment reminder for ${recipient}`, 'success');
    onClose();
  };

  // Just log and mark sent without external app
  const handleLogSent = () => {
    recordPaymentReminder({
      invoiceNo: invoice.invoiceNo,
      orderNo: invoice.orderNo,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      channel: channel === 'whatsapp' ? 'WhatsApp' : 'Email',
      recipient: recipient,
      message: messageBody,
      status: 'Sent',
      scenario: scenarioInfo.scenario,
    });

    showToast(`Payment reminder logged and marked as Sent for invoice ${invoice.invoiceNo}`, 'success');
    onClose();
  };

  if (!invoice) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={`Payment Collection Follow-up: ${invoice.invoiceNo}`}
      subtitle={`Customer: ${invoice.customerName} • Outstanding: ${formatINR(invoice.balance)}`}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-icon-text"
              onClick={handleCopyMessage}
              title="Copy message to clipboard"
            >
              <Copy size={14} />
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleLogSent}
              title="Record reminder activity in ERP audit trail without opening external client"
            >
              <span>Mark as Sent / Log Activity</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            {channel === 'whatsapp' ? (
              <button
                type="button"
                className="btn btn-primary btn-icon-text"
                style={{ backgroundColor: '#16a34a', borderColor: '#15803d' }}
                onClick={handleLaunchWhatsApp}
              >
                <ExternalLink size={15} />
                <span>Open in WhatsApp</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-icon-text"
                onClick={handleLaunchEmail}
              >
                <Mail size={15} />
                <span>Launch Email Client</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="payment-reminder-composer">
        {/* Scenario Banner */}
        <div
          style={{
            backgroundColor: scenarioInfo.bg,
            border: `1px solid ${scenarioInfo.border}`,
            color: scenarioInfo.color,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <span
              style={{
                display: 'inline-block',
                fontWeight: '700',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '2px',
              }}
            >
              {scenarioInfo.badge}
            </span>
            <div style={{ fontWeight: '700', fontSize: '14px' }}>{scenarioInfo.title}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px' }}>
            <div>Due Date: <strong>{formatDate(invoice.dueDate)}</strong></div>
            <div>Balance: <strong style={{ fontSize: '13px' }}>{formatINR(invoice.balance)}</strong></div>
          </div>
        </div>

        {/* Channel Selector Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
            Communication Channel:
          </span>
          <button
            type="button"
            className={`btn btn-sm ${channel === 'whatsapp' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: channel === 'whatsapp' ? '#16a34a' : '',
              borderColor: channel === 'whatsapp' ? '#15803d' : '',
            }}
            onClick={() => handleChannelChange('whatsapp')}
          >
            <MessageSquare size={14} />
            <span>WhatsApp Reminder</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${channel === 'email' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => handleChannelChange('email')}
          >
            <Mail size={14} />
            <span>Email Reminder</span>
          </button>
        </div>

        {/* Recipient Details */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'grid',
            gridTemplateColumns: channel === 'email' ? '1fr 2fr' : '1fr',
            gap: '12px',
          }}
        >
          <div>
            <label className="form-label" style={{ fontWeight: '600', fontSize: '12px' }}>
              {channel === 'whatsapp' ? 'Customer WhatsApp Number (with Country Code)' : 'Customer Recipient Email'}
            </label>
            <input
              type="text"
              className="form-control"
              style={{ fontSize: '13px' }}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={channel === 'whatsapp' ? 'e.g. 919820011223' : 'accounts@client.com'}
            />
          </div>

          {channel === 'email' && (
            <div>
              <label className="form-label" style={{ fontWeight: '600', fontSize: '12px' }}>
                Email Subject Line
              </label>
              <input
                type="text"
                className="form-control"
                style={{ fontSize: '13px' }}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Editable Message Composer */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label className="form-label font-semibold" style={{ margin: 0, fontSize: '12px' }}>
              Personalized Customer Message (Review &amp; Edit Before Sending)
            </label>
            <span className="text-xs text-muted">
              Auto-populated with customer context, dispatch status &amp; ApexERP bank remittance details
            </span>
          </div>
          <textarea
            className="form-control font-mono"
            rows={12}
            style={{
              fontSize: '12px',
              lineHeight: '1.5',
              padding: '12px',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
            }}
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
          />
        </div>

        {/* Security & Action Transparency Notice */}
        <div
          style={{
            fontSize: '11px',
            color: '#64748b',
            background: '#f1f5f9',
            padding: '8px 12px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Clock size={14} className="text-primary" />
          <span>
            <strong>Audit Transparency:</strong> Clicking &ldquo;Open in WhatsApp&rdquo; or &ldquo;Launch Email Client&rdquo; explicitly requests confirmation and opens the secure external client while logging this collection activity into the customer history.
          </span>
        </div>
      </div>
    </Modal>
  );
}
