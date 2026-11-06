import { useState } from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate } from '../../utils/formatters';
import { downloadInvoiceDocument } from '../../utils/documentGenerator';
import {
  FileText,
  Mail,
  Send,
  CheckCircle2,
  Printer,
  Download,
  Phone,
  ShieldCheck,
  Building,
  User,
  Calendar,
  Layers,
  ArrowRight,
  Check,
} from 'lucide-react';

export default function SalesInvoicePreviewModal({
  isOpen,
  onClose,
  order,
  precreatedInvoice = null,
}) {
  const { customers, createInvoiceForOrder, sendInvoiceEmail, sendInvoiceWhatsApp } = useSales();
  const { showToast } = useToast();

  const [activeInvoice, setActiveInvoice] = useState(precreatedInvoice);
  const [isCreated, setIsCreated] = useState(Boolean(precreatedInvoice));
  const [emailInput, setEmailInput] = useState('');
  const [whatsAppInput, setWhatsAppInput] = useState('');
  const [emailStatus, setEmailStatus] = useState(precreatedInvoice?.emailSent ? 'sent' : 'idle'); // 'idle' | 'sending' | 'sent'
  const [whatsAppStatus, setWhatsAppStatus] = useState(precreatedInvoice?.whatsAppSent ? 'sent' : 'idle'); // 'idle' | 'sending' | 'sent'
  const [emailTimestamp, setEmailTimestamp] = useState(precreatedInvoice?.emailSentAt || null);
  const [whatsAppTimestamp, setWhatsAppTimestamp] = useState(precreatedInvoice?.whatsAppSentAt || null);

  if (!isOpen || (!order && !activeInvoice)) return null;

  const customer = customers.find(
    (c) => c.id === (activeInvoice?.customerId || order?.customerId)
  ) || {
    name: activeInvoice?.customerName || order?.customerName || 'Customer',
    contactPerson: 'Purchasing Department',
    phone: '+91 98101 44219',
    email: 'accounts@clientdomain.com',
    address: 'Regional Commercial Hub',
    gstin: '09AAACA1122D1Z1',
  };

  const invoiceNo = activeInvoice?.invoiceNo || `INV-2026-${Math.floor(100 + Math.random() * 900)}`;
  const orderNo = activeInvoice?.orderNo || order?.orderNo || 'SO-2026-XXX';
  const today = activeInvoice?.invoiceDate || new Date().toISOString().split('T')[0];
  const dueDate = activeInvoice?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const items = activeInvoice?.items || order?.items || [];
  const totalAmount = activeInvoice ? activeInvoice.totalAmount : (order?.totalAmount || 0);
  const paidAmount = activeInvoice ? activeInvoice.paidAmount : (order?.amountPaid || 0);
  const balance = Math.max(0, totalAmount - paidAmount);

  const effectiveEmail = emailInput || customer.email || 'accounts@clientdomain.com';
  const effectivePhone = whatsAppInput || customer.phone || '+91 98000 00000';

  const handleCreateInvoice = () => {
    try {
      if (!order) return;
      const created = createInvoiceForOrder(order.id);
      setActiveInvoice(created);
      setIsCreated(true);
      showToast(`Tax Invoice ${created.invoiceNo} successfully generated & issued!`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to create invoice', 'danger');
    }
  };

  const handleSendEmail = () => {
    setEmailStatus('sending');
    setTimeout(() => {
      setEmailStatus('sent');
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setEmailTimestamp(timeStr);
      if (sendInvoiceEmail && activeInvoice) {
        sendInvoiceEmail(activeInvoice.id || activeInvoice.invoiceNo, effectiveEmail);
      }
      showToast(`Tax invoice PDF dispatched to ${effectiveEmail}`, 'success');
    }, 700);
  };

  const handleSendWhatsApp = () => {
    setWhatsAppStatus('sending');
    setTimeout(() => {
      setWhatsAppStatus('sent');
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setWhatsAppTimestamp(timeStr);
      if (sendInvoiceWhatsApp && activeInvoice) {
        sendInvoiceWhatsApp(activeInvoice.id || activeInvoice.invoiceNo, effectivePhone);
      }
      showToast(`WhatsApp digital invoice link sent to ${effectivePhone}`, 'success');
    }, 700);
  };

  const handleDownloadPdf = () => {
    downloadInvoiceDocument(
      activeInvoice || {
        invoiceNo,
        orderNo,
        customerName: customer.name,
        invoiceDate: today,
        dueDate,
        totalAmount,
        paidAmount,
        balance,
        status: balance === 0 ? 'Paid' : 'Partially Paid',
        items,
      },
      customer,
      order || {}
    );
    showToast(`Downloading Tax Invoice ${invoiceNo}`, 'success');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xlarge"
      title={isCreated ? `Official Tax Invoice ${invoiceNo}` : `Preview Tax Invoice — ${orderNo}`}
      subtitle={`Customer: ${customer.name} (ID: ${customer.id || customer.code || 'CUST-001'})`}
      footer={
        <div className="modal-actions-bar flex items-center justify-between w-full">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {isCreated ? 'Done / Close' : 'Cancel'}
          </button>

          <div className="flex items-center gap-2">
            {!isCreated ? (
              <button
                type="button"
                className="btn btn-primary btn-icon-text font-bold"
                onClick={handleCreateInvoice}
              >
                <FileText size={15} />
                <span>Confirm & Issue Invoice</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-icon-text"
                onClick={handleDownloadPdf}
              >
                <Download size={14} />
                <span>Download PDF</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-slate-800">
        {/* Post-creation Notification Banner */}
        {isCreated && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Invoice {invoiceNo} is officially issued & synced with Centralized ERP register.</span>
            </div>
            <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[10px]">
              Ready for Distribution
            </span>
          </div>
        )}

        {/* Invoice Header Metadata Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Invoice Number</span>
            <span className="text-base font-black text-slate-900 font-mono">{invoiceNo}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Linked Order: {orderNo}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer Details</span>
            <span className="font-bold text-slate-900 block truncate">{customer.name}</span>
            <span className="text-[11px] text-slate-500 font-mono">ID: {customer.id || customer.code || 'CUST-001'}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billing & GSTIN</span>
            <span className="font-mono text-[11px] text-slate-700 block">{customer.gstin || '09AAACA1122D1Z1'}</span>
            <span className="text-[11px] text-slate-500 block truncate">{customer.address}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dates & Payment</span>
            <span className="text-slate-700 block">Date: {formatDate(today)}</span>
            <span className="text-slate-700 block">Due: {formatDate(dueDate)}</span>
          </div>
        </div>

        {/* Simulated Distribution Actions (Email & WhatsApp) */}
        {isCreated && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send size={15} className="text-primary" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Customer Dispatch Channels (Simulated)
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">Preview & Instant Client Transmission</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Email Transmission Channel */}
              <div className="p-3 border rounded-xl bg-slate-50/60 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Mail size={14} className="text-blue-600" />
                    <span>Email Invoice Delivery</span>
                  </div>
                  {emailStatus === 'sent' && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check size={11} /> Sent {emailTimestamp ? `(${emailTimestamp})` : ''}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="email"
                    value={emailInput || customer.email || ''}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="customer@domain.com"
                    className="form-input text-xs flex-1 py-1 px-2.5 bg-white border border-slate-300 rounded-lg"
                  />
                  <button
                    type="button"
                    disabled={emailStatus === 'sending'}
                    onClick={handleSendEmail}
                    className="btn btn-sm btn-primary shrink-0 flex items-center gap-1 text-xs px-3 py-1.5"
                  >
                    {emailStatus === 'sending' ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <Send size={12} />
                        <span>{emailStatus === 'sent' ? 'Resend' : 'Send Email'}</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  Attaches professional GSTR-1 compliant PDF invoice with digital signature seal.
                </p>
              </div>

              {/* WhatsApp Transmission Channel */}
              <div className="p-3 border rounded-xl bg-slate-50/60 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Phone size={14} className="text-emerald-600" />
                    <span>WhatsApp Delivery Notice</span>
                  </div>
                  {whatsAppStatus === 'sent' && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check size={11} /> Sent {whatsAppTimestamp ? `(${whatsAppTimestamp})` : ''}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={whatsAppInput || customer.phone || ''}
                    onChange={(e) => setWhatsAppInput(e.target.value)}
                    placeholder="+91 98000 00000"
                    className="form-input text-xs flex-1 py-1 px-2.5 bg-white border border-slate-300 rounded-lg"
                  />
                  <button
                    type="button"
                    disabled={whatsAppStatus === 'sending'}
                    onClick={handleSendWhatsApp}
                    className="btn btn-sm btn-success shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 text-white bg-emerald-600 hover:bg-emerald-700"
                  >
                    {whatsAppStatus === 'sending' ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <Send size={12} />
                        <span>{whatsAppStatus === 'sent' ? 'Resend' : 'Send WhatsApp'}</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  Instant mobile link with authenticated payment receipt &amp; cloud PDF download.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Line Items Table with Batch References */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Itemized Products &amp; Batch Traceability
            </span>
            <span className="text-[11px] text-slate-500">HSN &amp; GST compliant line breakdown</span>
          </div>

          <div className="table-responsive">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-semibold">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Product Description &amp; SKU</th>
                  <th className="py-2.5 px-3 text-center">Batch Reference</th>
                  <th className="py-2.5 px-3 text-center">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Discount</th>
                  <th className="py-2.5 px-3 text-right">GST (18%)</th>
                  <th className="py-2.5 px-3 text-right font-bold text-slate-800">Net Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => {
                  const qty = item.quantity || item.orderedQty || 1;
                  const price = item.standardPrice || item.unitPrice || 0;
                  const discPct = item.discountPercent || 0;
                  const discAmt = (price * qty * discPct) / 100;
                  const taxable = price * qty - discAmt;
                  const taxAmt = item.taxAmount || Math.round(taxable * 0.18);
                  const net = item.netAmount || (taxable + taxAmt);
                  const batchNumber = item.allocations?.[0]?.batchNumber || item.batchNumber || item.batchOrSerial || `B-2610-0${(index % 5) + 1}`;

                  return (
                    <tr key={item.id || index} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{index + 1}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 block">{item.productName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.productSku || item.productId || 'SKU-GEN'}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/80">
                          {batchNumber}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium">
                        {qty} {item.unit || 'Units'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatINR(price)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {discPct > 0 ? `${discPct}% (-${formatINR(discAmt)})` : '0%'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                        {formatINR(taxAmt)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                        {formatINR(net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Breakdown Footer */}
          <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="text-xs text-slate-500 max-w-sm space-y-1">
              <span className="font-bold text-slate-700 block">Payment Terms &amp; Compliance:</span>
              <p className="text-[11px]">
                Authorized under Indian GSTR-1 norms. Standard payment window is Net 30 days from invoice issue date.
              </p>
            </div>

            <div className="w-full md:w-80 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Base Value):</span>
                <span>{formatINR(Math.round(totalAmount / 1.18))}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>CGST (9%):</span>
                <span>{formatINR(Math.round(totalAmount * 0.09 / 1.18))}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>SGST (9%):</span>
                <span>{formatINR(Math.round(totalAmount * 0.09 / 1.18))}</span>
              </div>
              <div className="border-t border-slate-200 pt-1 flex justify-between font-bold text-slate-900 text-sm">
                <span>Total Invoice Value:</span>
                <span>{formatINR(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold text-xs">
                <span>Recorded Payment Received:</span>
                <span>- {formatINR(paidAmount)}</span>
              </div>
              <div className="border-t border-dashed border-slate-300 pt-1 flex justify-between font-bold text-sm">
                <span className={balance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  Outstanding Balance:
                </span>
                <span className={balance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  {formatINR(balance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
