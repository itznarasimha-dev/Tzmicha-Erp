import { useState, useMemo } from 'react';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import SearchFilterBar from '../components/common/SearchFilterBar';
import QuotationDetailModal from '../components/modals/QuotationDetailModal';
import CreateQuotationModal from '../components/modals/CreateQuotationModal';
import RequestDownloadModal from '../components/modals/RequestDownloadModal';
import RejectReasonModal from '../components/modals/RejectReasonModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useSales } from '../context/SalesContext';
import { useToast } from '../context/ToastContext';
import { formatINR, formatDate, getDaysDifference } from '../utils/formatters';
import { downloadQuotationDocument } from '../utils/documentGenerator';
import SendQuotationEmailModal from '../components/modals/SendQuotationEmailModal';
import { Eye, Download, Edit, Plus, Info, Mail, Check, X } from 'lucide-react';

export default function QuotationsPage({ preselectedFilter = null }) {
  const {
    quotations,
    permissions = {},
    downloadQuotationPDF,
    customers = [],
    userRole,
    userProfile,
    approveQuotation,
    rejectQuotation,
  } = useSales();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState(preselectedFilter || 'all');
  const [filterValues, setFilterValues] = useState({
    status: preselectedFilter || 'all',
  });

  // Modal Triggers
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);
  const selectedQuote = useMemo(() => {
    return quotations.find((q) => q.id === selectedQuoteId) || null;
  }, [quotations, selectedQuoteId]);

  const [isCreateQuoteOpen, setIsCreateQuoteOpen] = useState(false);
  const [quoteToEdit, setQuoteToEdit] = useState(null);
  const [emailQuote, setEmailQuote] = useState(null);
  const [quoteToApprove, setQuoteToApprove] = useState(null);
  const [quoteToReject, setQuoteToReject] = useState(null);

  const [downloadQuoteId, setDownloadQuoteId] = useState(null);
  const downloadQuote = useMemo(() => {
    return quotations.find((q) => q.id === downloadQuoteId) || null;
  }, [quotations, downloadQuoteId]);

  const [approvedEditConfirmQuote, setApprovedEditConfirmQuote] = useState(null);

  const isAdmin = userRole === 'admin' || userRole === 'sales_manager';
  const isFinance = userRole === 'finance';

  // Counts for workflow pills
  const counts = useMemo(() => {
    return {
      all: quotations.length,
      pendingCreation: quotations.filter((q) => q.status === 'Pending Approval' || q.status === 'Revised—Pending Approval' || q.status === 'Awaiting Approval').length,
      pendingDownload: quotations.filter((q) => q.downloadApprovalStatus === 'Pending Admin Approval').length,
      approved: quotations.filter((q) => q.status === 'Approved' || q.status === 'Accepted').length,
      drafts: quotations.filter((q) => q.status === 'Draft').length,
      rejected: quotations.filter((q) => q.status === 'Rejected').length,
    };
  }, [quotations]);

  const filters = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'Draft', label: 'Draft' },
        { value: 'Pending Approval', label: 'Pending Approval (Creation)' },
        { value: 'Approved', label: 'Approved (Creation Authorized)' },
        { value: 'Download Pending Admin Approval', label: 'Download Pending Admin Approval' },
        { value: 'Accepted', label: 'Accepted (Ready to Convert)' },
        { value: 'Converted', label: 'Converted to Order' },
        { value: 'Rejected', label: 'Rejected' },
        { value: 'Expired', label: 'Expired' },
      ],
    },
  ];

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setActiveTabFilter('custom');
  };

  const handleReset = () => {
    setSearch('');
    setFilterValues({ status: 'all' });
    setActiveTabFilter('all');
  };

  const handleTabClick = (tabKey) => {
    setActiveTabFilter(tabKey);
    if (tabKey === 'all') {
      setFilterValues({ status: 'all' });
    } else if (tabKey === 'pendingCreation') {
      setFilterValues({ status: 'Pending Approval' });
    } else if (tabKey === 'pendingDownload') {
      setFilterValues({ status: 'Download Pending Admin Approval' });
    } else if (tabKey === 'approved') {
      setFilterValues({ status: 'Approved' });
    } else if (tabKey === 'drafts') {
      setFilterValues({ status: 'Draft' });
    } else if (tabKey === 'rejected') {
      setFilterValues({ status: 'Rejected' });
    }
  };

  const filteredQuotes = useMemo(() => {
    return quotations.filter((q) => {
      const matchesSearch =
        !search.trim() ||
        q.quotationNo.toLowerCase().includes(search.toLowerCase()) ||
        q.customerName.toLowerCase().includes(search.toLowerCase()) ||
        (q.raisedBy && q.raisedBy.toLowerCase().includes(search.toLowerCase())) ||
        (q.salesOwner && q.salesOwner.toLowerCase().includes(search.toLowerCase())) ||
        (q.items || []).some((it) => it.productName?.toLowerCase().includes(search.toLowerCase()));

      let matchesStatus = true;
      if (filterValues.status === 'Download Pending Admin Approval') {
        matchesStatus = q.downloadApprovalStatus === 'Pending Admin Approval';
      } else if (filterValues.status === 'Pending Approval') {
        matchesStatus = q.status === 'Pending Approval' || q.status === 'Revised—Pending Approval' || q.status === 'Awaiting Approval';
      } else if (filterValues.status === 'Approved') {
        matchesStatus = q.status === 'Approved' || q.status === 'Accepted';
      } else if (filterValues.status !== 'all') {
        matchesStatus = q.status === filterValues.status;
      }

      return matchesSearch && matchesStatus;
    });
  }, [quotations, search, filterValues]);

  // Action column handlers
  const handleEditClick = (quote) => {
    const isApproved = quote.status === 'Approved' || quote.status === 'Accepted';
    if (isApproved && userRole !== 'sales_coordinator') {
      setApprovedEditConfirmQuote(quote);
    } else {
      setQuoteToEdit(quote);
    }
  };

  const handleDownloadClick = async (quote) => {
    const isApproved = quote.status === 'Approved' || quote.status === 'Accepted';
    if (!isApproved) {
      showToast('Quotation creation must be approved before PDF document download.', 'warning');
      return;
    }

    try {
      await downloadQuotationPDF(quote.id);
      showToast(`Quotation ${quote.quotationNo} PDF downloaded successfully`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to download PDF', 'danger');
    }
  };

  // Table Columns
  const columns = useMemo(() => {
    const baseCols = [
      {
        header: 'Quotation #',
        key: 'quotationNo',
        width: '135px',
        minWidth: '125px',
        align: 'left',
        render: (q, index) => (
          <div>
            <span className="font-semibold text-primary">{q.quotationNo}</span>
            {q.convertedOrderNo && index !== 3 && (
              <span className="text-xs text-muted block">
                &rarr; Order {q.convertedOrderNo}
              </span>
            )}
          </div>
        ),
      },
      {
        header: 'Customer ID',
        key: 'customerId',
        width: '125px',
        minWidth: '115px',
        align: 'center',
        render: (q) => {
          const cust = customers.find(
            (c) =>
              c.id === q.customerId ||
              c.customerId === q.customerId ||
              c.code === q.customerId ||
              (c.name && q.customerName && c.name.trim().toLowerCase() === q.customerName.trim().toLowerCase())
          );
          const displayId = cust?.customerId || cust?.code || q.customerId || '—';
          return (
            <span className="font-mono text-xs font-semibold text-primary bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {displayId}
            </span>
          );
        },
      },
      {
        header: 'Customer',
        key: 'customerName',
        width: '220px',
        minWidth: '200px',
        align: 'left',
        render: (q) => (
          <span className="font-medium text-slate-800">{q.customerName}</span>
        ),
      },
      {
        header: 'Raised By',
        key: 'raisedBy',
        width: '185px',
        minWidth: '165px',
        align: 'left',
        render: (q) => {
          const roleLabel =
            q.createdByRole === 'sales_coordinator'
              ? 'Sales Coordinator'
              : q.createdByRole === 'sales_manager'
              ? 'Sales Manager'
              : q.createdByRole === 'junior_sales'
              ? 'Junior Sales Employee'
              : 'Sales Rep';
          const displayRaisedBy =
            q.raisedBy ||
            q.salesOwner ||
            (q.createdByName ? `${q.createdByName} (${roleLabel})` : 'Vikram Mehta (Sales Rep)');
          return (
            <span className="text-xs font-medium text-slate-800" title={`Originally raised by ${displayRaisedBy}`}>
              {displayRaisedBy}
            </span>
          );
        },
      },
    {
      header: 'Creation Date',
      key: 'createdDate',
      width: '115px',
      minWidth: '110px',
      align: 'center',
      render: (q) => <span className="text-xs text-slate-700">{formatDate(q.createdDate)}</span>,
    },
    {
      header: 'Valid Until',
      key: 'validUntil',
      width: '115px',
      minWidth: '110px',
      align: 'center',
      render: (q) => {
        const days = getDaysDifference(q.validUntil);
        const isExpiring = days <= 3 && days >= 0 && q.status !== 'Converted' && q.status !== 'Rejected';
        return (
          <span className={`text-xs ${isExpiring ? 'text-danger font-semibold' : 'text-slate-700'}`}>
            {formatDate(q.validUntil)}
            {isExpiring && ' (Expiring!)'}
          </span>
        );
      },
    },
    {
      header: 'Product Summary',
      key: 'productSummary',
      width: '220px',
      minWidth: '180px',
      align: 'left',
      render: (q) => {
        const items = q.items || [];
        const summary = items.map((i) => i.productName).join(', ');
        return (
          <div className="text-xs truncate max-w-xs text-slate-700" title={summary}>
            {summary || 'Product Line Items'}
          </div>
        );
      },
    },
    {
      header: 'Quantity',
      key: 'quantity',
      width: '95px',
      minWidth: '90px',
      align: 'center',
      render: (q) => {
        const totalQty = (q.items || []).reduce((sum, it) => sum + (it.qty || 0), 0);
        return <span className="text-xs font-semibold text-slate-800">{totalQty} units</span>;
      },
    },
    {
      header: 'Subtotal',
      key: 'subtotal',
      width: '110px',
      minWidth: '100px',
      align: 'right',
      render: (q) => <span className="text-xs text-slate-800">{formatINR(q.subtotal || 0)}</span>,
    },
    {
      header: 'Discount',
      key: 'discount',
      width: '100px',
      minWidth: '90px',
      align: 'right',
      render: (q) => (
        <span className="text-xs text-success font-medium">
          {q.discountTotal > 0 ? `-${formatINR(q.discountTotal)}` : '₹0'}
        </span>
      ),
    },
    {
      header: 'Tax',
      key: 'tax',
      width: '115px',
      minWidth: '105px',
      align: 'right',
      render: (q) => (
        <span className="text-xs text-slate-600 font-medium">
          + {formatINR(q.taxTotal || 0)}
        </span>
      ),
    },
    {
      header: 'Total Amount',
      key: 'grandTotal',
      width: '125px',
      minWidth: '115px',
      align: 'right',
      render: (q) => <span className="font-bold text-slate-900">{formatINR(q.grandTotal)}</span>,
    },
    {
      header: 'Status',
      key: 'status',
      width: '140px',
      minWidth: '130px',
      align: 'center',
      render: (q) => {
        const isCoordinatorCreated =
          q.createdByRole === 'sales_coordinator' ||
          q.raisedBy?.includes('Sales Coordinator') ||
          q.salesOwner?.includes('Sales Coordinator') ||
          q.createdBy === 'APX-EMP-3044';

        if (isCoordinatorCreated) {
          return (
            <span
              className="text-muted font-bold"
              style={{ fontSize: '15px' }}
              title="No approval required for quotations created by Sales Coordinator"
            >
              —
            </span>
          );
        }
        return (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <StatusBadge status={q.status} size="small" />
          </div>
        );
      },
    },
    {
      header: 'Download Status',
      key: 'downloadStatus',
      width: '135px',
      minWidth: '125px',
      align: 'center',
      render: (q) => {
        if (q.downloadApprovalStatus === 'Approved') {
          return <span className="badge badge-success badge-sm" title="Admin download approved">✓ Approved</span>;
        }
        if (q.downloadApprovalStatus === 'Pending Admin Approval') {
          return <span className="badge badge-warning badge-sm" title="Awaiting Admin sign-off">⏳ Pending Admin</span>;
        }
        if (q.downloadApprovalStatus === 'Rejected') {
          return <span className="badge badge-danger badge-sm" title={q.downloadRejectedReason || 'Rejected'}>✕ Rejected</span>;
        }
        return <span className="text-xs text-muted">—</span>;
      },
    },
    {
      header: 'Actions',
      width: '165px',
      minWidth: '155px',
      align: 'center',
      render: (q) => {
        const isAwaitingApproval =
          q.status === 'Pending Approval' ||
          q.status === 'Revised—Pending Approval' ||
          q.status === 'Awaiting Approval';

        const isCoordinatorQuote =
          q.createdByRole === 'sales_coordinator' ||
          q.raisedBy?.includes('Sales Coordinator') ||
          q.salesOwner?.includes('Sales Coordinator') ||
          q.createdBy === 'APX-EMP-3044';

        const isManagerQuote =
          q.createdByRole === 'sales_manager' ||
          q.raisedBy?.includes('Sales Manager') ||
          q.salesOwner?.includes('Sales Manager') ||
          q.createdBy === 'APX-EMP-1002' ||
          q.approvalRequiredFrom === 'sales_coordinator';

        const isSelf =
          q.createdBy === userProfile?.employeeId ||
          q.createdByName === userProfile?.fullName ||
          (userRole === 'sales_coordinator' && isCoordinatorQuote) ||
          (userRole === 'sales_manager' && isManagerQuote);

        let canApproveOrReject = false;
        if (isAwaitingApproval && !isSelf && userRole !== 'sales_rep') {
          if (userRole === 'sales_coordinator' || userRole === 'admin') {
            canApproveOrReject = true;
          } else if (userRole === 'sales_manager') {
            canApproveOrReject = !isManagerQuote && !isCoordinatorQuote;
          }
        }

        return (
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
            {/* VIEW ACTION (Open and review complete quotation details) */}
            <button
              type="button"
              className="table-action-icon-btn"
              onClick={() => setSelectedQuoteId(q.id)}
              title="View quotation details & audit history"
            >
              <Eye size={15} />
            </button>

            {/* APPROVAL ACTIONS FOR AUTHORIZED REVIEWERS */}
            {canApproveOrReject && (
              <>
                <button
                  type="button"
                  className="table-action-icon-btn text-success"
                  onClick={() => setQuoteToApprove(q)}
                  title="Approve quotation"
                  style={{ color: '#16a34a' }}
                >
                  <Check size={16} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  className="table-action-icon-btn text-danger"
                  onClick={() => setQuoteToReject(q)}
                  title="Reject quotation"
                  style={{ color: '#dc2626' }}
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </>
            )}

            {/* EDIT ACTION */}
            <button
              type="button"
              className="table-action-icon-btn"
              onClick={() => handleEditClick(q)}
              title={
                q.status === 'Approved' || q.status === 'Accepted'
                  ? 'Revise approved quotation'
                  : q.status === 'Rejected'
                  ? 'Edit & resubmit rejected quotation'
                  : 'Edit quotation'
              }
            >
              <Edit size={15} />
            </button>

            {/* EMAIL ACTION (Available for Approved Quotations) */}
            {(q.status === 'Approved' || q.status === 'Accepted') && (
              <button
                type="button"
                className="table-action-icon-btn text-primary"
                onClick={() => setEmailQuote(q)}
                title="Send commercial proposal to client via email"
              >
                <Mail size={15} />
              </button>
            )}

            {/* DOWNLOAD / PREVIEW ACTION */}
            <button
              type="button"
              className={`table-action-icon-btn ${(q.status === 'Approved' || q.status === 'Accepted') ? 'text-primary' : ''}`}
              onClick={() => handleDownloadClick(q)}
              title={
                permissions.canDownloadQuotationPDF
                  ? 'Download official quotation PDF (Logs audit and notifies Admin)'
                  : 'Preview quotation proposal PDF in browser (Download restricted)'
              }
            >
              <Download size={15} />
            </button>
          </div>
        );
      },
    },
  ];

    if (userRole === 'sales_coordinator') {
      return baseCols.filter((col) => col.key !== 'downloadStatus');
    }
    return baseCols;
  }, [userRole, userProfile, customers, permissions]);

  return (
    <div className="page-container">
      {/* Page Header with prominent "+ Create Quotation" button */}
      <div className="page-header-row mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-title">Quotations Repository</h2>
          <p className="page-description">
            Create customer price proposals, manage approval workflows, track validity periods, and convert accepted quotes to orders
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm btn-icon-text"
          onClick={() => setIsCreateQuoteOpen(true)}
          title="Create a new price quotation"
        >
          <Plus size={15} />
          <span>Create Quotation</span>
        </button>
      </div>

      {/* Role Notice & Governance Banner */}
      <div className="alert-callout alert-callout-info mb-4">
        <Info size={16} className="callout-icon" />
        <div className="callout-text text-xs">
          <strong>Commercial Governance &amp; Approval System:</strong> Quotation creation: Sales Rep requires Manager or Coordinator approval; Sales Manager requires Coordinator approval; Sales Coordinator is directly approved. Self-approval is prohibited. PDF downloads are restricted to Sales Coordinator and Manager, and logged to audit.
        </div>
      </div>

      {/* Workflow Tabs / Quick Filters */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '16px',
        }}
      >
        <button
          type="button"
          className={`btn btn-sm ${activeTabFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => handleTabClick('all')}
        >
          All Quotations ({counts.all})
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeTabFilter === 'pendingCreation' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => handleTabClick('pendingCreation')}
          style={counts.pendingCreation > 0 ? { borderColor: '#f59e0b', color: activeTabFilter === 'pendingCreation' ? '#fff' : '#b45309' } : {}}
        >
          {userRole === 'sales_coordinator'
            ? `⏳ Awaiting My Review (${counts.pendingCreation})`
            : userRole === 'sales_manager'
            ? `⏳ Pending Review (${counts.pendingCreation})`
            : `⏳ Pending Approval (${counts.pendingCreation})`}
        </button>

        {userRole !== 'sales_coordinator' && (
          <button
            type="button"
            className={`btn btn-sm ${activeTabFilter === 'pendingDownload' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleTabClick('pendingDownload')}
            style={counts.pendingDownload > 0 ? { borderColor: '#3b82f6', color: activeTabFilter === 'pendingDownload' ? '#fff' : '#1d4ed8' } : {}}
          >
            📥 Pending Download Approval ({counts.pendingDownload})
          </button>
        )}

        <button
          type="button"
          className={`btn btn-sm ${activeTabFilter === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => handleTabClick('approved')}
        >
          ✓ Approved ({counts.approved})
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeTabFilter === 'drafts' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => handleTabClick('drafts')}
        >
          Drafts ({counts.drafts})
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeTabFilter === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => handleTabClick('rejected')}
          style={counts.rejected > 0 ? { borderColor: '#ef4444', color: activeTabFilter === 'rejected' ? '#fff' : '#b91c1c' } : {}}
        >
          ✕ Rejected ({counts.rejected})
        </button>
      </div>

      <SearchFilterBar
        searchPlaceholder="Search quotations by number, customer, product, or sales rep..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      <DataTable
        columns={columns}
        data={filteredQuotes}
        keyField="id"
        emptyMessage="No quotations found matching selected filters"
        pageSize={8}
        minWidth="1550px"
      />

      {/* Create New Quotation Modal */}
      <CreateQuotationModal
        isOpen={isCreateQuoteOpen}
        onClose={() => setIsCreateQuoteOpen(false)}
      />

      {/* Edit Quotation Modal */}
      <CreateQuotationModal
        isOpen={Boolean(quoteToEdit)}
        onClose={() => setQuoteToEdit(null)}
        quotationToEdit={quoteToEdit}
      />

      {/* Quotation Detail Modal */}
      <QuotationDetailModal
        isOpen={Boolean(selectedQuote)}
        onClose={() => setSelectedQuoteId(null)}
        quotation={selectedQuote}
        onEditQuotation={(q) => handleEditClick(q)}
      />

      {/* Request Download Modal */}
      <RequestDownloadModal
        isOpen={Boolean(downloadQuote)}
        onClose={() => setDownloadQuoteId(null)}
        quotation={downloadQuote}
        onSendRequest={(id) => {
          try {
            requestDownloadApproval(id);
            showToast('Download approval request submitted to Administrators!', 'info');
          } catch (err) {
            showToast(err.message, 'danger');
          }
        }}
      />

      {/* Confirmation Dialog before Editing Approved Quotation */}
      <ConfirmDialog
        isOpen={Boolean(approvedEditConfirmQuote)}
        onClose={() => setApprovedEditConfirmQuote(null)}
        onConfirm={() => {
          const q = approvedEditConfirmQuote;
          setApprovedEditConfirmQuote(null);
          setQuoteToEdit(q);
        }}
        title="Revise Approved Quotation?"
        message={`Quotation ${approvedEditConfirmQuote?.quotationNo} is currently approved. Modifying it will transition its status to "Revised—Pending Approval" and require re-authorization by a ${userRole === 'sales_manager' ? 'Sales Coordinator' : 'Sales Manager or Sales Coordinator'}. The original approved snapshot and audit trail are preserved.`}
        confirmLabel="Proceed to Edit"
        variant="warning"
      />

      {/* Send Quotation Email Modal */}
      <SendQuotationEmailModal
        isOpen={Boolean(emailQuote)}
        onClose={() => setEmailQuote(null)}
        quotation={emailQuote}
        customer={customers.find((c) => c.id === emailQuote?.customerId || c.name === emailQuote?.customerName)}
      />

      {/* Quick Table Approve Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(quoteToApprove)}
        onClose={() => setQuoteToApprove(null)}
        onConfirm={() => {
          if (!quoteToApprove) return;
          try {
            const roleTitle = userRole === 'sales_coordinator' ? 'Sales Coordinator' : 'Sales Manager';
            approveQuotation(quoteToApprove.id, `Approved by ${userProfile.fullName} (${roleTitle})`);
            showToast(`Quotation ${quoteToApprove.quotationNo} approved successfully!`, 'success');
          } catch (err) {
            showToast(err.message, 'danger');
          }
          setQuoteToApprove(null);
        }}
        title={`Approve Quotation ${quoteToApprove?.quotationNo}?`}
        message={`Confirm approval for quotation ${quoteToApprove?.quotationNo} (${quoteToApprove?.customerName}, Total: ${formatINR(quoteToApprove?.grandTotal || 0)}) raised by ${quoteToApprove?.raisedBy || quoteToApprove?.salesOwner || 'Salesperson'}. This decision and timestamp will be saved under your identity (${userProfile?.fullName}).`}
        confirmLabel="Confirm & Approve"
        variant="success"
      />

      {/* Quick Table Reject Reason Modal */}
      <RejectReasonModal
        isOpen={Boolean(quoteToReject)}
        onClose={() => setQuoteToReject(null)}
        onConfirm={(reason) => {
          if (!quoteToReject) return;
          try {
            rejectQuotation(quoteToReject.id, reason);
            showToast(`Quotation ${quoteToReject.quotationNo} rejected. Reason recorded in audit log.`, 'warning');
          } catch (err) {
            showToast(err.message, 'danger');
          }
          setQuoteToReject(null);
        }}
        title={`Reject Quotation ${quoteToReject?.quotationNo}`}
        subtitle={`Record rejection reason for quotation raised by ${quoteToReject?.raisedBy || quoteToReject?.salesOwner || 'Salesperson'}`}
        placeholder="Specify commercial, credit term, or technical reasons for rejection..."
      />
    </div>
  );
}
