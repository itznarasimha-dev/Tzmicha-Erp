import { useState, useMemo } from 'react';
import {
  Plus,
  User,
  Users,
  Layers,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  CheckCheck,
  Eye,
} from 'lucide-react';
import DataTable from '../components/common/DataTable';
import SearchFilterBar from '../components/common/SearchFilterBar';
import WhatsAppIcon from '../components/common/WhatsAppIcon';
import LogFollowupModal from '../components/modals/LogFollowupModal';
import CompleteFollowupModal from '../components/modals/CompleteFollowupModal';
import HandoverFollowupModal from '../components/modals/HandoverFollowupModal';
import FollowupDetailModal from '../components/modals/FollowupDetailModal';
import { useSales } from '../context/SalesContext';
import { formatDate, getWhatsAppUrl } from '../utils/formatters';
import {
  calculateActivityPriority,
  computeScheduleStatus,
} from '../utils/priorityRules';

export default function CallsFollowupsPage({ embedded = false }) {
  const {
    followups,
    customers,
    orders,
    quotations,
    invoices,
    userProfile,
  } = useSales();

  const currentUserName = userProfile?.fullName || 'Vikram Mehta';

  const [activeTab, setActiveTab] = useState('mine'); // 'mine' | 'team' | 'all'
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({
    priority: 'all',
    scheduleStatus: 'all',
    contactMethod: 'all',
  });

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [activeFollowupToComplete, setActiveFollowupToComplete] = useState(null);
  const [activeFollowupToHandover, setActiveFollowupToHandover] = useState(null);
  const [selectedFollowupDetails, setSelectedFollowupDetails] = useState(null);

  const filters = [
    {
      key: 'priority',
      label: 'Priority',
      options: [
        { value: 'High', label: 'High' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Low', label: 'Low' },
      ],
    },
    {
      key: 'scheduleStatus',
      label: 'Schedule Status',
      options: [
        { value: 'Due Today', label: 'Due Today' },
        { value: 'Overdue', label: 'Overdue' },
        { value: 'Scheduled', label: 'Scheduled' },
        { value: 'Waiting for Customer', label: 'Waiting for Customer' },
        { value: 'Completed', label: 'Completed' },
        { value: 'Closed', label: 'Closed' },
      ],
    },
    {
      key: 'contactMethod',
      label: 'Follow-up Type',
      options: [
        { value: 'Phone Call', label: 'Phone Call' },
        { value: 'WhatsApp Message', label: 'WhatsApp' },
        { value: 'Video Meeting', label: 'Video Meeting' },
        { value: 'In-Person Visit', label: 'In-Person Visit' },
        { value: 'Email', label: 'Email' },
      ],
    },
  ];

  // Enrich each followup with computed priority, scheduleStatus, and parsed dates/times
  const enrichedFollowups = useMemo(() => {
    return followups.map((item) => {
      const customer = customers.find((c) => c.id === item.customerId || c.name === item.customerName);
      const computedPriorityObj = calculateActivityPriority(item, customer, { orders, quotations, invoices });
      const computedStatus = computeScheduleStatus(item);

      // Extract scheduled date and time
      const scheduledDate = item.nextFollowUpDate || item.followUpDate || (item.nextFollowUpDateTime ? item.nextFollowUpDateTime.split(' ')[0] : '');
      const scheduledTime = item.scheduledTime || (item.nextFollowUpDateTime && item.nextFollowUpDateTime.includes(' ') ? item.nextFollowUpDateTime.split(' ').slice(1).join(' ') : '11:00 AM');

      return {
        ...item,
        computedPriority: item.priority || computedPriorityObj.priority,
        priorityReason: computedPriorityObj.reason,
        targetSLA: computedPriorityObj.targetSLA,
        computedScheduleStatus: computedStatus,
        effectiveScheduledDate: scheduledDate,
        effectiveScheduledTime: scheduledTime,
        businessName: item.customerName || item.customer || (customer ? customer.name : 'Unknown Client'),
        refNumber: item.relatedRef || item.quotationNo || item.orderNo || '—',
        focusProduct: item.productSummary || item.focusProduct || item.product || '—',
        remarksText: item.notes || item.remarks || '—',
        followupType: item.contactMethod || item.type || item.followUpType || 'Phone Call',
        ownerName: item.owner || item.assignedTo || 'Vikram Mehta',
        customerPhone: customer?.phone || customer?.mobile || '',
      };
    });
  }, [followups, customers, orders, quotations, invoices]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const personalItems = enrichedFollowups.filter((f) => f.ownerName === currentUserName);
    const relevantItems = activeTab === 'mine' ? personalItems : enrichedFollowups;

    const dueTodayCount = relevantItems.filter((f) => f.computedScheduleStatus === 'Due Today').length;
    const highPriorityCount = relevantItems.filter((f) => f.computedPriority === 'High' || f.computedPriority === 'Very High').length;
    const overdueCount = relevantItems.filter((f) => f.computedScheduleStatus === 'Overdue').length;
    const completedCount = relevantItems.filter((f) => f.computedScheduleStatus === 'Completed' || f.computedScheduleStatus === 'Closed').length;

    return {
      dueTodayCount,
      highPriorityCount,
      overdueCount,
      completedCount,
    };
  }, [enrichedFollowups, currentUserName, activeTab]);

  // Filter and sort items
  const filteredAndSortedFollowups = useMemo(() => {
    return enrichedFollowups
      .filter((item) => {
        // Ownership filter
        if (activeTab === 'mine' && item.ownerName !== currentUserName) {
          return false;
        }
        if (activeTab === 'team' && item.ownerName === currentUserName) {
          return false;
        }

        // Search filter
        if (search) {
          const q = search.toLowerCase();
          const matchBusiness = item.businessName?.toLowerCase().includes(q);
          const matchSubject = item.subject?.toLowerCase().includes(q);
          const matchProduct = item.focusProduct?.toLowerCase().includes(q);
          const matchRef = item.refNumber?.toLowerCase().includes(q);
          const matchRemarks = item.remarksText?.toLowerCase().includes(q);
          if (!matchBusiness && !matchSubject && !matchProduct && !matchRef && !matchRemarks) {
            return false;
          }
        }

        // Priority filter (High matches both High & Very High)
        if (filterValues.priority !== 'all') {
          if (filterValues.priority === 'High') {
            if (item.computedPriority !== 'High' && item.computedPriority !== 'Very High') return false;
          } else if (item.computedPriority !== filterValues.priority) {
            return false;
          }
        }

        // Schedule Status filter
        if (filterValues.scheduleStatus !== 'all' && item.computedScheduleStatus !== filterValues.scheduleStatus) {
          return false;
        }

        // Contact Method filter
        if (filterValues.contactMethod !== 'all' && item.followupType !== filterValues.contactMethod) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // 1. Primary: Priority (High at top, Medium in middle, Low at bottom)
        const priorityWeight = { 'Very High': 1, 'High': 1, 'Medium': 2, 'Low': 3 };
        const pA = priorityWeight[a.computedPriority] || 2;
        const pB = priorityWeight[b.computedPriority] || 2;
        if (pA !== pB) {
          return pA - pB;
        }

        // 2. Secondary within priority group: Overdue before upcoming, then status
        const isOverdueA = a.computedScheduleStatus === 'Overdue' ? 1 : 0;
        const isOverdueB = b.computedScheduleStatus === 'Overdue' ? 1 : 0;
        if (isOverdueA !== isOverdueB) {
          return isOverdueB - isOverdueA; // Overdue first
        }

        const statusRank = {
          'Due Today': 1,
          'Scheduled': 2,
          'Waiting for Customer': 3,
          'Completed': 4,
          'Closed': 5,
        };
        const sA = statusRank[a.computedScheduleStatus] || 2;
        const sB = statusRank[b.computedScheduleStatus] || 2;
        if (sA !== sB) {
          return sA - sB;
        }

        // 3. Tertiary: Scheduled Date earliest first
        const dateA = a.effectiveScheduledDate || '9999-99-99';
        const dateB = b.effectiveScheduledDate || '9999-99-99';
        const dateComp = dateA.localeCompare(dateB);
        if (dateComp !== 0) {
          return dateComp;
        }

        // 4. Quaternary: Scheduled Time earliest first
        const timeA = a.effectiveScheduledTime || '';
        const timeB = b.effectiveScheduledTime || '';
        return timeA.localeCompare(timeB);
      });
  }, [enrichedFollowups, activeTab, currentUserName, search, filterValues]);

  // Columns in exact required order:
  // Priority | Business Name | Quotation/Order Reference | Subject | Focus Product | Scheduled Date | Scheduled Time | Remarks | Follow-up Type | Actions
  const columns = useMemo(
    () => [
      {
        key: 'priority',
        header: 'Priority',
        width: '90px',
        minWidth: '85px',
        render: (row) => {
          // Normalize display to High, Medium, or Low
          const displayPriority =
            row.computedPriority === 'Very High' ? 'High' : row.computedPriority || 'Medium';

          const badgeConfig = {
            High: {
              bg: '#fef2f2',
              text: '#b91c1c',
              border: '#fecaca',
            },
            Medium: {
              bg: '#fffbeb',
              text: '#b45309',
              border: '#fde68a',
            },
            Low: {
              bg: '#f0fdf4',
              text: '#15803d',
              border: '#bbf7d0',
            },
          };

          const cfg = badgeConfig[displayPriority] || badgeConfig.Medium;

          return (
            <span
              style={{
                backgroundColor: cfg.bg,
                color: cfg.text,
                border: `1px solid ${cfg.border}`,
                fontSize: '11px',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '4px',
                display: 'inline-block',
                lineHeight: '1.4',
                textAlign: 'center',
                letterSpacing: '0.01em',
              }}
              title={row.priorityReason || `${displayPriority} Priority`}
            >
              {displayPriority}
            </span>
          );
        },
      },
      {
        key: 'businessName',
        header: 'Business Name',
        width: '200px',
        minWidth: '170px',
        render: (row) => (
          <div>
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => setSelectedFollowupDetails(row)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '13px',
              }}
            >
              {row.businessName}
            </button>
            <div className="text-xxs text-muted mt-0.5" style={{ fontSize: '11px', color: '#64748b' }}>
              {activeTab !== 'mine' ? (
                <span className="flex items-center gap-1 text-slate-600 font-medium">
                  <User size={11} className="text-slate-400" />
                  {row.ownerName}
                </span>
              ) : (
                row.customerType || 'Customer'
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'refNumber',
        header: 'Quotation/Order Reference',
        width: '140px',
        minWidth: '130px',
        render: (row) => (
          <span className="inline-block px-1.5 py-0.5 text-xs font-mono font-medium bg-slate-100 text-slate-700 rounded border border-slate-200">
            {row.refNumber}
          </span>
        ),
      },
      {
        key: 'subject',
        header: 'Subject',
        width: '210px',
        minWidth: '180px',
        render: (row) => (
          <div className="text-xs font-medium text-slate-800 leading-snug break-words" title={row.subject}>
            {row.subject}
          </div>
        ),
      },
      {
        key: 'focusProduct',
        header: 'Focus Product',
        width: '180px',
        minWidth: '150px',
        render: (row) => (
          <div className="text-xs text-slate-700 leading-snug break-words" title={row.focusProduct}>
            {row.focusProduct}
          </div>
        ),
      },
      {
        key: 'scheduledDate',
        header: 'Scheduled Date',
        width: '150px',
        minWidth: '140px',
        render: (row) => (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-900 whitespace-nowrap">
              {formatDate(row.effectiveScheduledDate)}
            </span>
            {/* Compact, readable status indicator */}
            {row.computedScheduleStatus === 'Overdue' && (
              <span className="inline-block px-1.5 py-0.2 text-[10.5px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded whitespace-nowrap">
                Overdue
              </span>
            )}
            {row.computedScheduleStatus === 'Due Today' && (
              <span className="inline-block px-1.5 py-0.2 text-[10.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded whitespace-nowrap">
                Due Today
              </span>
            )}
            {row.computedScheduleStatus === 'Scheduled' && (
              <span className="inline-block px-1.5 py-0.2 text-[10.5px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded whitespace-nowrap">
                Scheduled
              </span>
            )}
            {row.computedScheduleStatus === 'Waiting for Customer' && (
              <span className="inline-block px-1.5 py-0.2 text-[10.5px] font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded whitespace-nowrap">
                Waiting
              </span>
            )}
            {(row.computedScheduleStatus === 'Completed' || row.computedScheduleStatus === 'Closed') && (
              <span className="inline-block px-1.5 py-0.2 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded whitespace-nowrap">
                {row.computedScheduleStatus}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'scheduledTime',
        header: 'Scheduled Time',
        width: '100px',
        minWidth: '90px',
        align: 'center',
        render: (row) => (
          <span className="text-xs font-mono text-slate-700 whitespace-nowrap">
            {row.effectiveScheduledTime}
          </span>
        ),
      },
      {
        key: 'remarks',
        header: 'Remarks',
        width: '230px',
        minWidth: '190px',
        render: (row) => (
          <div className="text-xs text-slate-600 leading-relaxed break-words">
            {row.remarksText}
            {row.outcome && (
              <div className="mt-1 text-[11px] font-medium text-blue-700">
                Outcome: <span className="font-semibold">{row.outcome}</span>
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'followupType',
        header: 'Follow-up Type',
        width: '115px',
        minWidth: '100px',
        align: 'center',
        render: (row) => (
          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
            {row.followupType}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '120px',
        minWidth: '110px',
        align: 'center',
        render: (row) => {
          const isDone = row.computedScheduleStatus === 'Completed' || row.computedScheduleStatus === 'Closed';
          const waUrl = getWhatsAppUrl(
            row.customerPhone,
            `Hello ${row.businessName}, this is Vikram from ApexERP regarding our sales follow-up.`
          );

          return (
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
              {/* Log Outcome / Complete Follow-up */}
              {!isDone ? (
                <button
                  type="button"
                  onClick={() => setActiveFollowupToComplete(row)}
                  className="table-action-icon-btn"
                  title="Log Outcome / Complete Follow-up"
                  style={{ color: '#16a34a' }}
                >
                  <CheckCircle2 size={15} />
                </button>
              ) : (
                <span
                  className="table-action-icon-btn"
                  title="Completed Follow-up"
                  style={{ color: '#16a34a', cursor: 'default' }}
                >
                  <CheckCheck size={15} />
                </span>
              )}

              {/* Handover to colleague */}
              <button
                type="button"
                onClick={() => setActiveFollowupToHandover(row)}
                className="table-action-icon-btn"
                title="Handover to Colleague"
                style={{ color: '#2563eb' }}
              >
                <ArrowRightLeft size={15} />
              </button>

              {/* View Details / Interaction History */}
              <button
                type="button"
                onClick={() => setSelectedFollowupDetails(row)}
                className="table-action-icon-btn"
                title="View Follow-up Details & History"
                style={{ color: '#475569' }}
              >
                <Eye size={15} />
              </button>

              {/* Quick WhatsApp */}
              {row.customerPhone && waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="table-action-icon-btn"
                  title={`Open WhatsApp chat with ${row.businessName}`}
                  style={{ color: '#25D366' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <WhatsAppIcon size={14} color="#25D366" />
                </a>
              )}
            </div>
          );
        },
      },
    ],
    [activeTab]
  );

  return (
    <div className={embedded ? 'space-y-4' : 'page-container'}>
      {/* Top Header Row with Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Calls &amp; Follow-ups Agenda
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Priority customer touchpoints, scheduled follow-up commitments, and SLA-driven account actions
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setIsLogModalOpen(true)}
            className="btn btn-primary btn-sm btn-icon-text"
          >
            <Plus size={15} />
            <span>Schedule Follow-up</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards in neat horizontal row */}
      <div className="followup-cards-row">
        <div className="metric-card metric-card-primary">
          <div className="metric-header">
            <span className="metric-title">Today's Agenda</span>
            <div className="metric-icon-box">
              <Calendar size={16} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{kpis.dueTodayCount}</span>
          </div>
          <div className="metric-footer">
            <span className="metric-subtext">Due for contact today</span>
          </div>
        </div>

        <div className="metric-card metric-card-warning">
          <div className="metric-header">
            <span className="metric-title">High Priority</span>
            <div className="metric-icon-box">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{kpis.highPriorityCount}</span>
          </div>
          <div className="metric-footer">
            <span className="metric-subtext">Urgent client actions</span>
          </div>
        </div>

        <div className="metric-card metric-card-danger">
          <div className="metric-header">
            <span className="metric-title">Overdue Actions</span>
            <div className="metric-icon-box">
              <Clock size={16} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{kpis.overdueCount}</span>
          </div>
          <div className="metric-footer">
            <span className="metric-subtext">Requires immediate resolution</span>
          </div>
        </div>

        <div className="metric-card metric-card-success">
          <div className="metric-header">
            <span className="metric-title">Completed (Month)</span>
            <div className="metric-icon-box">
              <CheckCheck size={16} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{kpis.completedCount}</span>
          </div>
          <div className="metric-footer">
            <span className="metric-subtext">Logged outcomes this month</span>
          </div>
        </div>
      </div>

      {/* Ownership Tabs */}
      <div className="tab-navigation-bar mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('mine')}
          className={`tab-nav-btn ${activeTab === 'mine' ? 'active' : ''}`}
        >
          <User size={15} />
          <span>My Follow-ups</span>
          <span
            style={{
              fontSize: '11px',
              backgroundColor: activeTab === 'mine' ? '#eff6ff' : '#f1f5f9',
              color: activeTab === 'mine' ? '#2563eb' : '#64748b',
              padding: '1.5px 7px',
              borderRadius: '10px',
              fontWeight: '700',
            }}
          >
            {enrichedFollowups.filter((f) => f.ownerName === currentUserName).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('team')}
          className={`tab-nav-btn ${activeTab === 'team' ? 'active' : ''}`}
        >
          <Users size={15} />
          <span>Peer &amp; Team Activities</span>
          <span
            style={{
              fontSize: '11px',
              backgroundColor: activeTab === 'team' ? '#eff6ff' : '#f1f5f9',
              color: activeTab === 'team' ? '#2563eb' : '#64748b',
              padding: '1.5px 7px',
              borderRadius: '10px',
              fontWeight: '700',
            }}
          >
            {enrichedFollowups.filter((f) => f.ownerName !== currentUserName).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`tab-nav-btn ${activeTab === 'all' ? 'active' : ''}`}
        >
          <Layers size={15} />
          <span>All Follow-ups</span>
          <span
            style={{
              fontSize: '11px',
              backgroundColor: activeTab === 'all' ? '#eff6ff' : '#f1f5f9',
              color: activeTab === 'all' ? '#2563eb' : '#64748b',
              padding: '1.5px 7px',
              borderRadius: '10px',
              fontWeight: '700',
            }}
          >
            {enrichedFollowups.length}
          </span>
        </button>
      </div>

      {/* Search and Filter Bar */}
      <SearchFilterBar
        searchPlaceholder="Search by business name, quotation, product, or subject..."
        searchValue={search}
        onSearchChange={setSearch}
        filterValues={filterValues}
        onFilterChange={(key, val) => setFilterValues((prev) => ({ ...prev, [key]: val }))}
        onReset={() => {
          setSearch('');
          setFilterValues({
            priority: 'all',
            scheduleStatus: 'all',
            contactMethod: 'all',
          });
        }}
        filters={filters}
      />

      {/* Follow-up Table */}
      <DataTable
        columns={columns}
        data={filteredAndSortedFollowups}
        keyField="id"
        emptyMessage="No follow-up activities found matching your criteria."
      />

      {/* Schedule Modal */}
      {isLogModalOpen && (
        <LogFollowupModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
        />
      )}

      {/* Complete Follow-up / Outcome Modal */}
      {activeFollowupToComplete && (
        <CompleteFollowupModal
          isOpen={!!activeFollowupToComplete}
          onClose={() => setActiveFollowupToComplete(null)}
          followup={activeFollowupToComplete}
        />
      )}

      {/* Handover Follow-up Modal */}
      {activeFollowupToHandover && (
        <HandoverFollowupModal
          isOpen={!!activeFollowupToHandover}
          onClose={() => setActiveFollowupToHandover(null)}
          followup={activeFollowupToHandover}
        />
      )}

      {/* View Follow-up Details & History Modal */}
      {selectedFollowupDetails && (
        <FollowupDetailModal
          isOpen={!!selectedFollowupDetails}
          onClose={() => setSelectedFollowupDetails(null)}
          followup={selectedFollowupDetails}
          onLogOutcome={(f) => setActiveFollowupToComplete(f)}
          onHandover={(f) => setActiveFollowupToHandover(f)}
        />
      )}
    </div>
  );
}
