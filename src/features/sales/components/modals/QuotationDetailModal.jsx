import { useState } from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import RejectReasonModal from './RejectReasonModal';
import RequestDownloadModal from './RequestDownloadModal';
import CreateQuotationModal from './CreateQuotationModal';
import SendQuotationEmailModal from './SendQuotationEmailModal';
import QuotationDocumentPreviewModal from './QuotationDocumentPreviewModal';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate } from '../../utils/formatters';
import { downloadQuotationDocument } from '../../utils/documentGenerator';
import {
  ArrowRight,
  ShoppingCart,
  Download,
  XCircle,
  Edit,
  Clock,
  AlertTriangle,
  History,
  FileText,
  Mail,
  Eye,
  Layers,
} from 'lucide-react';

export default function QuotationDetailModal({ isOpen, onClose, quotation, onEditQuotation }) {
  const {
    userRole,
    userProfile,
    permissions = {},
    customers = [],
    invoices = [],
    approveQuotation,
    rejectQuotation,
    downloadQuotationPDF,
    convertQuotationToOrder,
    createInvoiceForQuotation,
    navigateTo,
    approveDownload,
    rejectDownload,
    requestDownloadApproval,
  } = useSales();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('details'); // 'details', 'revisions', 'history'
  const [rejectModalConfig, setRejectModalConfig] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isPreviewDocOpen, setIsPreviewDocOpen] = useState(false);

  if (!quotation) return null;

  const isAdmin = userRole === 'admin';
  const isCoordinator = userRole === 'sales_coordinator';
  const isDownloadApproved = quotation.downloadApprovalStatus === 'Approved' || isCoordinator || isAdmin || quotation.status === 'Approved';
  const isDownloadPending = quotation.downloadApprovalStatus === 'Pending' && !isCoordinator;
  const isDownloadRejected = quotation.downloadApprovalStatus === 'Rejected' && !isCoordinator;

  const handleTriggerEdit = () => {
    if (onEditQuotation) {
      onEditQuotation(quotation);
      onClose();
    } else {
      setIsEditModalOpen(true);
    }
  };

  const isCreationPending = quotation.status === 'Pending Approval' || quotation.status === 'Awaiting Approval' || quotation.status === 'Revised—Pending Approval';
  const isApproved = quotation.status === 'Approved' || quotation.status === 'Accepted';
  const isRejected = quotation.status === 'Rejected';
  const isDraft = quotation.status === 'Draft';

  // 4-Level Role Approval Rules Engine
  const creatorRole = quotation.createdByRole || (
    quotation.raisedBy?.includes('Junior') ? 'junior_sales' :
    quotation.raisedBy?.includes('Coordinator') ? 'sales_coordinator' :
    quotation.raisedBy?.includes('Manager') ? 'sales_manager' : 'sales_rep'
  );

  const isCreator =
    (userProfile?.employeeId && quotation.createdBy === userProfile.employeeId) ||
    (userProfile?.employeeId && quotation.createdEmployeeId === userProfile.employeeId) ||
    (userProfile?.fullName && quotation.createdByName?.toLowerCase() === userProfile.fullName.toLowerCase()) ||
    (userProfile?.fullName && quotation.createdBy?.toLowerCase() === userProfile.fullName.toLowerCase());

  let canApproveCreation = false;
  let cannotApproveReason = '';

  if (isCreator) {
    cannotApproveReason = 'Self-approval is strictly prohibited. Quotation must be authorized by an eligible approver.';
  } else if (userRole === 'junior_sales' || userRole === 'sales_rep') {
    cannotApproveReason = 'Sales Representatives and Junior Sales Employees cannot approve quotations.';
  } else if (creatorRole === 'junior_sales' || creatorRole === 'sales_rep') {
    // Junior or Rep quote: Can be approved by Sales Coordinator OR Sales Manager
    if (userRole === 'sales_coordinator' || userRole === 'sales_manager' || userRole === 'admin') {
      canApproveCreation = true;
    }
  } else if (creatorRole === 'sales_coordinator') {
    // Coordinator quote: Must be approved by Sales Manager ONLY
    if (userRole === 'sales_manager' || userRole === 'admin') {
      canApproveCreation = true;
    } else {
      cannotApproveReason = 'Quotations created by Sales Coordinator require approval by Sales Manager only.';
    }
  } else if (creatorRole === 'sales_manager') {
    // Manager quotes are pre-authorized upon creation
    cannotApproveReason = 'Quotations created by Sales Manager are pre-authorized upon creation.';
  }

  const handleDownloadPDF = async () => {
    try {
      await downloadQuotationPDF(quotation.id);
      showToast(`Quotation ${quotation.quotationNo} PDF downloaded successfully`, 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handlePreviewPDF = () => {
    downloadQuotationDocument(quotation, { previewOnly: true });
    showToast('Opening quotation PDF preview...', 'info');
  };

  // Creation Approval Handlers
  const handleApproveCreation = () => {
    try {
      const roleTitle = userRole === 'sales_coordinator' ? 'Sales Coordinator' : 'Sales Manager';
      approveQuotation(quotation.id, `Approved by ${userProfile.fullName} (${roleTitle})`);
      showToast(`Quotation ${quotation.quotationNo} approved successfully!`, 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleOpenRejectCreation = () => {
    setRejectModalConfig({
      type: 'creation',
      title: `Reject Quotation ${quotation.quotationNo}`,
      subtitle: 'Provide a reason explaining why this quotation proposal is rejected',
      placeholder: 'Specify commercial/pricing or customer issues (e.g. payment terms non-compliant, excessive discount)...',
    });
  };

  // Download Approval Handlers (Admin ONLY)
  const handleApproveDownload = () => {
    try {
      approveDownload(quotation.id, 'Download authorization granted by Administrator');
      showToast(`Download approved for quotation ${quotation.quotationNo}!`, 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleOpenRejectDownload = () => {
    setRejectModalConfig({
      type: 'download',
      title: `Reject Download Request for ${quotation.quotationNo}`,
      subtitle: 'Admin reason for denying quotation document download',
      placeholder: 'Specify why document download is rejected at this time...',
    });
  };

  const handleConfirmReject = (reason) => {
    if (!rejectModalConfig) return;
    try {
      if (rejectModalConfig.type === 'creation') {
        rejectQuotation(quotation.id, reason);
        showToast(`Quotation ${quotation.quotationNo} rejected. Reason recorded in audit log.`, 'warning');
      } else if (rejectModalConfig.type === 'download') {
        rejectDownload(quotation.id, reason);
        showToast(`Download request for ${quotation.quotationNo} rejected.`, 'warning');
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
    setRejectModalConfig(null);
  };

  // Conversion to Sales Order
  const handleConvert = () => {
    try {
      const order = convertQuotationToOrder(quotation.id);
      showToast(`Quotation converted to Sales Order ${order.orderNo}`, 'success');
      onClose();
      navigateTo('sales-orders');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Direct Download Trigger (Guarded by Admin download approval)
  const handleDownloadClick = () => {
    if (!isApproved) {
      showToast('Quotation creation must be approved before downloading.', 'warning');
      return;
    }
    if (isDownloadApproved) {
      downloadQuotationDocument(quotation);
      showToast('Generating official quotation document...', 'info');
    } else {
      setIsDownloadModalOpen(true);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="xlarge"
        title={`Quotation ${quotation.quotationNo}`}
        subtitle={`Created on ${formatDate(quotation.createdDate)} • Valid until ${formatDate(quotation.validUntil)}`}
        footer={
          <div className="modal-actions-bar" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-icon-text"
                onClick={() => setIsPreviewDocOpen(true)}
                title="Preview formal quotation document with ApexERP company branding and bank details"
              >
                <Eye size={14} />
                <span>Preview Document</span>
              </button>
              {isApproved && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary btn-icon-text"
                    onClick={handleDownloadPDF}
                    title="Download official quotation PDF"
                  >
                    <Download size={14} />
                    <span>Download PDF</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon-text"
                    onClick={() => setIsEmailModalOpen(true)}
                    title="Send official quotation proposal to customer via email"
                  >
                    <Mail size={14} />
                    <span>Send Email</span>
                  </button>
                </>
              )}
            </div>

            <div className="modal-actions-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* CREATION APPROVAL ACTIONS */}
              {isCreationPending && (
                <>
                  {canApproveCreation ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={handleOpenRejectCreation}
                      >
                        Reject Quotation
                      </button>
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={handleApproveCreation}
                      >
                        Approve Quotation
                      </button>
                    </>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#b45309', display: 'flex', alignItems: 'center', gap: '4px', background: '#fef3c7', padding: '4px 10px', borderRadius: '4px' }}>
                      <Clock size={13} /> {cannotApproveReason || 'Pending approval'}
                    </span>
                  )}
                </>
              )}

              {/* REJECTED QUOTATION ACTION */}
              {isRejected && (
                <button
                  type="button"
                  className="btn btn-primary btn-icon-text"
                  onClick={handleTriggerEdit}
                >
                  <Edit size={14} />
                  <span>Edit &amp; Resubmit</span>
                </button>
              )}

              {/* DRAFT QUOTATION ACTION */}
              {isDraft && (
                <button
                  type="button"
                  className="btn btn-primary btn-icon-text"
                  onClick={handleTriggerEdit}
                >
                  <Edit size={14} />
                  <span>Edit Draft</span>
                </button>
              )}

              {/* APPROVED QUOTATION ACTIONS */}
              {isApproved && !quotation.convertedOrderNo && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon-text"
                    onClick={handleTriggerEdit}
                    title="Edit quotation (Requires resubmission and re-approval)"
                  >
                    <Edit size={14} />
                    <span>Revise Quote</span>
                  </button>

                  {invoices.some((i) => i.quotationNo === quotation.quotationNo) ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon-text"
                      onClick={() => {
                        onClose();
                        navigateTo('invoices');
                      }}
                      title="View linked Tax Invoice"
                    >
                      <FileText size={14} />
                      <span>View Invoice</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon-text"
                      onClick={() => {
                        try {
                          const inv = createInvoiceForQuotation(quotation.id);
                          showToast(`Tax Invoice ${inv.invoiceNo} generated. Sales Order will auto-create upon payment receipt.`, 'success');
                        } catch (err) {
                          showToast(err.message, 'danger');
                        }
                      }}
                      title="Generate Tax Invoice upfront against finalized quotation"
                    >
                      <FileText size={14} />
                      <span>Generate Invoice</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary btn-icon-text"
                    onClick={handleConvert}
                  >
                    <ShoppingCart size={14} />
                    <span>Convert to Sales Order</span>
                  </button>
                </>
              )}

              {/* CONVERTED QUOTATION LINK */}
              {quotation.convertedOrderNo && (
                <button
                  type="button"
                  className="btn btn-secondary btn-icon-text"
                  onClick={() => {
                    onClose();
                    navigateTo('sales-orders');
                  }}
                >
                  <span>View Order {quotation.convertedOrderNo}</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="quotation-detail-view">
          {/* Header Summary Banner */}
          <div className="detail-meta-banner mb-4">
            <div className="meta-col">
              <span className="meta-label">Customer</span>
              <span className="meta-val font-semibold">{quotation.customerName}</span>
            </div>
            <div className="meta-col">
              <span className="meta-label">Customer ID</span>
              <span className="meta-val font-semibold" style={{ color: '#2563eb' }}>{quotation.customerId || 'CUS-000001'}</span>
            </div>
            <div className="meta-col">
              <span className="meta-label">Creation Status</span>
              {isCoordinatorQuote ? (
                <span className="text-muted font-bold" style={{ fontSize: '15px' }} title="No approval required for quotations created by Sales Coordinator">—</span>
              ) : (
                <StatusBadge status={quotation.status} />
              )}
            </div>
            {!isCoordinator && (
              <div className="meta-col">
                <span className="meta-label">Download Authorization</span>
                {isDownloadApproved ? (
                  <span className="badge badge-success badge-sm">✓ Admin Approved</span>
                ) : isDownloadPending ? (
                  <span className="badge badge-warning badge-sm">⏳ Pending Admin</span>
                ) : isDownloadRejected ? (
                  <span className="badge badge-danger badge-sm">✕ Admin Rejected</span>
                ) : (
                  <span className="badge badge-neutral badge-sm">Not Requested</span>
                )}
              </div>
            )}
            <div className="meta-col">
              <span className="meta-label">Total Value</span>
              <span className="meta-val text-primary font-bold">{formatINR(quotation.grandTotal)}</span>
            </div>
          </div>

          {/* ADMIN ACTION BANNER FOR PENDING DOWNLOAD APPROVAL */}
          {isDownloadPending && !isCoordinator && (
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={18} color="#2563eb" />
                <div>
                  <strong style={{ color: '#1e40af', fontSize: '13px', display: 'block' }}>
                    Download Request Pending Admin Sign-Off
                  </strong>
                  <span style={{ color: '#1d4ed8', fontSize: '12px' }}>
                    Requested by {quotation.downloadRequestedBy || 'Sales Rep'} on {quotation.downloadRequestedAt ? formatDate(quotation.downloadRequestedAt) : 'recently'}.
                    {isAdmin ? ' As an authorized Admin, you can approve or reject this document download.' : ' Only an Admin may approve document downloads (Finance is not authorized).'}
                  </span>
                </div>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button type="button" className="btn btn-danger btn-sm" onClick={handleOpenRejectDownload}>
                    Reject Download
                  </button>
                  <button type="button" className="btn btn-success btn-sm" onClick={handleApproveDownload}>
                    Approve Download
                  </button>
                </div>
              )}
            </div>
          )}

          {/* REJECTION REASON BANNER */}
          {isRejected && quotation.rejectionReason && (
            <div className="alert-callout alert-callout-danger mb-4">
              <XCircle size={18} className="callout-icon" />
              <div className="callout-text">
                <strong>Quotation Rejected by {quotation.rejectedBy || 'Approver'}:</strong> {quotation.rejectionReason}
                <div style={{ marginTop: '4px', fontSize: '11px' }}>
                  Click &ldquo;Edit &amp; Resubmit&rdquo; in the footer to correct the quotation and submit for re-approval.
                </div>
              </div>
            </div>
          )}

          {/* DOWNLOAD REJECTION BANNER */}
          {isDownloadRejected && quotation.downloadRejectedReason && (
            <div className="alert-callout alert-callout-danger mb-4">
              <AlertTriangle size={18} className="callout-icon" />
              <div className="callout-text">
                <strong>Download Request Rejected by {quotation.downloadRejectedBy || 'Admin'}:</strong> {quotation.downloadRejectedReason}
                <div style={{ marginTop: '4px', fontSize: '11px' }}>
                  You may click &ldquo;Request Download&rdquo; below to send a revised request to the Administrator.
                </div>
              </div>
            </div>
          )}

          {/* CONVERTED NOTICE */}
          {quotation.convertedOrderNo && (
            <div className="alert-callout alert-callout-info mb-4">
              <div className="callout-text">
                <strong>Converted to Sales Order:</strong> This quotation has already been converted into{' '}
                <strong>Order #{quotation.convertedOrderNo}</strong>. Duplicate conversions are prevented.
              </div>
            </div>
          )}

          {/* Navigation Tabs inside modal */}
          <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'details' ? '2px solid #2563eb' : '2px solid transparent',
                color: activeTab === 'details' ? '#2563eb' : '#64748b',
                fontWeight: activeTab === 'details' ? 700 : 500,
                fontSize: '13px',
                padding: '8px 12px',
                cursor: 'pointer',
              }}
            >
              Quotation Details &amp; Items
            </button>
            {quotation.revisions && quotation.revisions.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('revisions')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'revisions' ? '2px solid #2563eb' : '2px solid transparent',
                  color: activeTab === 'revisions' ? '#2563eb' : '#64748b',
                  fontWeight: activeTab === 'revisions' ? 700 : 500,
                  fontSize: '13px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Layers size={14} />
                <span>Revision History ({quotation.revisions.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'history' ? '2px solid #2563eb' : '2px solid transparent',
                color: activeTab === 'history' ? '#2563eb' : '#64748b',
                fontWeight: activeTab === 'history' ? 700 : 500,
                fontSize: '13px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <History size={14} />
              <span>Audit &amp; Approval History ({(quotation.auditHistory || []).length})</span>
            </button>
          </div>

          {activeTab === 'details' ? (
            <>
              {/* Customer & Commercial Terms Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <h5 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    Customer Details
                  </h5>
                  <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>{quotation.customerName}</div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>Contact: {quotation.contactPerson || 'Procurement Lead'}</div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>Phone: {quotation.customerPhone || 'N/A'} • Email: {quotation.customerEmail || 'N/A'}</div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>Address: {quotation.customerAddress || 'On File'}</div>
                  <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, marginTop: '2px' }}>GSTIN: {quotation.customerGstin || 'Unregistered'}</div>
                </div>

                <div>
                  <h5 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    Commercial Terms
                  </h5>
                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                    Payment Terms: <strong style={{ color: '#0f172a' }}>{quotation.paymentTerms || 'Net 30 Days'}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                    Delivery Terms: <strong style={{ color: '#0f172a' }}>{quotation.deliveryTerms || 'Standard Dispatch (7-10 Days)'}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                    Quotation Validity: <strong style={{ color: '#0f172a' }}>{quotation.validityDays ? `${quotation.validityDays} Days` : '15 Days'}</strong> (Valid until {formatDate(quotation.validUntil)})
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    Raised By: <strong style={{ color: '#0f172a' }}>{quotation.raisedBy || quotation.salesOwner || 'Vikram Mehta (Sales Rep)'}</strong>
                  </div>
                  {quotation.approvedBy && (
                    <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>
                      Approved By: <strong>{quotation.approvedBy}</strong> {quotation.approvedAt && `on ${formatDate(quotation.approvedAt)}`}
                    </div>
                  )}
                  {quotation.rejectedBy && (
                    <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                      Rejected By: <strong>{quotation.rejectedBy}</strong> {quotation.rejectedAt && `on ${formatDate(quotation.rejectedAt)}`}
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="section-title mb-2">Quotation Line Items</div>
              <div className="table-responsive mb-4">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Product Description</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>Quantity</th>
                      <th style={{ width: '14%', textAlign: 'right' }}>Unit Price (₹)</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Discount</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>GST Rate</th>
                      <th style={{ width: '14%', textAlign: 'right' }}>Tax (₹)</th>
                      <th style={{ width: '16%', textAlign: 'right' }}>Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(quotation.items || []).map((item, index) => {
                      const baseAmt = (item.unitPrice || 0) * (item.qty || 0);
                      const discAmt = (baseAmt * (item.discountPercent || 0)) / 100;
                      const taxAmt = ((baseAmt - discAmt) * (item.taxRate || 0)) / 100;
                      return (
                        <tr key={index}>
                          <td>
                            <strong style={{ color: '#0f172a' }}>{item.productName}</strong>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>SKU: {item.productCode || item.productId}</div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>
                            {item.qty} {item.uom || 'units'}
                          </td>
                          <td style={{ textAlign: 'right' }}>{formatINR(item.unitPrice)}</td>
                          <td style={{ textAlign: 'center', color: item.discountPercent > 0 ? '#16a34a' : '#64748b' }}>
                            {item.discountPercent}%
                          </td>
                          <td style={{ textAlign: 'center' }}>{item.taxRate}% GST</td>
                          <td style={{ textAlign: 'right', color: '#475569', fontSize: '12px' }}>
                            +{formatINR(taxAmt)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            {formatINR(item.lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown */}
              <div className="quotation-summary-grid">
                <div className="notes-display-box" style={{ background: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span className="meta-label">Commercial Notes &amp; Special Conditions</span>
                  <p className="meta-val text-sm" style={{ marginTop: '6px', color: '#334155', lineHeight: 1.5 }}>
                    {quotation.notes || 'Standard manufacturing and dispatch terms apply. Goods inspected under ISO 9001 quality criteria.'}
                  </p>
                </div>

                <div className="quotation-totals-card">
                  <div className="total-row">
                    <span>Subtotal:</span>
                    <span>{formatINR(quotation.subtotal)}</span>
                  </div>
                  <div className="total-row text-success">
                    <span>Discount Total:</span>
                    <span>- {formatINR(quotation.discountTotal)}</span>
                  </div>
                  <div className="total-row">
                    <span>Applicable GST:</span>
                    <span>+ {formatINR(quotation.taxTotal)}</span>
                  </div>
                  <div className="total-divider"></div>
                  <div className="total-row grand-total-row">
                    <span>Grand Total:</span>
                    <span className="grand-total-amount">{formatINR(quotation.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === 'revisions' ? (
            /* REVISIONS SNAPSHOT HISTORY TAB */
            <div className="quotation-revisions-log">
              <h5 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                Archived Quotation Versions &amp; Revisions
              </h5>
              {(quotation.revisions || []).length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No previous revision versions recorded for this quotation.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {(quotation.revisions || []).map((rev, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '14px 18px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                            Revision Version #{rev.version || idx + 1}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '10px' }}>
                            Revised by <strong style={{ color: '#334155' }}>{rev.revisedBy || 'Sales User'}</strong> on {formatDate(rev.revisedAt)}
                          </span>
                        </div>
                        <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                          Prior Status: {rev.previousStatus || 'Approved'}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px', background: '#f8fafc', padding: '8px 12px', borderRadius: '4px' }}>
                        <strong>Revision Reason:</strong> {rev.reason || 'Specification & commercial term adjustments'}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#334155', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                        <span>
                          Prior Line Items: <strong>{(rev.previousItems || []).length} item(s)</strong>
                        </span>
                        <span>
                          Prior Grand Total: <strong style={{ color: '#0f172a' }}>{formatINR(rev.previousGrandTotal || 0)}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* AUDIT & APPROVAL HISTORY TAB */
            <div className="quotation-audit-log">
              <h5 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                Complete Audit Trail &amp; Workflow Log
              </h5>
              {(quotation.auditHistory || []).length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No historical entries recorded for this quotation.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(quotation.auditHistory || []).map((entry, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '12px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>{entry.action}</strong>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatDate(entry.timestamp)}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569' }}>
                        By: <strong style={{ color: '#334155' }}>{entry.user}</strong> ({entry.role})
                      </div>
                      {entry.remarks && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', background: '#f8fafc', padding: '6px 10px', borderRadius: '4px' }}>
                          <em>&ldquo;{entry.remarks}&rdquo;</em>
                        </div>
                      )}
                      {entry.previousVersionSnapshot && (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#3b82f6', background: '#eff6ff', padding: '6px 10px', borderRadius: '4px' }}>
                          <strong>Archived Snapshot:</strong> Total Value: {formatINR(entry.previousVersionSnapshot.grandTotal)} • Approved by: {entry.previousVersionSnapshot.approvedBy || 'Admin'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Reject Reason Modal (for creation rejection or download rejection) */}
      <RejectReasonModal
        isOpen={Boolean(rejectModalConfig)}
        onClose={() => setRejectModalConfig(null)}
        onConfirm={handleConfirmReject}
        title={rejectModalConfig?.title}
        subtitle={rejectModalConfig?.subtitle}
        placeholder={rejectModalConfig?.placeholder}
      />

      {/* Request Download Modal */}
      <RequestDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        quotation={quotation}
        onSendRequest={(id) => {
          try {
            requestDownloadApproval(id);
            showToast('Download approval request sent to Administrators!', 'info');
          } catch (err) {
            showToast(err.message, 'danger');
          }
        }}
      />

      {/* Edit Quotation Modal */}
      <CreateQuotationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        quotationToEdit={quotation}
      />

      {/* Send Quotation Email Modal */}
      <SendQuotationEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        quotation={quotation}
        customer={customers.find((c) => c.id === quotation.customerId || c.name === quotation.customerName)}
      />

      {/* Formal Quotation Document Preview Modal */}
      <QuotationDocumentPreviewModal
        isOpen={isPreviewDocOpen}
        onClose={() => setIsPreviewDocOpen(false)}
        quotation={quotation}
      />
    </>
  );
}
