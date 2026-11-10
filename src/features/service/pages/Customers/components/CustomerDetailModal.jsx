import React from 'react';
import {
  X,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Package,
  ShieldCheck,
  Wrench,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  History
} from 'lucide-react';
import StatusBadge from '../../../components/common/StatusBadge';
import { formatDate, formatINR } from '../../../utils/formatters';

export default function CustomerDetailModal({
  isOpen,
  onClose,
  customer,
  purchasedProducts = [],
  serviceRequests = [],
  schedules = [],
  serviceHistory = []
}) {
  if (!isOpen || !customer) return null;

  const customerSRs = serviceRequests.filter((sr) => sr.customerId === customer.id);
  const openSRs = customerSRs.filter((sr) => sr.status !== 'Completed' && sr.status !== 'Closed' && sr.status !== 'Resolved');
  const completedSRs = customerSRs.filter((sr) => sr.status === 'Completed' || sr.status === 'Closed' || sr.status === 'Resolved');
  const repeatComplaints = customerSRs.filter((sr) => sr.isRepeatComplaint || sr.serviceType === 'Repeat Complaint');
  const customerHistory = serviceHistory.filter((h) => h.customerId === customer.id);
  const customerSchedules = schedules.filter(
    (s) => s.customerId === customer.id && (s.status === 'Scheduled' || s.status === 'In Progress' || s.status === 'Postponed')
  );

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '980px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 22px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Building size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#2563eb',
                    backgroundColor: '#dbeafe',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}
                >
                  {customer.id}
                </span>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  {customer.businessName || customer.name}
                </h3>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                GSTIN: <strong className="text-slate-700">{customer.gstin || 'Not Provided'}</strong> • City: {customer.city}, {customer.state}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Customer Information */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={15} className="text-primary" />
              Customer Information & Point of Contact
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', fontSize: '12px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Customer ID</span>
                <strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>{customer.id}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Business / Customer Name</span>
                <strong style={{ color: '#0f172a' }}>{customer.businessName || customer.name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Contact Person</span>
                <strong style={{ color: '#0f172a' }}>{customer.contactPerson}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Designation</span>
                <span style={{ color: '#334155' }}>{customer.designation || 'Key Decision Maker'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Phone Number</span>
                <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{customer.phone}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Email Address</span>
                <span style={{ color: '#2563eb' }}>{customer.email}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>GST Number</span>
                <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{customer.gstin || 'Not Provided'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>City & State</span>
                <span style={{ color: '#334155' }}>{customer.city}, {customer.state}</span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Complete Address</span>
                <span style={{ color: '#334155', lineHeight: '1.5' }}>{customer.address}</span>
              </div>
              {customer.remarks && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Remarks / Account Notes</span>
                  <span style={{ color: '#475569', fontStyle: 'italic' }}>{customer.remarks}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Purchased Products */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#ffffff' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Package size={15} className="text-primary" />
              Purchased Products & Equipment ({purchasedProducts.length})
            </h4>

            {purchasedProducts.length === 0 ? (
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                No registered machinery or sales invoice items on file for this customer account.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>Product ID</th>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>Product Name</th>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>Category</th>
                      <th style={{ padding: '8px 10px', color: '#475569', textAlign: 'center' }}>Purchased Qty</th>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>Sales Invoice #</th>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>Purchase Date</th>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>Warranty Status</th>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>AMC Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchasedProducts.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#2563eb' }}>{p.productId}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>{p.productName}</td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{p.category || 'Machinery'}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{p.quantity || 1}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{p.invoiceNo}</td>
                        <td style={{ padding: '8px 10px' }}>{formatDate(p.purchaseDate)}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: p.warrantyStatus?.includes('Active') ? '#ecfdf5' : '#f1f5f9',
                              color: p.warrantyStatus?.includes('Active') ? '#047857' : '#475569',
                              fontWeight: 600
                            }}
                          >
                            {p.warrantyStatus || 'Active (12M)'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: p.amcStatus && p.amcStatus !== 'None' ? '#eff6ff' : '#f1f5f9',
                              color: p.amcStatus && p.amcStatus !== 'None' ? '#1d4ed8' : '#64748b',
                              fontWeight: 600
                            }}
                          >
                            {p.amcStatus || 'Standard AMC'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Service Information Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', backgroundColor: '#f8fafc', borderLeft: '3.5px solid #2563eb' }}>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Total Service Requests</span>
              <strong style={{ fontSize: '18px', color: '#0f172a' }}>{customerSRs.length}</strong>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', backgroundColor: '#eff6ff', borderLeft: '3.5px solid #3b82f6' }}>
              <span style={{ fontSize: '11px', color: '#2563eb', display: 'block' }}>Active Service Requests</span>
              <strong style={{ fontSize: '18px', color: '#2563eb' }}>{openSRs.length}</strong>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', backgroundColor: '#ecfdf5', borderLeft: '3.5px solid #10b981' }}>
              <span style={{ fontSize: '11px', color: '#16a34a', display: 'block' }}>Completed Service Requests</span>
              <strong style={{ fontSize: '18px', color: '#16a34a' }}>{completedSRs.length}</strong>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', backgroundColor: '#fffbeb', borderLeft: '3.5px solid #f59e0b' }}>
              <span style={{ fontSize: '11px', color: '#b45309', display: 'block' }}>Repeat Complaints</span>
              <strong style={{ fontSize: '18px', color: '#b45309' }}>{repeatComplaints.length}</strong>
            </div>
          </div>

          {/* Section 4: Upcoming Service Visits */}
          {customerSchedules.length > 0 && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', backgroundColor: '#ffffff' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} className="text-primary" />
                Upcoming Service Visits ({customerSchedules.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {customerSchedules.map((sch) => (
                  <div
                    key={sch.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '6px',
                      fontSize: '12px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div>
                      <strong style={{ color: '#0f172a' }}>{sch.serviceCategory}</strong> — {sch.purpose}
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Date: <strong>{formatDate(sch.scheduledDate)}</strong> ({sch.startTime} - {sch.expectedEndTime}) • Engineer: {sch.assignedEngineerName}
                      </div>
                    </div>
                    <StatusBadge status={sch.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Previous Service History */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', backgroundColor: '#ffffff' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <History size={15} className="text-primary" />
              Previous Service History ({customerHistory.length})
            </h4>

            {customerHistory.length === 0 ? (
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                No completed historic service visits recorded yet for this customer.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>History Ref</th>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>Ticket #</th>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>Equipment</th>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>Service Date</th>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>Lead Engineer</th>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>Resolution Summary</th>
                      <th style={{ padding: '8px 10px', color: '#475569', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerHistory.map((h) => (
                      <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#2563eb' }}>{h.id}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{h.serviceRequestId}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 500 }}>{h.productName}</td>
                        <td style={{ padding: '8px 10px' }}>{formatDate(h.serviceDate)}</td>
                        <td style={{ padding: '8px 10px' }}>{h.assignedEngineerName}</td>
                        <td style={{ padding: '8px 10px', color: '#475569', maxWidth: '320px' }}>{h.resolutionSummary}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <StatusBadge status={h.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 22px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: '13px' }}>
            Close Customer Profile
          </button>
        </div>
      </div>
    </div>
  );
}
