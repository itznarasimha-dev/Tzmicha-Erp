import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import WarrantyDetailModal from './components/WarrantyDetailModal';
import AmcDetailModal from './components/AmcDetailModal';
import AddWarrantyModal from './components/AddWarrantyModal';
import RegisterAmcModal from './components/RegisterAmcModal';
import RenewContractModal from './components/RenewContractModal';
import PageContainer from '../../components/common/PageContainer';
import PageHeader from '../../components/common/PageHeader';
import { useSchedule } from '../../context/ScheduleContext';
import { useRole } from '../../context/RoleContext';
import { formatDate, formatINR } from '../../utils/formatters';
import {
  Shield,
  ShieldCheck,
  Eye,
  RefreshCw,
  Plus,
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function WarrantyAMC() {
  const { roleId } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab');
  const activeTab = currentTabParam === 'amc' ? 'amc' : 'warranty';

  const {
    warrantyRecords = [],
    amcRecords = [],
    addWarrantyRecord,
    registerAmcContract,
    renewAmcContract
  } = useSchedule();

  const isManager = roleId === 'manager';
  const isCoordinator = roleId === 'coordinator';

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleTabChange = (newTab) => {
    setSearchParams({ tab: newTab });
    setSearch('');
    setStatusFilter('all');
  };

  // Modals state
  const [selectedWarranty, setSelectedWarranty] = useState(null);
  const [selectedAmc, setSelectedAmc] = useState(null);
  const [renewingAmc, setRenewingAmc] = useState(null);
  const [isAddWarrantyOpen, setIsAddWarrantyOpen] = useState(false);
  const [isRegisterAmcOpen, setIsRegisterAmcOpen] = useState(false);

  const warrantyStatusFilters = [
    {
      key: 'status',
      label: 'Warranty Status',
      options: [
        { value: 'Active', label: 'Active Warranty' },
        { value: 'Expiring Soon', label: 'Expiring Soon (Within 30 Days)' },
        { value: 'Expired', label: 'Expired' },
        { value: 'Claim Under Review', label: 'Claim Under Review' },
        { value: 'Claimed / Completed', label: 'Claimed / Completed' }
      ]
    }
  ];

  const amcStatusFilters = [
    {
      key: 'status',
      label: 'AMC Status',
      options: [
        { value: 'Active', label: 'Active Agreement' },
        { value: 'Expiring Soon', label: 'Expiring Soon' },
        { value: 'Expired', label: 'Expired' },
        { value: 'Renewal Pending', label: 'Renewal Pending' },
        { value: 'Cancelled', label: 'Cancelled' }
      ]
    }
  ];

  const handleFilterChange = (key, value) => {
    setStatusFilter(value);
  };

  const handleReset = () => {
    setSearch('');
    setStatusFilter('all');
  };

  // 6 Summary KPI metrics per Section 8
  const metrics = useMemo(() => {
    const totalWarranty = warrantyRecords.length;
    const activeWarranty = warrantyRecords.filter((w) => w.warrantyStatus === 'Active').length;
    const expiringSoonWarranty = warrantyRecords.filter((w) => w.warrantyStatus === 'Expiring Soon').length;
    const expiredWarranty = warrantyRecords.filter((w) => w.warrantyStatus === 'Expired').length;
    const activeAmc = amcRecords.filter((a) => a.amcStatus === 'Active').length;
    const renewalsDueAmc = amcRecords.filter((a) => a.amcStatus === 'Expiring Soon' || a.amcStatus === 'Renewal Pending').length;

    return {
      totalWarranty,
      activeWarranty,
      expiringSoonWarranty,
      expiredWarranty,
      activeAmc,
      renewalsDueAmc
    };
  }, [warrantyRecords, amcRecords]);

  // Filtered Warranty list
  const filteredWarranty = useMemo(() => {
    return warrantyRecords.filter((w) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        w.id.toLowerCase().includes(q) ||
        w.customerId.toLowerCase().includes(q) ||
        w.customerName.toLowerCase().includes(q) ||
        w.productId.toLowerCase().includes(q) ||
        w.productName.toLowerCase().includes(q) ||
        w.invoiceNumber.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || w.warrantyStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [warrantyRecords, search, statusFilter]);

  // Filtered AMC list
  const filteredAmc = useMemo(() => {
    return amcRecords.filter((a) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.id.toLowerCase().includes(q) ||
        a.customerId.toLowerCase().includes(q) ||
        a.customerName.toLowerCase().includes(q) ||
        a.contractNumber.toLowerCase().includes(q) ||
        a.productName.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || a.amcStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [amcRecords, search, statusFilter]);

  // 10 Exact Warranty Columns per Navigation Specification
  const warrantyColumns = [
    {
      header: 'Customer ID',
      key: 'customerId',
      width: '120px',
      render: (w) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb', fontSize: '12px' }}>
          {w.customerId}
        </span>
      )
    },
    {
      header: 'Customer Name',
      key: 'customerName',
      width: '190px',
      render: (w) => (
        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
          {w.customerName}
        </span>
      )
    },
    {
      header: 'Contact Number',
      key: 'contactNumber',
      width: '140px',
      render: (w) => (
        <span style={{ fontSize: '12px', color: '#334155', fontFamily: 'monospace' }}>
          {w.contactNumber || '+91 98220 14592'}
        </span>
      )
    },
    {
      header: 'Warranty ID',
      key: 'id',
      width: '130px',
      render: (w) => (
        <button
          type="button"
          className="font-semibold text-primary hover:underline"
          onClick={() => setSelectedWarranty(w)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}
        >
          {w.id}
        </button>
      )
    },
    {
      header: 'Product / Equipment',
      key: 'productName',
      width: '190px',
      render: (w) => (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#1e293b' }}>{w.productName}</div>
          {w.productId && <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{w.productId}</div>}
        </div>
      )
    },
    {
      header: 'Coverage Start Date',
      key: 'warrantyStartDate',
      width: '130px',
      align: 'center',
      render: (w) => <span style={{ fontSize: '12px' }}>{formatDate(w.warrantyStartDate)}</span>
    },
    {
      header: 'Coverage End Date',
      key: 'warrantyEndDate',
      width: '130px',
      align: 'center',
      render: (w) => (
        <span style={{ fontSize: '12px', fontWeight: 600, color: w.warrantyStatus === 'Expired' ? '#ef4444' : '#0f172a' }}>
          {formatDate(w.warrantyEndDate)}
        </span>
      )
    },
    {
      header: 'Next Scheduled Visit',
      key: 'nextScheduledVisit',
      width: '140px',
      align: 'center',
      render: (w) => (
        <span style={{ fontSize: '12px', color: w.nextScheduledVisit ? '#0f172a' : '#64748b' }}>
          {w.nextScheduledVisit ? formatDate(w.nextScheduledVisit) : 'Not Scheduled'}
        </span>
      )
    },
    {
      header: 'Coverage Status',
      key: 'warrantyStatus',
      width: '130px',
      align: 'center',
      render: (w) => <StatusBadge status={w.warrantyStatus} size="small" />
    },
    {
      header: 'Actions',
      key: 'actions',
      width: '80px',
      align: 'center',
      render: (w) => (
        <button
          type="button"
          className="table-action-icon-btn"
          onClick={() => setSelectedWarranty(w)}
          title="Inspect Complete Warranty Details"
        >
          <Eye size={15} />
        </button>
      )
    }
  ];

  // 10 Exact AMC Columns per Navigation Specification
  const amcColumns = [
    {
      header: 'Customer ID',
      key: 'customerId',
      width: '120px',
      render: (a) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb', fontSize: '12px' }}>
          {a.customerId}
        </span>
      )
    },
    {
      header: 'Customer Name',
      key: 'customerName',
      width: '190px',
      render: (a) => (
        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
          {a.customerName}
        </span>
      )
    },
    {
      header: 'Contact Number',
      key: 'contactNumber',
      width: '140px',
      render: (a) => (
        <span style={{ fontSize: '12px', color: '#334155', fontFamily: 'monospace' }}>
          {a.contactNumber || '+91 98220 14592'}
        </span>
      )
    },
    {
      header: 'AMC ID',
      key: 'id',
      width: '120px',
      render: (a) => (
        <button
          type="button"
          className="font-semibold text-primary hover:underline"
          onClick={() => setSelectedAmc(a)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' }}
        >
          {a.id}
        </button>
      )
    },
    {
      header: 'Product / Equipment',
      key: 'productName',
      width: '190px',
      render: (a) => (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#1e293b' }}>{a.productName}</div>
          {a.contractNumber && <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>Contract: {a.contractNumber}</div>}
        </div>
      )
    },
    {
      header: 'Coverage Start Date',
      key: 'contractStartDate',
      width: '130px',
      align: 'center',
      render: (a) => <span style={{ fontSize: '12px' }}>{formatDate(a.contractStartDate)}</span>
    },
    {
      header: 'Coverage End Date',
      key: 'contractEndDate',
      width: '130px',
      align: 'center',
      render: (a) => (
        <span style={{ fontSize: '12px', fontWeight: 600, color: a.amcStatus === 'Expired' ? '#ef4444' : '#0f172a' }}>
          {formatDate(a.contractEndDate)}
        </span>
      )
    },
    {
      header: 'Next Scheduled Visit',
      key: 'nextScheduledVisit',
      width: '140px',
      align: 'center',
      render: (a) => (
        <span style={{ fontSize: '12px', color: (a.nextScheduledMaintenance || a.nextScheduledVisit) ? '#0f172a' : '#64748b' }}>
          {(a.nextScheduledMaintenance || a.nextScheduledVisit) ? formatDate(a.nextScheduledMaintenance || a.nextScheduledVisit) : 'Not Scheduled'}
        </span>
      )
    },
    {
      header: 'Coverage Status',
      key: 'amcStatus',
      width: '130px',
      align: 'center',
      render: (a) => <StatusBadge status={a.amcStatus} size="small" />
    },
    {
      header: 'Actions',
      key: 'actions',
      width: '110px',
      align: 'center',
      render: (a) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
          <button
            type="button"
            className="table-action-icon-btn"
            onClick={() => setSelectedAmc(a)}
            title="Inspect AMC Contract Details"
          >
            <Eye size={15} />
          </button>
          <button
            type="button"
            className="table-action-icon-btn text-primary"
            onClick={() => setRenewingAmc(a)}
            title="Renew AMC Agreement"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <PageContainer>
      {/* Page Header */}
      <PageHeader
        title="Warranty & AMC"
        description="Track product warranty coverage, AMC contracts, expiry dates and maintenance obligations."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-icon-text"
              onClick={() => setIsAddWarrantyOpen(true)}
            >
              <Plus size={14} />
              <span>Add Warranty Record</span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm btn-icon-text"
              onClick={() => setIsRegisterAmcOpen(true)}
            >
              <ShieldCheck size={14} />
              <span>Register AMC Contract</span>
            </button>
          </div>
        }
      />

      {/* 6 Summary Cards per Section 8 */}
      <div
        className="kpi-grid-6"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
          <div className="summary-kpi-label">Total Warranty Records</div>
          <div className="summary-kpi-value">{metrics.totalWarranty}</div>
          <div className="summary-kpi-sub">Registered customer assets</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
          <div className="summary-kpi-label">Active Warranties</div>
          <div className="summary-kpi-value text-success">{metrics.activeWarranty}</div>
          <div className="summary-kpi-sub">Covered under policy</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
          <div className="summary-kpi-label">Expiring Soon</div>
          <div className="summary-kpi-value text-warning">{metrics.expiringSoonWarranty}</div>
          <div className="summary-kpi-sub">Within 30 days window</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #ef4444' }}>
          <div className="summary-kpi-label">Expired Warranties</div>
          <div className="summary-kpi-value text-danger">{metrics.expiredWarranty}</div>
          <div className="summary-kpi-sub">Out-of-warranty assets</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #8b5cf6' }}>
          <div className="summary-kpi-label">Active AMC Contracts</div>
          <div className="summary-kpi-value text-primary">{metrics.activeAmc}</div>
          <div className="summary-kpi-sub">Maintenance agreements</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #0284c7' }}>
          <div className="summary-kpi-label">AMC Renewals Due</div>
          <div className="summary-kpi-value">{metrics.renewalsDueAmc}</div>
          <div className="summary-kpi-sub">Follow-up renewal quotes</div>
        </div>
      </div>

      {/* Two Main Tabs: Warranty vs Annual Maintenance Contracts */}
      <div className="tab-navigation-bar mb-4">
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'warranty' ? 'active' : ''}`}
          onClick={() => handleTabChange('warranty')}
        >
          <Shield size={16} />
          <span>Product Warranty Directory ({warrantyRecords.length})</span>
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'amc' ? 'active' : ''}`}
          onClick={() => handleTabChange('amc')}
        >
          <ShieldCheck size={16} />
          <span>Annual Maintenance Contracts ({amcRecords.length})</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={activeTab === 'warranty' ? 'Search by Customer ID, Name, Warranty ID, or Invoice #...' : 'Search by Customer ID, Name, AMC ID, or Contract #...'}
        filters={activeTab === 'warranty' ? warrantyStatusFilters : amcStatusFilters}
        filterValues={{ status: statusFilter }}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* Content Table with horizontal scroll minWidth */}
      {activeTab === 'warranty' ? (
        <DataTable
          columns={warrantyColumns}
          data={filteredWarranty}
          keyField="id"
          minWidth="1300px"
          emptyMessage="No warranty records match your criteria."
          defaultPageSize={10}
        />
      ) : (
        <DataTable
          columns={amcColumns}
          data={filteredAmc}
          keyField="id"
          minWidth="1300px"
          emptyMessage="No AMC contract records match your criteria."
          defaultPageSize={10}
        />
      )}

      {/* Modals */}
      {selectedWarranty && (
        <WarrantyDetailModal
          isOpen={Boolean(selectedWarranty)}
          onClose={() => setSelectedWarranty(null)}
          warranty={selectedWarranty}
        />
      )}

      {selectedAmc && (
        <AmcDetailModal
          isOpen={Boolean(selectedAmc)}
          onClose={() => setSelectedAmc(null)}
          amc={selectedAmc}
          onRenew={(amc) => setRenewingAmc(amc)}
        />
      )}

      {isAddWarrantyOpen && (
        <AddWarrantyModal
          isOpen={isAddWarrantyOpen}
          onClose={() => setIsAddWarrantyOpen(false)}
          onSave={addWarrantyRecord}
        />
      )}

      {isRegisterAmcOpen && (
        <RegisterAmcModal
          isOpen={isRegisterAmcOpen}
          onClose={() => setIsRegisterAmcOpen(false)}
          onSave={registerAmcContract}
        />
      )}

      {renewingAmc && (
        <RenewContractModal
          isOpen={Boolean(renewingAmc)}
          onClose={() => setRenewingAmc(null)}
          contract={renewingAmc}
          onConfirm={renewAmcContract}
        />
      )}
    </PageContainer>
  );
}
