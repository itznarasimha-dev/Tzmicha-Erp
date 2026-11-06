import { useState, useMemo } from 'react';
import DataTable from '../components/common/DataTable';
import SearchFilterBar from '../components/common/SearchFilterBar';
import CustomersSubNav from '../components/common/CustomersSubNav';
import WhatsAppIcon from '../components/common/WhatsAppIcon';
import MarketingLeadDetailModal from '../components/modals/MarketingLeadDetailModal';
import AssignLeadModal from '../components/modals/AssignLeadModal';
import RejectLeadModal from '../components/modals/RejectLeadModal';
import CustomerMatchVerificationModal from '../components/modals/CustomerMatchVerificationModal';
import MarketingIntegrationStatusModal from '../components/modals/MarketingIntegrationStatusModal';
import ConvertToPipelineModal from '../components/modals/ConvertToPipelineModal';
import { useSales } from '../context/SalesContext';
import { useToast } from '../context/ToastContext';
import { formatDate, getWhatsAppUrl } from '../utils/formatters';
import {
  Users,
  UserPlus,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  UserCheck,
  TrendingUp,
  Download,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Phone,
  Mail,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Radio,
} from 'lucide-react';

const STATUS_BADGE_CONFIG = {
  New: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Under Review': { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Accepted: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Assigned: { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  Contacted: { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' },
  Converted: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  Rejected: { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
};

