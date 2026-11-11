import { useState } from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate, getWhatsAppUrl } from '../../utils/formatters';
import { Building2, CreditCard, ShoppingBag, FileText, Edit2, Save, PhoneCall } from 'lucide-react';
import WhatsAppIcon from '../common/WhatsAppIcon';

export default function CustomerDetailModal({ isOpen, onClose, customer }) {
  const { quotations, orders, invoices, followups = [], updateCustomer } = useSales();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'quotes', 'invoices', 'profile', 'history'
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(customer || {});

  if (!customer) return null;

  // Filter linked records
  const customerQuotes = quotations.filter((q) => q.customerId === customer.id || q.customerId === customer.customerId || q.customerName === customer.name);
  const customerOrders = orders.filter((o) => o.customerId === customer.id || o.customerId === customer.customerId || o.customerName === customer.name);
  const customerInvoices = invoices.filter((i) => i.customerId === customer.id || i.customerId === customer.customerId || i.customerName === customer.name);
  const customerFollowups = followups.filter((f) => f.customerId === customer.id || f.customerId === customer.customerId || f.customerName === customer.name);

  const handleSaveEdit = () => {
    updateCustomer(customer.id, editForm);
    setIsEditing(false);
    showToast('Customer information updated successfully!', 'success');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xlarge"
      title={customer.name}
      subtitle={`Customer ID: ${customer.customerId || customer.code || customer.id} • ${customer.type} • ${customer.city}`}
      footer={
        <div className="modal-actions-bar">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <div className="modal-actions-right">
            {isEditing ? (
              <button
                type="button"
                className="btn btn-primary btn-icon-text"
                onClick={handleSaveEdit}
              >
                <Save size={14} />
                <span>Save Changes</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-icon-text"
                onClick={() => {
                  setEditForm(customer);
                  setIsEditing(true);
                }}
              >
                <Edit2 size={14} />
                <span>Edit Details</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="customer-detail-view">
        {/* Top Summary Banner */}
        <div className="detail-meta-banner mb-3">
          <div className="meta-col">
            <span className="meta-label">Account Status</span>
            <StatusBadge status={customer.status} />
          </div>
          <div className="meta-col">
            <span className="meta-label">Contact Person</span>
            <span className="meta-val font-semibold">{customer.contactPerson}</span>
          </div>
          <div className="meta-col">
            <span className="meta-label">Credit Limit</span>
            <span className="meta-val">{formatINR(customer.creditLimit)}</span>
          </div>
          <div className="meta-col">
            <span className="meta-label">Outstanding Balance</span>
            <span className="meta-val text-danger font-bold">
              {formatINR(customer.outstandingBalance)}
            </span>
          </div>
          <div className="meta-col">
            <span className="meta-label">Last Order Date</span>
            <span className="meta-val">{formatDate(customer.lastOrderDate)}</span>
          </div>
        </div>

        {/* Remarks / Initial Reason Callout */}
        {customer.remarks && (
          <div className="customer-initial-remarks-box mb-4" style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderLeft: '4px solid #2563eb',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '13px'
          }}>
            <span style={{ fontWeight: 600, color: '#1e293b', marginRight: '6px' }}>
              Initial Contact Reason / Remarks:
            </span>
            <span style={{ color: '#475569' }}>{customer.remarks}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="modal-tabs-header mb-4">
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <ShoppingBag size={14} />
            <span>Sales Orders ({customerOrders.length})</span>
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === 'quotes' ? 'active' : ''}`}
            onClick={() => setActiveTab('quotes')}
          >
            <FileText size={14} />
            <span>Quotations ({customerQuotes.length})</span>
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            <CreditCard size={14} />
            <span>Invoices ({customerInvoices.length})</span>
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <PhoneCall size={14} />
            <span>Interaction History ({customerFollowups.length})</span>
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <Building2 size={14} />
            <span>Account Profile</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'orders' && (
          <div className="table-responsive">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Order Date</th>
                  <th>Delivery Target</th>
                  <th>Fulfilment</th>
                  <th>Payment</th>
                  <th style={{ textAlign: 'right' }}>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {customerOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      No sales orders found for this customer.
                    </td>
                  </tr>
                ) : (
                  customerOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="font-semibold text-primary">{o.orderNo}</td>
                      <td>{formatDate(o.orderDate)}</td>
                      <td>{formatDate(o.requiredDeliveryDate)}</td>
                      <td>
                        <StatusBadge status={o.fulfilmentStatus} size="small" />
                      </td>
                      <td>
                        <StatusBadge status={o.paymentStatus} size="small" />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatINR(o.totalAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'quotes' && (
          <div className="table-responsive">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Quote #</th>
                  <th>Created Date</th>
                  <th>Valid Until</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {customerQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">
                      No quotations found for this customer.
                    </td>
                  </tr>
                ) : (
                  customerQuotes.map((q) => (
                    <tr key={q.id}>
                      <td className="font-semibold text-primary">{q.quotationNo}</td>
                      <td>{formatDate(q.createdDate)}</td>
                      <td>{formatDate(q.validUntil)}</td>
                      <td>
                        <StatusBadge status={q.status} size="small" />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatINR(q.grandTotal)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="table-responsive">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Order #</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Total Amount</th>
                  <th style={{ textAlign: 'right' }}>Balance Due</th>
                </tr>
              </thead>
              <tbody>
                {customerInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      No invoices found for this customer.
                    </td>
                  </tr>
                ) : (
                  customerInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="font-semibold text-primary">{inv.invoiceNo}</td>
                      <td>{inv.orderNo}</td>
                      <td>{formatDate(inv.dueDate)}</td>
                      <td>
                        <StatusBadge status={inv.status} size="small" />
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatINR(inv.totalAmount)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }} className={inv.balance > 0 ? 'text-danger' : 'text-success'}>
                        {formatINR(inv.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="table-responsive">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Scheduled Date &amp; Time</th>
                  <th>Method</th>
                  <th>Subject &amp; Reference</th>
                  <th>Focus Product</th>
                  <th>Assigned Salesperson</th>
                  <th>Remarks &amp; Negotiation Notes</th>
                  <th style={{ textAlign: 'center' }}>Outcome / Status</th>
                </tr>
              </thead>
              <tbody>
                {customerFollowups.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted p-4">
                      No customer interaction or follow-up logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  customerFollowups.map((f) => (
                    <tr key={f.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="font-semibold text-slate-800 block text-xs">
                          {formatDate(f.followUpDate || f.nextFollowUpDate)}
                        </span>
                        <span className="text-xxs text-muted block">{f.scheduledTime || '11:00 AM'}</span>
                      </td>
                      <td>
                        <span className="badge-neutral text-xs px-2 py-0.5 rounded font-medium">
                          {f.contactMethod}
                        </span>
                      </td>
                      <td>
                        <span className="font-medium text-xs text-slate-800 block">{f.subject}</span>
                        {f.relatedRef && <span className="text-xxs text-muted block">{f.relatedRef}</span>}
                      </td>
                      <td>
                        <span className="text-xs text-slate-700">{f.productSummary || '—'}</span>
                      </td>
                      <td>
                        <span className="text-xs font-medium text-slate-700">{f.assignedTo || f.owner || 'Vikram Mehta'}</span>
                      </td>
                      <td style={{ maxWidth: '280px' }}>
                        <span className="text-xs text-slate-700 block" style={{ lineHeight: '1.4' }}>
                          {f.remarks || f.notes || 'Routine sales discussion'}
                        </span>
                        {f.outcome && (
                          <span className="text-xxs font-semibold text-primary block mt-0.5">
                            Outcome: {f.outcome} {f.completedAt && `• ${f.completedAt}`}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <StatusBadge status={f.outcome || f.status} size="small" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="profile-tab-content">
            {isEditing ? (
              <div className="form-grid-2">
                <div className="form-field-group">
                  <label className="form-label">Contact Person</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.contactPerson || ''}
                    onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                  />
                </div>
                <div className="form-field-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="form-field-group">
                  <label className="form-label">WhatsApp Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="+91 98XXX XXXXX"
                    value={editForm.whatsapp || ''}
                    onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                  />
                </div>
                <div className="form-field-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div className="form-field-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Initial Contact Reason / Remarks</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={editForm.remarks || ''}
                    onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  />
                </div>
                <div className="form-field-group">
                  <label className="form-label">Account Status</label>
                  <select
                    className="form-select"
                    value={editForm.status || 'Active'}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold (Restricted)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="info-display-grid">
                <div className="info-box">
                  <span className="info-label">Billing & Factory Address</span>
                  <p className="info-value">{customer.address || 'MIDC Industrial Estate'}</p>
                </div>
                <div className="info-box">
                  <span className="info-label">GSTIN / Tax ID</span>
                  <p className="info-value font-mono">{customer.gstin || 'Not Provided'}</p>
                </div>
                <div className="info-box">
                  <span className="info-label">Phone &amp; Mobile</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p className="info-value mb-0">{customer.phone}</p>
                    {customer.phone && (
                      <a
                        href={getWhatsAppUrl(customer.phone, `Hello ${customer.contactPerson || customer.name}, contacting you from ApexERP Sales.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-icon-text"
                        style={{
                          backgroundColor: '#25D366',
                          color: '#ffffff',
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          textDecoration: 'none',
                        }}
                        title={`Open WhatsApp chat with ${customer.contactPerson || customer.name}`}
                      >
                        <WhatsAppIcon size={13} color="#ffffff" />
                        <span>WhatsApp Chat</span>
                      </a>
                    )}
                  </div>
                </div>
                <div className="info-box">
                  <span className="info-label">WhatsApp Number</span>
                  <p className="info-value">{customer.whatsapp || customer.phone || '—'}</p>
                </div>
                <div className="info-box">
                  <span className="info-label">Email Address</span>
                  <p className="info-value">{customer.email}</p>
                </div>
                <div className="info-box" style={{ gridColumn: 'span 2' }}>
                  <span className="info-label">Initial Contact Reason / Remarks</span>
                  <p className="info-value" style={{ fontStyle: 'italic', color: '#334155' }}>
                    {customer.remarks || 'No initial remarks recorded.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
