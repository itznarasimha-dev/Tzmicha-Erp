import React, { useState, useMemo } from 'react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import ServiceAuditDetailModal from './components/ServiceAuditDetailModal';
import { useSchedule } from '../../context/ScheduleContext';
import { formatDate } from '../../utils/formatters';
import { History, Eye, Star, CheckCircle, Clock, Award, ShieldCheck } from 'lucide-react';

export default function ServiceHistory() {
  const { serviceHistory } = useSchedule();

  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({
    category: 'all'
  });

  const [selectedHistory, setSelectedHistory] = useState(null);

  // Extract distinct service categories
  const categories = useMemo(() => {
    return Array.from(new Set(serviceHistory.map((h) => h.issueCategory).filter(Boolean))).map((c) => ({
      value: c,
      label: c
    }));
  }, [serviceHistory]);

  const filters = [
    {
      key: 'category',
      label: 'Service Category',
      options: categories
    }
  ];

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSearch('');
    setFilterValues({ category: 'all' });
  };

  // Top summary KPI metrics
  const metrics = useMemo(() => {
    const totalInterventions = serviceHistory.length;
    const totalHours = serviceHistory.reduce((sum, h) => sum + Number(h.totalDurationHours || 0), 0);
    const avgHours = totalInterventions > 0 ? (totalHours / totalInterventions).toFixed(1) : '0.0';
    const totalRating = serviceHistory.reduce((sum, h) => sum + Number(h.customerRating || 5), 0);
    const avgRating = totalInterventions > 0 ? (totalRating / totalInterventions).toFixed(1) : '5.0';

    return {
      totalInterventions,
      avgHours,
      avgRating,
      firstTimeFixRate: '96.4%'
    };
  }, [serviceHistory]);

  // Filtered dataset
  const filteredHistory = useMemo(() => {
    return serviceHistory.filter((h) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search.trim() ||
        h.id.toLowerCase().includes(q) ||
        h.serviceRequestId.toLowerCase().includes(q) ||
        h.customerName.toLowerCase().includes(q) ||
        h.customerId.toLowerCase().includes(q) ||
        h.productName.toLowerCase().includes(q) ||
        h.assignedEngineerName.toLowerCase().includes(q) ||
        (h.resolutionSummary && h.resolutionSummary.toLowerCase().includes(q));

      const matchesCat =
        filterValues.category === 'all' || h.issueCategory === filterValues.category;

      return matchesSearch && matchesCat;
    });
  }, [serviceHistory, search, filterValues]);

  const columns = [
    {
      header: 'History Ref #',
      key: 'id',
      render: (h) => (
        <div>
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => setSelectedHistory(h)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontSize: '13px' }}
          >
            {h.id}
          </button>
          <span className="text-xs text-muted block font-mono">Ticket: {h.serviceRequestId}</span>
        </div>
      )
    },
    {
      header: 'Customer',
      key: 'customerName',
      render: (h) => (
        <div>
          <span className="font-semibold text-slate-800" style={{ fontSize: '13px', display: 'block' }}>
            {h.customerName}
          </span>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#2563eb' }}>
            {h.customerId}
          </span>
        </div>
      )
    },
    {
      header: 'Equipment',
      key: 'productName',
      render: (h) => (
        <span className="text-xs font-medium text-slate-800">
          {h.productName}
        </span>
      )
    },
    {
      header: 'Category',
      key: 'issueCategory',
      render: (h) => (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            backgroundColor: '#eff6ff',
            color: '#1d4ed8'
          }}
        >
          {h.issueCategory}
        </span>
      )
    },
    {
      header: 'Lead Engineer',
      key: 'assignedEngineerName',
      render: (h) => (
        <span className="text-xs font-medium text-slate-800">
          {h.assignedEngineerName}
        </span>
      )
    },
    {
      header: 'Concluded Date',
      key: 'serviceDate',
      align: 'center',
      render: (h) => <span className="text-xs">{formatDate(h.serviceDate)}</span>
    },
    {
      header: 'Labor Duration',
      key: 'totalDurationHours',
      align: 'center',
      render: (h) => (
        <span className="text-xs font-semibold text-slate-700">
          {h.totalDurationHours} hrs
        </span>
      )
    },
    {
      header: 'Status',
      key: 'status',
      align: 'center',
      render: (h) => <StatusBadge status={h.status || 'Completed'} />
    },
    {
      header: 'Actions',
      align: 'center',
      render: (h) => (
        <button
          type="button"
          className="table-action-icon-btn"
          onClick={() => setSelectedHistory(h)}
          title="Inspect Full Engineering Audit Trail"
        >
          <Eye size={15} />
        </button>
      )
    }
  ];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row mb-4">
        <div>
          <h2 className="page-title">Service History & Audit Trail</h2>
          <p className="page-description">
            Complete operational archive of closed service tickets, engineer diagnosis notes, and customer CSAT records
          </p>
        </div>
      </div>

      {/* Summary KPI Cards Matching Sales Design */}
      <div className="summary-kpi-grid mb-4">
        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
          <div className="summary-kpi-label">Concluded Interventions</div>
          <div className="summary-kpi-value">{metrics.totalInterventions}</div>
          <div className="summary-kpi-sub">Total resolved tickets logged</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
          <div className="summary-kpi-label">Avg Resolution Turnaround</div>
          <div className="summary-kpi-value text-success">{metrics.avgHours} <span style={{ fontSize: '14px', fontWeight: 500 }}>Hours</span></div>
          <div className="summary-kpi-sub">Field engineering speed</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #8b5cf6' }}>
          <div className="summary-kpi-label">First-Time Fix Rate</div>
          <div className="summary-kpi-value text-primary">{metrics.firstTimeFixRate}</div>
          <div className="summary-kpi-sub">Zero repeat call within 30 days</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
          <div className="summary-kpi-label">Customer CSAT Rating</div>
          <div className="summary-kpi-value text-warning">{metrics.avgRating} <span style={{ fontSize: '14px' }}>/ 5.0 ★</span></div>
          <div className="summary-kpi-sub">Client feedback satisfaction</div>
        </div>
      </div>

      {/* Search & Filters */}
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search history ID, ticket #, customer, product, engineer, or resolution note..."
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* Historical Data Table */}
      <DataTable
        columns={columns}
        data={filteredHistory}
        keyField="id"
        minWidth="1350px"
        emptyMessage="No historical service records match your criteria."
        defaultPageSize={10}
      />

      {/* Modal */}
      <ServiceAuditDetailModal
        isOpen={Boolean(selectedHistory)}
        onClose={() => setSelectedHistory(null)}
        historyItem={selectedHistory}
      />
    </div>
  );
}