export default function MarketingLeadsPage() {
  const {
    scopedMarketingLeads,
    marketingLeads,
    userRole,
    userProfile,
    permissions,
    acceptMarketingLead,
    downloadMarketingLeadsData,
    findMatchingCustomers,
  } = useSales();
  const { showToast } = useToast();

  // Search & filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');

  // Modal states
  const [selectedLead, setSelectedLead] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [assigningLead, setAssigningLead] = useState(null);
  const [rejectingLead, setRejectingLead] = useState(null);
  const [convertingLead, setConvertingLead] = useState(null);
  const [isIntegrationStatusOpen, setIsIntegrationStatusOpen] = useState(false);

  // Multi-match resolution modal
  const [verificationData, setVerificationData] = useState(null); // { lead, matches }

  // Strict role-based access control: Junior Sales Employees are blocked
  if (userRole === 'junior_sales') {
    return (
      <div className="page-container">
        <CustomersSubNav currentTab="marketing-leads" />

        <div
          style={{
            maxWidth: '650px',
            margin: '40px auto',
            background: '#ffffff',
            border: '1px solid #fecdd3',
            borderRadius: '10px',
            padding: '30px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(225, 29, 72, 0.08)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              background: '#ffe4e6',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <ShieldAlert size={28} className="text-rose-600" />
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#9f1239', marginBottom: '8px' }}>
            Access Restricted — Marketing Leads
          </h2>

          <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', marginBottom: '16px' }}>
            Inbound Marketing Leads are reserved for <strong>Sales Managers</strong>,{' '}
            <strong>Sales Coordinators</strong>, and <strong>Sales Representatives</strong>. Per ApexERP Sales
            Governance policy, Junior Sales Employees do not have authorization to view or process inbound marketing
            referrals.
          </p>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '12px',
              fontSize: '12px',
              color: '#64748b',
              textAlign: 'left',
            }}
          >
            <strong>Your Assigned Access Scope:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
              <li>Sales Customers directory (Read & update existing assigned customer accounts)</li>
              <li>Dual-level Quotation drafting with approval workflows</li>
              <li>Daily Schedule, Attendance, and Work Updates</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Summary Metrics Calculation (based on scoped leads)
  const metrics = useMemo(() => {
    const total = scopedMarketingLeads.length;
    const countNew = scopedMarketingLeads.filter((l) => l.status === 'New').length;
    const underReview = scopedMarketingLeads.filter((l) => l.status === 'Under Review').length;
    const accepted = scopedMarketingLeads.filter((l) => l.status === 'Accepted').length;
    const assigned = scopedMarketingLeads.filter((l) => l.status === 'Assigned').length;
    const converted = scopedMarketingLeads.filter((l) => l.status === 'Converted').length;
    const rejected = scopedMarketingLeads.filter((l) => l.status === 'Rejected').length;

    return { total, countNew, underReview, accepted, assigned, converted, rejected };
  }, [scopedMarketingLeads]);

  // Unique locations for filter
  const uniqueLocations = useMemo(() => {
    const locs = new Set();
    scopedMarketingLeads.forEach((l) => {
      if (l.location) locs.add(l.location);
    });
    return Array.from(locs);
  }, [scopedMarketingLeads]);

  // Unique assignees for filter
  const uniqueAssignees = useMemo(() => {
    const map = new Map();
    scopedMarketingLeads.forEach((l) => {
      if (l.assignedEmployeeId && l.assignedEmployeeName) {
        map.set(l.assignedEmployeeId, l.assignedEmployeeName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [scopedMarketingLeads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return scopedMarketingLeads.filter((lead) => {
      // Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const leadIdMatch = (lead.leadId || '').toLowerCase().includes(q);
        const nameMatch = (lead.customerName || '').toLowerCase().includes(q);
        const compMatch = (lead.companyName || '').toLowerCase().includes(q);
        const phoneMatch = (lead.mobile || '').replace(/[\s-]/g, '').includes(q.replace(/[\s-]/g, ''));
        const emailMatch = (lead.email || '').toLowerCase().includes(q);
        const prodMatch = (lead.interestedProduct || '').toLowerCase().includes(q);
        const senderMatch = (lead.sentBy || '').toLowerCase().includes(q);
        if (!leadIdMatch && !nameMatch && !compMatch && !phoneMatch && !emailMatch && !prodMatch && !senderMatch) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'all' && lead.status !== statusFilter) {
        return false;
      }

      // Location
      if (locationFilter !== 'all' && lead.location !== locationFilter) {
        return false;
      }

      // Assigned Employee
      if (assignedFilter !== 'all') {
        if (assignedFilter === 'unassigned') {
          if (lead.assignedEmployeeId) return false;
        } else if (lead.assignedEmployeeId !== assignedFilter) {
          return false;
        }
      }

      // Date
      if (dateFilter !== 'all') {
        const leadDate = new Date(lead.dateReceived);
        const now = new Date();
        if (dateFilter === 'this_week') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
          if (leadDate < oneWeekAgo) return false;
        } else if (dateFilter === 'this_month') {
          if (leadDate.getMonth() !== now.getMonth() || leadDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (dateFilter === 'oct_2026') {
          if (leadDate.getMonth() !== 9 || leadDate.getFullYear() !== 2026) {
            return false;
          }
        }
      }

      return true;
    });
  }, [scopedMarketingLeads, search, statusFilter, locationFilter, assignedFilter, dateFilter]);

  // Handle lead acceptance with multi-match resolution
  const handleAcceptLead = (lead) => {
    try {
      const res = acceptMarketingLead(lead.leadId);
      if (res.requiresVerification) {
        setVerificationData({ lead, matches: res.matches });
      } else {
        showToast(res.message, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to accept lead', 'error');
    }
  };

  const handleLinkConfirmed = (targetCustomerId) => {
    if (!verificationData) return;
    try {
      const res = acceptMarketingLead(verificationData.lead.leadId, { forcedCustomerId: targetCustomerId });
      showToast(res.message, 'success');
      setVerificationData(null);
    } catch (err) {
      showToast(err.message || 'Failed to link customer', 'error');
    }
  };

  const handleCreateNewConfirmed = () => {
    if (!verificationData) return;
    try {
      const res = acceptMarketingLead(verificationData.lead.leadId, { createNewCustomer: true });
      showToast(res.message, 'success');
      setVerificationData(null);
    } catch (err) {
      showToast(err.message || 'Failed to create customer', 'error');
    }
  };

  const handleExportCSV = () => {
    try {
      downloadMarketingLeadsData();
      showToast('Marketing leads CSV exported successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to export CSV', 'error');
    }
  };

  // 13-Column Table Definitions
  const columns = [
    {
      header: 'Lead ID',
      key: 'leadId',
      width: '125px',
      minWidth: '115px',
      render: (lead) => (
        <div>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: '#0369a1' }}>
            {lead.leadId}
          </span>
          {lead.marketingRecordRef && (
            <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>{lead.marketingRecordRef}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Customer / Contact Person',
      key: 'customerName',
      width: '170px',
      minWidth: '150px',
      render: (lead) => (
        <div>
          <span style={{ fontWeight: 600, fontSize: '12px', color: '#0f172a', display: 'block' }}>
            {lead.customerName}
          </span>
          {lead.designation && (
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{lead.designation}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Company Name',
      key: 'companyName',
      width: '190px',
      minWidth: '170px',
      render: (lead) => (
        <div>
          <span style={{ fontWeight: 600, fontSize: '12px', color: '#1e293b', display: 'block' }}>
            {lead.companyName}
          </span>
          {lead.linkedCustomerId && (
            <span
              style={{
                fontSize: '10px',
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '1px 5px',
                borderRadius: '4px',
                fontWeight: 600,
                display: 'inline-block',
                marginTop: '2px',
              }}
            >
              Cust: {lead.linkedCustomerId}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Mobile Number',
      key: 'mobile',
      width: '155px',
      minWidth: '145px',
      render: (lead) => {
        const waUrl = getWhatsAppUrl(
          lead.mobile,
          `Hello ${lead.customerName}, contacting you from ApexERP Sales regarding your inquiry.`
        );
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', whiteSpace: 'nowrap' }}>
            <Phone size={12} className="text-slate-400 shrink-0" />
            <span style={{ fontWeight: 500, color: '#334155' }}>{lead.mobile}</span>
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open WhatsApp chat with ${lead.customerName}`}
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '18px',
                  height: '18px',
                  color: '#25D366',
                  borderRadius: '4px',
                  textDecoration: 'none',
                }}
              >
                <WhatsAppIcon size={14} color="#25D366" />
              </a>
            )}
          </div>
        );
      },
    },
    {
      header: 'Email',
      key: 'email',
      width: '180px',
      minWidth: '160px',
      render: (lead) => (
        <div style={{ fontSize: '12px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {lead.email ? (
            <a
              href={`mailto:${lead.email}`}
              onClick={(e) => e.stopPropagation()}
              style={{ color: '#0284c7', textDecoration: 'none' }}
              title={lead.email}
            >
              {lead.email}
            </a>
          ) : (
            <span style={{ color: '#94a3b8' }}>—</span>
          )}
        </div>
      ),
    },
    {
      header: 'Location / City',
      key: 'location',
      width: '140px',
      minWidth: '125px',
      render: (lead) => (
        <div style={{ fontSize: '12px', color: '#334155' }}>
          <span>{lead.location || lead.city || '—'}</span>
        </div>
      ),
    },
    {
      header: 'Interested Product / Service',
      key: 'interestedProduct',
      width: '190px',
      minWidth: '170px',
      render: (lead) => (
        <div style={{ fontSize: '12px', fontWeight: 500, color: '#1e40af' }}>
          {lead.interestedProduct || 'General Products'}
        </div>
      ),
    },
    {
      header: 'Requirement / Remarks',
      key: 'requirement',
      width: '210px',
      minWidth: '190px',
      render: (lead) => (
        <div
          title={lead.requirement}
          style={{
            fontSize: '11px',
            color: '#475569',
            lineHeight: '1.4',
            maxHeight: '36px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {lead.requirement || '—'}
        </div>
      ),
    },
    {
      header: 'Sent By (Marketing)',
      key: 'sentBy',
      width: '165px',
      minWidth: '145px',
      render: (lead) => (
        <div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', display: 'block' }}>
            {lead.sentBy}
          </span>
          <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>
            {lead.sentByRole || 'Marketing Specialist'}
          </span>
        </div>
      ),
    },
    {
      header: 'Date Received',
      key: 'dateReceived',
      width: '115px',
      minWidth: '105px',
      render: (lead) => (
        <span style={{ fontSize: '12px', color: '#334155' }}>{formatDate(lead.dateReceived)}</span>
      ),
    },
    {
      header: 'Assigned Sales Employee',
      key: 'assignedEmployeeName',
      width: '165px',
      minWidth: '150px',
      render: (lead) => {
        if (!lead.assignedEmployeeName) {
          return (
            <span
              style={{
                fontSize: '11px',
                background: '#f1f5f9',
                color: '#64748b',
                padding: '2px 8px',
                borderRadius: '12px',
                fontStyle: 'italic',
              }}
            >
              Unassigned
            </span>
          );
        }
        return (
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#581c87', display: 'block' }}>
              {lead.assignedEmployeeName}
            </span>
            <span style={{ fontSize: '10px', color: '#7e22ce', display: 'block' }}>
              {lead.assignedEmployeeId}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Lead Status',
      key: 'status',
      width: '120px',
      minWidth: '110px',
      align: 'center',
      render: (lead) => {
        const badgeStyle = STATUS_BADGE_CONFIG[lead.status] || STATUS_BADGE_CONFIG.New;
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '12px',
              background: badgeStyle.bg,
              color: badgeStyle.color,
              border: `1px solid ${badgeStyle.border}`,
              display: 'inline-block',
              textAlign: 'center',
            }}
          >
            {lead.status}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      key: 'actions',
      width: '160px',
      minWidth: '150px',
      align: 'center',
      render: (lead) => {
        const canAssign = permissions.canAssignMarketingLeads && lead.status !== 'Rejected' && lead.status !== 'Converted';
        const canAccept = permissions.canAcceptRejectMarketingLeads && lead.status !== 'Accepted' && lead.status !== 'Converted' && lead.status !== 'Rejected';
        const canReject = permissions.canAcceptRejectMarketingLeads && lead.status !== 'Rejected' && lead.status !== 'Converted';
        const canPipeline = !lead.pipelineOpportunityId && lead.status !== 'Rejected';

        return (
          <div
            style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* View Details */}
            <button
              type="button"
              className="table-action-icon-btn"
              title="View full lead dossier & history"
              onClick={() => {
                setSelectedLead(lead);
                setIsDetailOpen(true);
              }}
            >
              <Eye size={15} />
            </button>

            {/* Accept & Create Customer */}
            {canAccept && (
              <button
                type="button"
                className="table-action-icon-btn text-emerald-600 hover:bg-emerald-50"
                title="Accept lead & auto-create Customer record"
                onClick={() => handleAcceptLead(lead)}
              >
                <CheckCircle2 size={15} />
              </button>
            )}

            {/* Assign to Rep */}
            {canAssign && (
              <button
                type="button"
                className="table-action-icon-btn text-purple-600 hover:bg-purple-50"
                title="Assign to Sales Representative"
                onClick={() => setAssigningLead(lead)}
              >
                <UserCheck size={15} />
              </button>
            )}

            {/* Add to Pipeline */}
            {canPipeline && (lead.status === 'Accepted' || lead.status === 'Assigned') && (
              <button
                type="button"
                className="table-action-icon-btn text-blue-600 hover:bg-blue-50"
                title="Convert to Sales Pipeline Opportunity"
                onClick={() => setConvertingLead(lead)}
              >
                <TrendingUp size={15} />
              </button>
            )}

            {/* Reject Lead */}
            {canReject && (
              <button
                type="button"
                className="table-action-icon-btn text-rose-600 hover:bg-rose-50"
                title="Reject lead with mandatory reason"
                onClick={() => setRejectingLead(lead)}
              >
                <XCircle size={15} />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="page-container">
      {/* Sub-Navigation Strip */}
      <CustomersSubNav currentTab="marketing-leads" />

      {/* Page Header */}
      <div className="page-header-row mb-4">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="page-title" style={{ margin: 0 }}>
              Marketing Leads
            </h2>
            <span
              style={{
                fontSize: '11px',
                background: '#eff6ff',
                color: '#1d4ed8',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: '600',
              }}
            >
              {userRole === 'sales_manager'
                ? 'All Organization Inbound'
                : userRole === 'sales_coordinator'
                ? 'Regional Inbound (Hyderabad Hub)'
                : `Assigned Leads (${userProfile.fullName})`}
            </span>
          </div>
          <p className="page-description" style={{ marginTop: '4px' }}>
            Review, qualify, accept, and convert inbound marketing inquiries forwarded to the Sales team.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsIntegrationStatusOpen(true)}
            title="View Marketing Module integration status and connection diagnostics"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <Radio size={14} style={{ marginRight: '6px', color: '#64748b' }} />
            Integration Status
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCSV}
            title="Export filtered marketing leads to CSV"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <Download size={14} style={{ marginRight: '6px' }} />
            Export CSV
          </button>
        </div>
      </div>

      {/* 7 Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        <div
          onClick={() => setStatusFilter('all')}
          style={{
            background: statusFilter === 'all' ? '#f0f9ff' : '#ffffff',
            border: statusFilter === 'all' ? '2px solid #0284c7' : '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total Leads</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
            {metrics.total}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('New')}
          style={{
            background: statusFilter === 'New' ? '#eff6ff' : '#ffffff',
            border: statusFilter === 'New' ? '2px solid #2563eb' : '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 600 }}>New Leads</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#1d4ed8', marginTop: '4px' }}>
            {metrics.countNew}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('Under Review')}
          style={{
            background: statusFilter === 'Under Review' ? '#fffbeb' : '#ffffff',
            border: statusFilter === 'Under Review' ? '2px solid #d97706' : '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>Under Review</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#b45309', marginTop: '4px' }}>
            {metrics.underReview}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('Accepted')}
          style={{
            background: statusFilter === 'Accepted' ? '#f0fdf4' : '#ffffff',
            border: statusFilter === 'Accepted' ? '2px solid #16a34a' : '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>Accepted</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#15803d', marginTop: '4px' }}>
            {metrics.accepted}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('Assigned')}
          style={{
            background: statusFilter === 'Assigned' ? '#faf5ff' : '#ffffff',
            border: statusFilter === 'Assigned' ? '2px solid #9333ea' : '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '11px', color: '#7e22ce', fontWeight: 600 }}>Assigned</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#7e22ce', marginTop: '4px' }}>
            {metrics.assigned}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('Converted')}
          style={{
            background: statusFilter === 'Converted' ? '#ecfdf5' : '#ffffff',
            border: statusFilter === 'Converted' ? '2px solid #059669' : '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '11px', color: '#047857', fontWeight: 600 }}>Converted</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#047857', marginTop: '4px' }}>
            {metrics.converted}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('Rejected')}
          style={{
            background: statusFilter === 'Rejected' ? '#fff1f2' : '#ffffff',
            border: statusFilter === 'Rejected' ? '2px solid #e11d48' : '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '11px', color: '#be123c', fontWeight: 600 }}>Rejected</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#be123c', marginTop: '4px' }}>
            {metrics.rejected}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '32px', fontSize: '12px' }}
            placeholder="Search by Lead ID, contact name, company, phone, email, product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status Dropdown */}
        <div style={{ minWidth: '140px' }}>
          <select
            className="form-input"
            style={{ fontSize: '12px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="New">New</option>
            <option value="Under Review">Under Review</option>
            <option value="Accepted">Accepted</option>
            <option value="Assigned">Assigned</option>
            <option value="Converted">Converted</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* Date Filter */}
        <div style={{ minWidth: '130px' }}>
          <select
            className="form-input"
            style={{ fontSize: '12px' }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Dates</option>
            <option value="this_week">Past 7 Days</option>
            <option value="this_month">This Month</option>
            <option value="oct_2026">October 2026</option>
          </select>
        </div>

        {/* Location Filter */}
        <div style={{ minWidth: '140px' }}>
          <select
            className="form-input"
            style={{ fontSize: '12px' }}
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="all">All Locations</option>
            {uniqueLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Assigned Rep Filter (visible to Manager/Coordinator) */}
        {userRole !== 'sales_rep' && (
          <div style={{ minWidth: '160px' }}>
            <select
              className="form-input"
              style={{ fontSize: '12px' }}
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
            >
              <option value="all">All Assignees</option>
              <option value="unassigned">Unassigned Only</option>
              {uniqueAssignees.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {(search || statusFilter !== 'all' || dateFilter !== 'all' || locationFilter !== 'all' || assignedFilter !== 'all') && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '6px 10px' }}
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setDateFilter('all');
              setLocationFilter('all');
              setAssignedFilter('all');
            }}
          >
            <RefreshCw size={12} style={{ marginRight: '4px' }} />
            Reset Filters
          </button>
        )}
      </div>

      {/* 13-Column Leads Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          data={filteredLeads}
          emptyMessage="No marketing leads match your criteria."
          onRowClick={(lead) => {
            setSelectedLead(lead);
            setIsDetailOpen(true);
          }}
        />
      </div>

      {/* Interactive Modals */}
      {/* 1. Detail Dossier Modal */}
      {isDetailOpen && selectedLead && (
        <MarketingLeadDetailModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedLead(null);
          }}
          lead={selectedLead}
          onAccept={(lead) => handleAcceptLead(lead)}
          onAssign={(lead) => setAssigningLead(lead)}
          onReject={(lead) => setRejectingLead(lead)}
          onConvertToPipeline={(lead) => setConvertingLead(lead)}
        />
      )}

      {/* 2. Assign Lead Modal */}
      {assigningLead && (
        <AssignLeadModal
          isOpen={Boolean(assigningLead)}
          onClose={() => setAssigningLead(null)}
          lead={assigningLead}
        />
      )}

      {/* 3. Reject Lead Modal */}
      {rejectingLead && (
        <RejectLeadModal
          isOpen={Boolean(rejectingLead)}
          onClose={() => setRejectingLead(null)}
          lead={rejectingLead}
        />
      )}

      {/* 4. Convert to Pipeline Modal */}
      {convertingLead && (
        <ConvertToPipelineModal
          isOpen={Boolean(convertingLead)}
          onClose={() => setConvertingLead(null)}
          lead={convertingLead}
        />
      )}

      {/* 5. Marketing Integration Diagnostics Modal */}
      {isIntegrationStatusOpen && (
        <MarketingIntegrationStatusModal
          isOpen={isIntegrationStatusOpen}
          onClose={() => setIsIntegrationStatusOpen(false)}
        />
      )}

      {/* 6. Multi-Match Customer Verification Modal */}
      {verificationData && (
        <CustomerMatchVerificationModal
          isOpen={Boolean(verificationData)}
          onClose={() => setVerificationData(null)}
          lead={verificationData.lead}
          matches={verificationData.matches}
          onLinkToCustomer={handleLinkConfirmed}
          onCreateNewCustomer={handleCreateNewConfirmed}
        />
      )}
    </div>
  );
}
