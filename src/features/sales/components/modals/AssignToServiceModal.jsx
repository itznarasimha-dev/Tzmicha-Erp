import { useState } from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate } from '../../utils/formatters';
import { Wrench, ShieldCheck, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';

export default function AssignToServiceModal({ isOpen, onClose, order, onSuccess }) {
  const { customers, userProfile, userRole, assignOrderToService, invoices, payments } = useSales();
  const { showToast } = useToast();

  const [serviceRequirement, setServiceRequirement] = useState('Installation & Commissioning Required');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!order) return null;

  // Resolve Customer
  const customer = customers.find(
    (c) => c.id === order.customerId || c.customerId === order.customerId || c.name === order.customerName
  ) || {};

  const customerDisplayId = customer.customerId || customer.code || order.customerId || '—';

  // Calculate actual payment details
  const linkedInvoices = invoices.filter((i) => i.orderNo === order.orderNo || i.orderNo === order.id);
  const invoicePaid = linkedInvoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0);
  const linkedPayments = payments.filter((p) => p.orderNo === order.orderNo || p.orderNo === order.id);
  const directPaid = linkedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const amountPaid = Math.max(invoicePaid, directPaid, Number(order.amountPaid || 0));
  const totalAmount = Number(order.totalAmount || 0);
  const pendingBalance = Math.max(0, totalAmount - amountPaid);
  const percentPaid = totalAmount > 0 ? Math.round((amountPaid / totalAmount) * 100) : 0;

  const handleConfirm = () => {
    try {
      setSubmitting(true);
      const handoffData = {
        serviceRequirement,
        notes: notes.trim(),
        customerDetails: {
          customerId: customerDisplayId,
          customerName: order.customerName,
          contactPerson: customer.contactPerson || '—',
          phone: customer.phone || '—',
          email: customer.email || '—',
          address: customer.address || '—',
        },
        products: (order.items || []).map((it) => ({
          productId: it.productId,
          productName: it.productName,
          orderedQty: Number(it.orderedQty || it.qty || 0),
          dispatchedQty: Number(it.dispatchedQty || 0),
        })),
        paymentMilestone: {
          totalAmount,
          amountPaid,
          pendingBalance,
          percentPaid,
        },
      };

      assignOrderToService(order.id, handoffData);
      showToast(`Sales Order ${order.orderNo} successfully assigned to Service!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to assign order to Service', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const roleTitle =
    userProfile?.jobTitle ||
    (userRole === 'sales_manager'
      ? 'Sales Manager'
      : userRole === 'sales_coordinator'
      ? 'Sales Coordinator'
      : 'Sales Representative');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={`Assign to Service: ${order.orderNo}`}
      subtitle={`Customer: ${order.customerName} (${customerDisplayId})`}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-icon-text"
            onClick={handleConfirm}
            disabled={submitting}
          >
            <CheckCircle2 size={16} />
            <span>{submitting ? 'Recording Handoff...' : 'Confirm Service Handoff'}</span>
          </button>
        </div>
      }
    >
      <div className="assign-to-service-modal-body">
        {/* Verification Banner */}
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <ShieldCheck size={20} className="text-emerald-600 shrink-0" style={{ marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#065f46' }}>
              All 5 Sales Handoff Preconditions Verified
            </div>
            <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px', lineHeight: 1.4 }}>
              • Confirmed Sales Order linked to finalized quotation
              • Recorded payment received is <strong>{percentPaid}%</strong> (≥ 50% milestone satisfied)
              • Fulfillment milestone reached: <strong>{order.fulfilmentStatus}</strong>
              • Not previously assigned to Service
              • Authorized Sales role: <strong>{roleTitle}</strong>
            </div>
          </div>
        </div>

        {/* Order & Customer Summary Grid */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '14px',
            marginBottom: '18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
          }}
        >
          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Customer Details
            </span>
            <strong style={{ fontSize: '13px', color: '#0f172a' }}>{order.customerName}</strong>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
              ID: <span className="font-mono font-semibold text-primary">{customerDisplayId}</span>
            </div>
            {customer.contactPerson && (
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Contact: {customer.contactPerson} ({customer.phone || '—'})
              </div>
            )}
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Order &amp; Quotation
            </span>
            <strong style={{ fontSize: '13px', color: '#2563eb' }}>{order.orderNo}</strong>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
              Quote Ref: {order.quotationNo || 'Direct / None'}
            </div>
            <div style={{ fontSize: '11px', color: '#475569' }}>
              Invoice Ref: {order.invoiceNo || 'Pending Invoice'}
            </div>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Fulfillment Status
            </span>
            <div style={{ marginTop: '4px' }}>
              <StatusBadge status={order.fulfilmentStatus} size="small" />
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Delivery Target: {formatDate(order.requiredDeliveryDate)}
            </div>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Payment Milestone
            </span>
            <strong style={{ fontSize: '13px', color: '#0f172a' }}>{formatINR(totalAmount)}</strong>
            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>
              Paid: {formatINR(amountPaid)} ({percentPaid}%)
            </div>
            <div style={{ fontSize: '11px', color: pendingBalance > 0 ? '#dc2626' : '#16a34a' }}>
              Pending Balance: {formatINR(pendingBalance)}
            </div>
          </div>
        </div>

        {/* Handed-off Products Table */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
            Products &amp; Quantities Handed Off for Service Inspection
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#475569', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Product</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '110px' }}>Ordered Qty</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '110px' }}>Dispatched Qty</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: '500', color: '#1e293b' }}>
                      {it.productName}
                      <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                        SKU: {it.productId}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: '#334155' }}>
                      {it.orderedQty || it.qty || 0} units
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: '#059669' }}>
                      {it.dispatchedQty !== undefined ? it.dispatchedQty : (it.orderedQty || it.qty || 0)} units
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Known Service Requirement Selection */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '14px',
            marginBottom: '16px',
          }}
        >
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
            Installation &amp; Commissioning Requirement *
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                border: serviceRequirement === 'Installation & Commissioning Required' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                borderRadius: '6px',
                background: serviceRequirement === 'Installation & Commissioning Required' ? '#eff6ff' : '#ffffff',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="serviceRequirement"
                value="Installation & Commissioning Required"
                checked={serviceRequirement === 'Installation & Commissioning Required'}
                onChange={(e) => setServiceRequirement(e.target.value)}
                style={{ marginTop: '2px' }}
              />
              <div>
                <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                  Installation &amp; Commissioning Required
                </strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  On-site field deployment needed for assembly, plumbing/hydraulic integration, or instrument calibration.
                </p>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                border: serviceRequirement === 'Standard Delivery (No Installation Required)' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                borderRadius: '6px',
                background: serviceRequirement === 'Standard Delivery (No Installation Required)' ? '#eff6ff' : '#ffffff',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="serviceRequirement"
                value="Standard Delivery (No Installation Required)"
                checked={serviceRequirement === 'Standard Delivery (No Installation Required)'}
                onChange={(e) => setServiceRequirement(e.target.value)}
                style={{ marginTop: '2px' }}
              />
              <div>
                <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                  Standard Delivery (No Installation Required)
                </strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Standard goods drop-off at customer facility; customer manages internal installation independently.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Handoff Notes */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
            Handoff Instructions / Site Access Remarks (Optional)
          </label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="e.g., Gate pass clearance required 24 hours prior. Customer site engineer: Mr. Sharma (+91 98220 14592). Provide hydraulic pressure test report on delivery."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Assigning Employee Snapshot */}
        <div
          style={{
            background: '#f1f5f9',
            borderRadius: '6px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#475569',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={16} className="text-slate-600" />
            <span>
              Assigning Employee: <strong>{userProfile?.fullName || 'Vikram Mehta'}</strong> ({roleTitle}) • ID: <strong>{userProfile?.employeeId || 'APX-EMP-4091'}</strong>
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Handoff Status: <span className="font-semibold text-primary">Pending Service Execution</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
