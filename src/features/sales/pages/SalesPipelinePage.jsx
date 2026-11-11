import { useState, useMemo } from 'react';
import {
  Kanban,
  List,
  Search,
  Filter,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  User,
  Calendar,
  Building2,
  DollarSign,
  ChevronRight,
  ShieldAlert,
  FileText,
  ShoppingCart,
  History,
} from 'lucide-react';
import { useSales } from '../context/SalesContext';
import { formatINR, formatDate } from '../utils/formatters';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import { useToast } from '../context/ToastContext';

export const PIPELINE_STAGES = [
  {
    id: 'New Lead',
    title: 'New Lead',
    subtitle: 'Requirement identified or inbound lead',
    color: '#64748b',
    bgColor: '#f8fafc',
    badgeClass: 'badge-secondary',
  },
  {
    id: 'Quotation Sent',
    title: 'Quotation Sent',
    subtitle: 'Commercial quote submitted to customer',
    color: '#2563eb',
    bgColor: '#eff6ff',
    badgeClass: 'badge-primary',
  },
  {
    id: 'Negotiation',
    title: 'Negotiation',
    subtitle: 'Rebates, volume discount & payment terms',
    color: '#d97706',
    bgColor: '#fffbeb',
    badgeClass: 'badge-warning',
  },
  {
    id: 'Quotation Finalized',
    title: 'Quotation Finalized',
    subtitle: 'Quotation approved, awaiting customer order',
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    badgeClass: 'badge-info',
  },
  {
    id: 'Active Order',
    title: 'Active Order',
    subtitle: 'Order confirmed, in warehouse or production',
    color: '#0284c7',
    bgColor: '#f0f9ff',
    badgeClass: 'badge-primary',
  },
  {
    id: 'Closed Won',
    title: 'Closed Won',
    subtitle: 'Delivered and 100% fully paid',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    badgeClass: 'badge-success',
  },
  {
    id: 'Closed Lost',
    title: 'Closed Lost',
    subtitle: 'Opportunity dropped with recorded loss reason',
    color: '#dc2626',
    bgColor: '#fef2f2',
    badgeClass: 'badge-danger',
  },
];

const LOSS_REASONS = [
  'Competitor offered lower price',
  'Customer deferred or cancelled procurement',
  'Internal budget unapproved by client finance',
  'Product specification or lead-time mismatch',
  'Customer chose alternative vendor',
  'Credit terms not acceptable to client',
  'Other commercial reason',
];

export default function SalesPipelinePage() {
  const {
    opportunities = [],
    customers = [],
    quotations = [],
    orders = [],
    regions = [],
    userRole,
    userProfile,
    addOpportunity,
    moveOpportunityStage,
    navigateTo,
  } = useSales();

  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState('board'); // 'board' | 'list'
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [salespersonFilter, setSalespersonFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [territoryFilter, setTerritoryFilter] = useState('all');

  // Modals
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [isNewOpportunityOpen, setIsNewOpportunityOpen] = useState(false);
  const [closedLostTarget, setClosedLostTarget] = useState(null);
  const [selectedLossReason, setSelectedLossReason] = useState(LOSS_REASONS[0]);
  const [lossNotes, setLossNotes] = useState('');

  // 1. Role-based Scoped Opportunities (Accessible to all 4 levels)
  const scopedOpportunities = useMemo(() => {
    if (userRole === 'sales_manager' || userRole === 'admin') {
      return opportunities;
    }
    if (userRole === 'sales_coordinator') {
      // Coordinator: Regional pipeline for supervised field representatives and junior employees
      return opportunities.filter(
        (o) =>
          o.regionId === 'REG-HYD' ||
          !o.regionId ||
          ['APX-EMP-4091', 'APX-EMP-4092', 'APX-EMP-4093', 'APX-EMP-5011', 'APX-EMP-5012'].includes(o.assignedEmployeeId) ||
          ['Vikram Mehta', 'Rohan Sharma', 'Priya Nair', 'Aditya Joshi', 'Neha Kulkarni'].includes(o.assignedSalesperson)
      );
    }
    // Sales Representative & Junior Sales Employee: strictly scoped to own assigned opportunities
    return opportunities.filter(
      (o) =>
        (userProfile?.employeeId && o.assignedEmployeeId === userProfile.employeeId) ||
        (userProfile?.fullName && o.assignedSalesperson?.toLowerCase() === userProfile.fullName.toLowerCase())
    );
  }, [opportunities, userRole, userProfile]);

  // 2. Filter Opportunities across active search and multi-level filters
  const filteredOpportunities = useMemo(() => {
    return scopedOpportunities.filter((opp) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        opp.opportunityNo?.toLowerCase().includes(q) ||
        opp.title?.toLowerCase().includes(q) ||
        opp.customerName?.toLowerCase().includes(q) ||
        opp.customerId?.toLowerCase().includes(q) ||
        opp.customerDisplayId?.toLowerCase().includes(q) ||
        opp.quotationNo?.toLowerCase().includes(q) ||
        opp.orderNo?.toLowerCase().includes(q);

      const matchesStage = stageFilter === 'all' || opp.stage === stageFilter;
      const matchesSalesperson =
        salespersonFilter === 'all' || opp.assignedSalesperson === salespersonFilter;
      const matchesCustomer =
        customerFilter === 'all' ||
        opp.customerId === customerFilter ||
        opp.customerDisplayId === customerFilter;
      const matchesRegion =
        regionFilter === 'all' || opp.regionId === regionFilter;
      const matchesTerritory =
        territoryFilter === 'all' || opp.territoryId === territoryFilter;

      return matchesSearch && matchesStage && matchesSalesperson && matchesCustomer && matchesRegion && matchesTerritory;
    });
  }, [scopedOpportunities, search, stageFilter, salespersonFilter, customerFilter, regionFilter, territoryFilter]);

  // 3. Pipeline Metrics (Computed from role-scoped view)
  const metrics = useMemo(() => {
    const activeStages = ['New Lead', 'Quotation Sent', 'Negotiation', 'Quotation Finalized', 'Active Order'];
    const activeDeals = scopedOpportunities.filter((o) => activeStages.includes(o.stage));
    const activeValue = activeDeals.reduce((sum, o) => sum + Number(o.value || 0), 0);

    const wonDeals = scopedOpportunities.filter((o) => o.stage === 'Closed Won');
    const wonValue = wonDeals.reduce((sum, o) => sum + Number(o.value || 0), 0);

    const lostDeals = scopedOpportunities.filter((o) => o.stage === 'Closed Lost');
    const closedCount = wonDeals.length + lostDeals.length;
    const winRate = closedCount > 0 ? Math.round((wonDeals.length / closedCount) * 100) : 0;

    return {
      activeCount: activeDeals.length,
      activeValue,
      wonCount: wonDeals.length,
      wonValue,
      lostCount: lostDeals.length,
      winRate,
    };
  }, [scopedOpportunities]);

  // Unique lists for filters
  const salespeople = useMemo(() => {
    const set = new Set();
    scopedOpportunities.forEach((o) => {
      if (o.assignedSalesperson) set.add(o.assignedSalesperson);
    });
    return Array.from(set);
  }, [scopedOpportunities]);

  // Handle stage change request
  const handleStageTransition = (opp, targetStage) => {
    if (targetStage === 'Closed Lost') {
      setClosedLostTarget(opp);
      setSelectedLossReason(LOSS_REASONS[0]);
      setLossNotes('');
      return;
    }

    try {
      moveOpportunityStage(opp.id, targetStage);
      showToast(`Opportunity ${opp.opportunityNo} moved to ${targetStage}!`, 'success');
      // Update selected modal if open
      if (selectedOpportunity && selectedOpportunity.id === opp.id) {
        setSelectedOpportunity((prev) => ({
          ...prev,
          stage: targetStage,
        }));
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleConfirmClosedLost = () => {
    if (!closedLostTarget) return;
    try {
      moveOpportunityStage(closedLostTarget.id, 'Closed Lost', {
        lossReason: selectedLossReason,
        notes: lossNotes.trim(),
      });
      showToast(`Opportunity ${closedLostTarget.opportunityNo} closed as Lost.`, 'info');
      setClosedLostTarget(null);
      if (selectedOpportunity && selectedOpportunity.id === closedLostTarget.id) {
        setSelectedOpportunity(null);
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Table Columns for List View
  const listColumns = [
    {
      header: 'Opportunity #',
      key: 'opportunityNo',
      render: (o) => (
        <button
          type="button"
          onClick={() => setSelectedOpportunity(o)}
          className="font-semibold text-primary hover:underline bg-transparent border-0 p-0 text-left cursor-pointer"
        >
          {o.opportunityNo}
        </button>
      ),
    },
    {
      header: 'Customer ID',
      key: 'customerDisplayId',
      render: (o) => {
        const cust = customers.find((c) => c.id === o.customerId || c.customerId === o.customerId || c.code === o.customerId);
        const displayId = o.customerDisplayId || cust?.customerId || cust?.code || o.customerId || '—';
        return (
          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {displayId}
          </span>
        );
      },
    },
    {
      header: 'Customer Name',
      key: 'customerName',
      render: (o) => <span className="font-medium text-slate-900">{o.customerName}</span>,
    },
    {
      header: 'Opportunity Title',
      key: 'title',
      render: (o) => (
        <div className="text-xs truncate max-w-xs text-slate-700" title={o.title}>
          {o.title}
        </div>
      ),
    },
    {
      header: 'Linked Quotation',
      key: 'quotationNo',
      align: 'center',
      render: (o) => (
        o.quotationNo ? (
          <span className="font-medium text-xs text-slate-800">{o.quotationNo}</span>
        ) : (
          <span className="text-muted text-xs">—</span>
        )
      ),
    },
    {
      header: 'Linked Order',
      key: 'orderNo',
      align: 'center',
      render: (o) => (
        o.orderNo ? (
          <span className="font-semibold text-xs text-primary">{o.orderNo}</span>
        ) : (
          <span className="text-muted text-xs">—</span>
        )
      ),
    },
    {
      header: 'Salesperson',
      key: 'assignedSalesperson',
      render: (o) => <span className="text-xs text-slate-700">{o.assignedSalesperson || 'Vikram Mehta'}</span>,
    },
    {
      header: 'Value',
      key: 'value',
      align: 'right',
      render: (o) => <span className="font-bold text-slate-900">{formatINR(o.value)}</span>,
    },
    {
      header: 'Stage',
      key: 'stage',
      align: 'center',
      render: (o) => {
        const stageObj = PIPELINE_STAGES.find((s) => s.id === o.stage) || {};
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '600',
              color: stageObj.color || '#334155',
              backgroundColor: stageObj.bgColor || '#f1f5f9',
              border: `1px solid ${stageObj.color || '#cbd5e1'}33`,
              whiteSpace: 'nowrap',
            }}
          >
            {o.stage}
          </span>
        );
      },
    },
    {
      header: 'Next Follow-up',
      key: 'nextFollowUpDate',
      align: 'center',
      render: (o) => (
        <span className="text-xs text-slate-700">{formatDate(o.nextFollowUpDate)}</span>
      ),
    },
    {
      header: 'Actions',
      align: 'center',
      render: (o) => (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '11px', padding: '3px 8px' }}
          onClick={() => setSelectedOpportunity(o)}
        >
          View &amp; Move
        </button>
      ),
    },
  ];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row mb-4">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="page-title">Sales Pipeline</h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '600',
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              Management Opportunity Tracker
            </span>
          </div>
          <p className="page-description">
            Track customer opportunities across the 7 sales stages: from New Lead to Finalized Quotation, Active Order, and verified Closed Won revenue
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', padding: '2px' }}>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'board' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '5px 10px', fontSize: '12px' }}
              onClick={() => setViewMode('board')}
              title="Kanban Board View"
            >
              <Kanban size={14} className="mr-1" /> Board
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '5px 10px', fontSize: '12px' }}
              onClick={() => setViewMode('list')}
              title="Table List View"
            >
              <List size={14} className="mr-1" /> Table
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-icon-text"
            onClick={() => setIsNewOpportunityOpen(true)}
          >
            <Plus size={15} />
            <span>New Opportunity</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
            Active Pipeline Value
          </span>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
            {formatINR(metrics.activeValue)}
          </div>
          <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '2px' }}>
            {metrics.activeCount} active opportunities
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
            Closed Won (Delivered &amp; Paid)
          </span>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#16a34a', marginTop: '2px' }}>
            {formatINR(metrics.wonValue)}
          </div>
          <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>
            {metrics.wonCount} verified won deals
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
            Win Rate
          </span>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#7c3aed', marginTop: '2px' }}>
            {metrics.winRate}%
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Based on completed deals
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
            Closed Lost Deals
          </span>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626', marginTop: '2px' }}>
            {metrics.lostCount} deals
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Documented loss debriefs
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
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '32px' }}
            placeholder="Search by opportunity, customer, Customer ID, quote #, order #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {/* Sales Manager: Multi-Region Filter */}
          {(userRole === 'sales_manager' || userRole === 'admin') && (
            <div>
              <select
                className="form-select"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                style={{ fontSize: '12px', padding: '6px 10px', borderColor: '#3b82f6' }}
              >
                <option value="all">All Regions (4)</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sales Coordinator / Regional: Distributor Territory Filter */}
          {userRole === 'sales_coordinator' && (
            <div>
              <select
                className="form-select"
                value={territoryFilter}
                onChange={(e) => setTerritoryFilter(e.target.value)}
                style={{ fontSize: '12px', padding: '6px 10px', borderColor: '#10b981' }}
              >
                <option value="all">All Regional Territories (A, B, C)</option>
                <option value="TERR-HYD-A">Territory A — Kukatpally, Jubilee Hills, Gachibowli</option>
                <option value="TERR-HYD-B">Territory B — Uppal, Narapally, Boduppal</option>
                <option value="TERR-HYD-C">Territory C — ECIL, Kapra, Sainikpuri</option>
              </select>
            </div>
          )}

          <div>
            <select
              className="form-select"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              style={{ fontSize: '12px', padding: '6px 10px' }}
            >
              <option value="all">All Stages (7)</option>
              {PIPELINE_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {(userRole === 'sales_manager' || userRole === 'sales_coordinator' || userRole === 'admin') && (
            <div>
              <select
                className="form-select"
                value={salespersonFilter}
                onChange={(e) => setSalespersonFilter(e.target.value)}
                style={{ fontSize: '12px', padding: '6px 10px' }}
              >
                <option value="all">All Assigned Staff</option>
                {salespeople.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <select
              className="form-select"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              style={{ fontSize: '12px', padding: '6px 10px' }}
            >
              <option value="all">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.customerId || c.code || c.id})
                </option>
              ))}
            </select>
          </div>

          {(userRole === 'sales_rep' || userRole === 'junior_sales') && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: '600',
                background: '#f8fafc',
                color: '#475569',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
              }}
            >
              Assigned to: {userProfile.fullName || 'Current User'}
            </span>
          )}

          {(search || stageFilter !== 'all' || salespersonFilter !== 'all' || customerFilter !== 'all' || regionFilter !== 'all' || territoryFilter !== 'all') && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch('');
                setStageFilter('all');
                setSalespersonFilter('all');
                setCustomerFilter('all');
                setRegionFilter('all');
                setTerritoryFilter('all');
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Board View vs Table List View */}
      {viewMode === 'board' ? (
        <div
          className="kanban-board-container"
          style={{
            display: 'flex',
            gap: '12px',
            overflowX: 'auto',
            paddingBottom: '16px',
            minHeight: '520px',
          }}
        >
          {PIPELINE_STAGES.map((stage) => {
            const stageOpps = filteredOpportunities.filter((o) => o.stage === stage.id);
            const stageValue = stageOpps.reduce((sum, o) => sum + Number(o.value || 0), 0);

            return (
              <div
                key={stage.id}
                className="kanban-column"
                style={{
                  flex: '0 0 280px',
                  background: stage.bgColor,
                  border: `1px solid ${stage.color}30`,
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '750px',
                }}
              >
                {/* Stage Header */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderBottom: `2px solid ${stage.color}`,
                    background: '#ffffff',
                    borderTopLeftRadius: '8px',
                    borderTopRightRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: stage.color }}>
                      {stage.title}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        background: `${stage.color}18`,
                        color: stage.color,
                        padding: '2px 7px',
                        borderRadius: '10px',
                      }}
                    >
                      {stageOpps.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    <span title={stage.subtitle} className="truncate max-w-[150px]">
                      {stage.subtitle}
                    </span>
                    <strong style={{ color: '#0f172a' }}>{formatINR(stageValue)}</strong>
                  </div>
                </div>

                {/* Cards Container */}
                <div
                  style={{
                    padding: '10px',
                    overflowY: 'auto',
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {stageOpps.length === 0 ? (
                    <div style={{ padding: '24px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                      No opportunities
                    </div>
                  ) : (
                    stageOpps.map((opp) => {
                      const cust = customers.find(
                        (c) => c.id === opp.customerId || c.customerId === opp.customerId || c.code === opp.customerId
                      );
                      const displayCustId = opp.customerDisplayId || cust?.customerId || cust?.code || opp.customerId || '—';

                      return (
                        <div
                          key={opp.id}
                          className="kanban-card"
                          onClick={() => setSelectedOpportunity(opp)}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '600', color: '#2563eb' }}>
                              {opp.opportunityNo}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontFamily: 'monospace',
                                fontWeight: '600',
                                background: '#f1f5f9',
                                color: '#475569',
                                padding: '1px 5px',
                                borderRadius: '3px',
                              }}
                            >
                              {displayCustId}
                            </span>
                          </div>

                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '4px', lineHeight: 1.3 }}>
                            {opp.title}
                          </div>

                          <div style={{ fontSize: '11px', color: '#475569', marginBottom: '8px' }}>
                            {opp.customerName}
                          </div>

                          {/* Quotation / Order Badges */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                            {opp.quotationNo && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  border: '1px solid #bfdbfe',
                                }}
                              >
                                {opp.quotationNo}
                              </span>
                            )}
                            {opp.orderNo && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  background: '#f0fdf4',
                                  color: '#15803d',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  border: '1px solid #bbf7d0',
                                  fontWeight: '600',
                                }}
                              >
                                {opp.orderNo}
                              </span>
                            )}
                          </div>

                          {opp.lossReason && (
                            <div
                              style={{
                                fontSize: '10px',
                                color: '#b91c1c',
                                background: '#fef2f2',
                                padding: '4px 6px',
                                borderRadius: '4px',
                                marginBottom: '8px',
                              }}
                            >
                              <strong>Loss:</strong> {opp.lossReason}
                            </div>
                          )}

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingTop: '6px',
                              borderTop: '1px solid #f1f5f9',
                              fontSize: '11px',
                            }}
                          >
                            <span style={{ fontWeight: '700', color: '#0f172a' }}>
                              {formatINR(opp.value)}
                            </span>
                            <span style={{ color: '#64748b' }}>
                              {opp.assignedSalesperson?.split(' ')[0] || 'Sales'}
                            </span>
                          </div>

                          {opp.nextFollowUpDate && (
                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                              Next: {formatDate(opp.nextFollowUpDate)}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <DataTable
          columns={listColumns}
          data={filteredOpportunities}
          keyField="id"
          emptyMessage="No opportunities match your filters"
          pageSize={10}
          minWidth="1400px"
        />
      )}

      {/* Opportunity Detail & Stage Transition Modal */}
      {selectedOpportunity && (
        <Modal
          isOpen={Boolean(selectedOpportunity)}
          onClose={() => setSelectedOpportunity(null)}
          size="large"
          title={`Opportunity: ${selectedOpportunity.opportunityNo}`}
          subtitle={`${selectedOpportunity.title} • Customer: ${selectedOpportunity.customerName}`}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                {selectedOpportunity.stage !== 'Closed Lost' && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      setClosedLostTarget(selectedOpportunity);
                      setSelectedLossReason(LOSS_REASONS[0]);
                      setLossNotes('');
                    }}
                  >
                    Mark Closed Lost
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedOpportunity(null)}
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          <div className="opportunity-modal-content">
            {/* Stage Progress Bar */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                Move Opportunity Stage:
              </label>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {PIPELINE_STAGES.map((s) => {
                  const isCurrent = selectedOpportunity.stage === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleStageTransition(selectedOpportunity, s.id)}
                      disabled={isCurrent}
                      style={{
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: '600',
                        borderRadius: '6px',
                        border: isCurrent ? `2px solid ${s.color}` : '1px solid #cbd5e1',
                        background: isCurrent ? s.color : '#ffffff',
                        color: isCurrent ? '#ffffff' : '#334155',
                        cursor: isCurrent ? 'default' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {s.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Opportunity Details Grid */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                fontSize: '12px',
              }}
            >
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Customer ID</span>
                <strong className="font-mono text-primary" style={{ fontSize: '13px' }}>
                  {selectedOpportunity.customerDisplayId || selectedOpportunity.customerId}
                </strong>
                <div style={{ color: '#0f172a', fontWeight: '600' }}>{selectedOpportunity.customerName}</div>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Opportunity Value</span>
                <strong style={{ fontSize: '15px', color: '#0f172a' }}>{formatINR(selectedOpportunity.value)}</strong>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Responsible Salesperson</span>
                <strong>{selectedOpportunity.assignedSalesperson || 'Vikram Mehta'}</strong>
                <div style={{ fontSize: '11px', color: '#64748b' }}>ID: {selectedOpportunity.assignedEmployeeId || 'APX-EMP-4091'}</div>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>References</span>
                <div>Quotation: <strong>{selectedOpportunity.quotationNo || 'None'}</strong></div>
                <div>Sales Order: <strong>{selectedOpportunity.orderNo || 'None'}</strong></div>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Target Close Date</span>
                <strong>{formatDate(selectedOpportunity.expectedCloseDate)}</strong>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Next Follow-Up</span>
                <strong>{formatDate(selectedOpportunity.nextFollowUpDate)}</strong>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{selectedOpportunity.nextFollowUpNote || 'No specific note'}</div>
              </div>
            </div>

            {/* Last Activity */}
            <div style={{ marginBottom: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', color: '#1e40af' }}>
              <strong>Last Activity:</strong> {selectedOpportunity.lastActivity || 'Opportunity in active pipeline tracking.'}
            </div>

            {selectedOpportunity.lossReason && (
              <div style={{ marginBottom: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', color: '#991b1b' }}>
                <strong>Documented Loss Reason:</strong> {selectedOpportunity.lossReason}
              </div>
            )}

            {/* Stage Change History Timeline */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                <History size={14} /> Stage Transition Audit History
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '6px 10px' }}>Stage</th>
                      <th style={{ padding: '6px 10px' }}>Changed By</th>
                      <th style={{ padding: '6px 10px' }}>Role</th>
                      <th style={{ padding: '6px 10px' }}>Timestamp</th>
                      <th style={{ padding: '6px 10px' }}>Notes / Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOpportunity.history || []).map((h, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 10px', fontWeight: '600', color: '#0f172a' }}>{h.stage}</td>
                        <td style={{ padding: '6px 10px' }}>{h.changedBy || 'Sales User'}</td>
                        <td style={{ padding: '6px 10px', color: '#64748b' }}>{h.role || 'Sales'}</td>
                        <td style={{ padding: '6px 10px', color: '#64748b' }}>{formatDate(h.changedAt)}</td>
                        <td style={{ padding: '6px 10px', color: '#475569' }}>{h.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Closed Lost Reason Modal */}
      {closedLostTarget && (
        <Modal
          isOpen={Boolean(closedLostTarget)}
          onClose={() => setClosedLostTarget(null)}
          size="medium"
          title={`Close Opportunity as Lost: ${closedLostTarget.opportunityNo}`}
          subtitle={`Customer: ${closedLostTarget.customerName}`}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setClosedLostTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmClosedLost}
              >
                Confirm Closed Lost
              </button>
            </div>
          }
        >
          <div style={{ padding: '4px 0' }}>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '14px' }}>
              Document the primary loss reason to preserve competitive intelligence and win-loss analytics:
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Primary Loss Reason *
              </label>
              <select
                className="form-select"
                value={selectedLossReason}
                onChange={(e) => setSelectedLossReason(e.target.value)}
                required
              >
                {LOSS_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                Debrief Remarks / Next Re-Engagement Timeline
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="e.g., Client decided on Competitor X due to 10% lower pricing. Recommended re-engagement in Q3 when contract is up for review."
                value={lossNotes}
                onChange={(e) => setLossNotes(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* New Opportunity Modal */}
      {isNewOpportunityOpen && (
        <NewOpportunityModal
          isOpen={isNewOpportunityOpen}
          onClose={() => setIsNewOpportunityOpen(false)}
          customers={customers}
          quotations={quotations}
          orders={orders}
          userProfile={userProfile}
          userRole={userRole}
          onSave={(data) => {
            addOpportunity(data);
            showToast('New Opportunity created successfully!', 'success');
            setIsNewOpportunityOpen(false);
          }}
        />
      )}
    </div>
  );
}

function NewOpportunityModal({
  isOpen,
  onClose,
  customers,
  quotations,
  orders,
  userProfile,
  userRole,
  onSave,
}) {
  const [enteredCustomerId, setEnteredCustomerId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [lookupError, setLookupError] = useState('');
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [stage, setStage] = useState('New Lead');
  const [quotationNo, setQuotationNo] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [nextFollowUpNote, setNextFollowUpNote] = useState('');
  const [errors, setErrors] = useState({});

  const matchedCustomer = useMemo(() => {
    return customers.find(
      (c) => c.id === selectedCustomerId || c.customerId === selectedCustomerId || c.code === selectedCustomerId
    );
  }, [customers, selectedCustomerId]);

  const handleCustomerIdInput = (val) => {
    setEnteredCustomerId(val);
    if (!val.trim()) {
      setLookupError('');
      return;
    }
    const clean = val.trim().toLowerCase();
    const found = customers.find(
      (c) =>
        (c.customerId && c.customerId.toLowerCase() === clean) ||
        (c.id && c.id.toLowerCase() === clean) ||
        (c.code && c.code.toLowerCase() === clean)
    );
    if (found) {
      setSelectedCustomerId(found.id);
      setLookupError('');
    } else {
      setLookupError(`Customer ID "${val.trim()}" not found`);
    }
  };

  const handleCustomerSelect = (id) => {
    setSelectedCustomerId(id);
    const found = customers.find((c) => c.id === id);
    if (found) {
      setEnteredCustomerId(found.customerId || found.code || found.id);
      setLookupError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!title.trim()) errs.title = 'Opportunity title is required';
    if (!value || Number(value) <= 0) errs.value = 'Valid value is required';
    if (!matchedCustomer) errs.customer = 'Valid customer is required';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    onSave({
      title: title.trim(),
      customerId: matchedCustomer.id,
      customerDisplayId: matchedCustomer.customerId || matchedCustomer.code || matchedCustomer.id,
      customerName: matchedCustomer.name,
      contactPerson: matchedCustomer.contactPerson || '',
      phone: matchedCustomer.phone || '',
      email: matchedCustomer.email || '',
      value: Number(value),
      stage,
      expectedCloseDate,
      quotationNo: quotationNo || null,
      orderNo: orderNo || null,
      assignedSalesperson: userProfile?.fullName || 'Vikram Mehta',
      assignedEmployeeId: userProfile?.employeeId || 'APX-EMP-4091',
      lastActivity: 'Opportunity created in pipeline',
      nextFollowUpDate,
      nextFollowUpNote,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title="Create Sales Opportunity"
      subtitle="Track customer requirements, commercial proposals, and revenue potential"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            Create Opportunity
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        {/* Customer Identification */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                Enter or Paste Customer ID *
              </label>
              <input
                type="text"
                className="form-input"
                style={{ fontFamily: 'monospace', fontWeight: '600' }}
                placeholder="e.g. CUS-000001 or CUST-001"
                value={enteredCustomerId}
                onChange={(e) => handleCustomerIdInput(e.target.value)}
              />
              {lookupError && (
                <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>
                  {lookupError}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Or Select From Saved Records
              </label>
              <select
                className="form-select"
                value={selectedCustomerId}
                onChange={(e) => handleCustomerSelect(e.target.value)}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customerId || c.code || c.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {matchedCustomer && (
            <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '4px', fontSize: '11px', color: '#475569' }}>
              <strong>{matchedCustomer.name}</strong> • ID: <span className="font-mono font-semibold text-primary">{matchedCustomer.customerId || matchedCustomer.code || matchedCustomer.id}</span> • Contact: {matchedCustomer.contactPerson || '—'} ({matchedCustomer.phone || '—'})
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <FormField
            label="Opportunity Title *"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. High-Pressure Hydraulic Valves Supply Q4"
            error={errors.title}
          />

          <FormField
            label="Opportunity Value (₹) *"
            name="value"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 150000"
            error={errors.value}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
              Initial Stage
            </label>
            <select
              className="form-select"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              {PIPELINE_STAGES.filter((s) => s.id !== 'Closed Won' && s.id !== 'Closed Lost').map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          <FormField
            label="Expected Close Date"
            name="expectedCloseDate"
            type="date"
            value={expectedCloseDate}
            onChange={(e) => setExpectedCloseDate(e.target.value)}
          />

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
              Linked Quotation # (Optional)
            </label>
            <select
              className="form-select"
              value={quotationNo}
              onChange={(e) => setQuotationNo(e.target.value)}
            >
              <option value="">None / Pending</option>
              {quotations.map((q) => (
                <option key={q.id} value={q.quotationNo}>
                  {q.quotationNo} - {q.customerName} ({formatINR(q.grandTotal)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
              Linked Sales Order # (Optional)
            </label>
            <select
              className="form-select"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
            >
              <option value="">None / Pending</option>
              {orders.map((o) => (
                <option key={o.id} value={o.orderNo}>
                  {o.orderNo} - {o.customerName} ({formatINR(o.totalAmount)})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '14px' }}>
          <FormField
            label="Next Follow-Up Date"
            name="nextFollowUpDate"
            type="date"
            value={nextFollowUpDate}
            onChange={(e) => setNextFollowUpDate(e.target.value)}
          />

          <FormField
            label="Next Action Note"
            name="nextFollowUpNote"
            value={nextFollowUpNote}
            onChange={(e) => setNextFollowUpNote(e.target.value)}
            placeholder="e.g. Schedule on-site technical inspection"
          />
        </div>
      </form>
    </Modal>
  );
}
