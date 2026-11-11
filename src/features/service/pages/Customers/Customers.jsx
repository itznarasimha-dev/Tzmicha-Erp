import React, { useState, useMemo } from 'react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import CustomerDetailModal from './components/CustomerDetailModal';
import SchedulePreventiveVisitModal from './components/SchedulePreventiveVisitModal';
import { useSchedule } from '../../context/ScheduleContext';
import { useRole } from '../../context/RoleContext';
import { formatDate } from '../../utils/formatters';
import {
  Users,
  Eye,
  Building,
  ShieldCheck,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  CalendarCheck
} from 'lucide-react';

export default function Customers() {
  const { roleId } = useRole();
  const {
    customers = [],
    products = [],
    salesInvoices = [],
    serviceRequests = [],
    schedules = [],
    serviceHistory = [],
    warrantyRecords = [],
    amcRecords = []
  } = useSchedule();

  const isManagerOrCoordinator = roleId === 'manager' || roleId === 'coordinator';

  // Active Subpage / Tab: 'directory' | 'coverage'
  const [activeTab, setActiveTab] = useState('directory');

  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({
    city: 'all',
    coverageStatus: 'all'
  });

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [schedulingCoverage, setSchedulingCoverage] = useState(null);
  const [schedulingCoverageType, setSchedulingCoverageType] = useState('warranty');

  // Extract distinct cities
  const cities = useMemo(() => {
    return Array.from(new Set(customers.map((c) => c.city).filter(Boolean))).map((c) => ({
      value: c,
      label: c
    }));
  }, [customers]);

  const directoryFilters = [
    {
      key: 'city',
      label: 'Operating City',
      options: cities
    }
  ];

  const coverageFilters = [
    {
      key: 'coverageStatus',
      label: 'Coverage Status',
      options: [
        { value: 'Active', label: 'Active Coverage' },
        { value: 'Expiring Soon', label: 'Expiring Soon' },
        { value: 'Expired', label: 'Expired' }
      ]
    }
  ];

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSearch('');
    setFilterValues({ city: 'all', coverageStatus: 'all' });
  };

  // Helper to get customer products with warranty/amc and category
  const getCustomerProducts = (custId) => {
    const list = [];
    salesInvoices
      .filter((inv) => inv.customerId === custId)
      .forEach((inv) => {
        (inv.items || []).forEach((item) => {
          const prd = products.find((p) => p.id === item.productId || p.name === item.productName);
          const war = warrantyRecords.find(
            (w) => w.customerId === custId && (w.productId === item.productId || w.productName === item.productName)
          );
          const amc = amcRecords.find(
            (a) => a.customerId === custId && (a.productId === item.productId || a.productName === item.productName)
          );

          list.push({
            productId: item.productId,
            productName: item.productName,
            category: prd?.category || 'Machinery',
            quantity: item.quantity,
            invoiceNo: inv.invoiceNo,
            purchaseDate: inv.invoiceDate,
            warrantyStatus: war?.warrantyStatus || 'Active (12M)',
            amcStatus: amc?.amcStatus || (amc?.contractNumber ? 'Active AMC' : 'None')
          });
        });
      });
    return list;
  };

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.length;
    const activeWarranties = customers.filter((c) =>
      warrantyRecords.some((w) => w.customerId === c.id && w.warrantyStatus === 'Active')
    ).length;
    const activeAmc = customers.filter((c) =>
      amcRecords.some((a) => a.customerId === c.id && a.amcStatus === 'Active')
    ).length;

    return {
      totalCustomers,
      activeCustomers,
      activeWarranties,
      activeAmc
    };
  }, [customers, warrantyRecords, amcRecords]);

  // Filtered customer directory dataset (Customer Type column removed)
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.id.toLowerCase().includes(q) ||
        (c.businessName || c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.contactPerson || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q);

      const matchesCity = filterValues.city === 'all' || c.city === filterValues.city;

      return matchesSearch && matchesCity;
    });
  }, [customers, search, filterValues]);

  // Combined Warranty & AMC Coverage records
  const coverageRecordsList = useMemo(() => {
    const list = [];

    // Map warranty records
    warrantyRecords.forEach((w) => {
      const cust = customers.find((c) => c.id === w.customerId);
      list.push({
        id: w.id,
        customerId: w.customerId,
        customerName: w.customerName || cust?.name || 'Customer',
        contactNumber: w.contactNumber || cust?.phone || '+91 98000 00000',
        productName: w.productName,
        coverageType: `Warranty (${w.coverageType || 'Manufacturer Standard'})`,
        rawCoverageType: 'warranty',
        recordRef: w.id,
        startDate: w.warrantyStartDate,
        endDate: w.warrantyEndDate,
        nextScheduledVisit: w.nextScheduledVisit || '2026-11-15',
        status: w.warrantyStatus || 'Active',
        visitFrequency: w.visitFrequency || 'Every 6 Months',
        totalVisits: w.totalVisits || 2,
        visitsCompleted: w.visitsCompleted || 0,
        remainingVisits: w.remainingVisits !== undefined ? w.remainingVisits : 2,
        visitStatus: w.visitStatus || 'Scheduled',
        rawRecord: w
      });
    });

    // Map AMC records
    amcRecords.forEach((a) => {
      const cust = customers.find((c) => c.id === a.customerId);
      list.push({
        id: a.id,
        customerId: a.customerId,
        customerName: a.customerName || cust?.name || 'Customer',
        contactNumber: a.contactNumber || cust?.phone || '+91 98000 00000',
        productName: a.productName,
        coverageType: `AMC (${a.amcType || 'Comprehensive'})`,
        rawCoverageType: 'amc',
        recordRef: a.contractNumber || a.id,
        startDate: a.contractStartDate,
        endDate: a.contractEndDate,
        nextScheduledVisit: a.nextScheduledMaintenance || '2026-11-20',
        status: a.amcStatus || 'Active',
        visitFrequency: a.visitFrequency || 'Quarterly (Every 3 Months)',
        totalVisits: a.visitsIncluded || 4,
        visitsCompleted: a.visitsCompleted || 0,
        remainingVisits: a.remainingVisits !== undefined ? a.remainingVisits : 4,
        visitStatus: a.visitStatus || 'Upcoming',
        rawRecord: a
      });
    });

    return list;
  }, [warrantyRecords, amcRecords, customers]);

  // Filtered Coverage Records
  const filteredCoverageRecords = useMemo(() => {
    return coverageRecordsList.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.customerId.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.contactNumber.includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q);

      const matchesStatus =
        filterValues.coverageStatus === 'all' || item.status === filterValues.coverageStatus;

      return matchesSearch && matchesStatus;
    });
  }, [coverageRecordsList, search, filterValues]);

  // Customer Directory Table Columns (Section 3.1: Customer Type removed)
  const directoryColumns = [
    {
      header: 'Customer ID',
      key: 'id',
      width: '130px',
      render: (c) => (
        <button
          type="button"
          onClick={() => setSelectedCustomer(c)}
          className="font-mono font-bold text-primary hover:underline"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontSize: '13px' }}
        >
          {c.id}
        </button>
      )
    },
    {
      header: 'Business / Customer Name',
      key: 'name',
      width: '270px',
      render: (c) => (
        <div>
          <button
            type="button"
            onClick={() => setSelectedCustomer(c)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: 600,
              fontSize: '13px',
              color: '#0f172a',
              display: 'block'
            }}
            className="hover:underline"
          >
            {c.businessName || c.name}
          </button>
          <span style={{ fontSize: '11px', color: '#64748b' }}>GSTIN: {c.gstin || 'Not Provided'}</span>
        </div>
      )
    },
    {
      header: 'Contact Person',
      key: 'contactPerson',
      width: '190px',
      render: (c) => (
        <div>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b', display: 'block' }}>
            {c.contactPerson}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {c.designation || 'Key Decision Maker'}
          </span>
        </div>
      )
    },
    {
      header: 'Contact Number',
      key: 'phone',
      width: '160px',
      render: (c) => (
        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#0f172a' }}>
          {c.phone}
        </span>
      )
    },
    {
      header: 'Email Address',
      key: 'email',
      width: '220px',
      render: (c) => (
        <span style={{ fontSize: '12px', color: '#475569' }}>
          {c.email}
        </span>
      )
    },
    {
      header: 'City',
      key: 'city',
      width: '130px',
      render: (c) => (
        <span style={{ fontSize: '12px', color: '#334155' }}>
          {c.city}
        </span>
      )
    },
    {
      header: 'State',
      key: 'state',
      width: '140px',
      render: (c) => (
        <span style={{ fontSize: '12px', color: '#334155' }}>
          {c.state}
        </span>
      )
    },
    {
      header: 'Products Purchased',
      align: 'center',
      width: '150px',
      render: (c) => {
        const prods = getCustomerProducts(c.id);
        return (
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
            {prods.length} Units
          </span>
        );
      }
    },
    {
      header: 'Active Service Requests',
      align: 'center',
      width: '160px',
      render: (c) => {
        const openCount = serviceRequests.filter(
          (sr) => sr.customerId === c.id && sr.status !== 'Completed' && sr.status !== 'Closed' && sr.status !== 'Resolved'
        ).length;
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: openCount > 0 ? '#eff6ff' : '#f8fafc',
              color: openCount > 0 ? '#1d4ed8' : '#64748b'
            }}
          >
            {openCount} Active
          </span>
        );
      }
    },
    {
      header: 'Customer Status',
      key: 'status',
      align: 'center',
      width: '130px',
      render: () => <StatusBadge status="Active" />
    },
    {
      header: 'Actions',
      align: 'center',
      width: '90px',
      render: (c) => (
        <button
          type="button"
          className="table-action-icon-btn"
          onClick={() => setSelectedCustomer(c)}
          title="Inspect Full Customer Profile & Asset Records"
        >
          <Eye size={16} />
        </button>
      )
    }
  ];

  // Section 3.3 & 3.4: Warranty & AMC Coverage Table Columns
  // Exact requested order:
  // 1. Customer ID, 2. Customer Name, 3. Contact Number, 4. Product / Equipment,
  // 5. Warranty ID / AMC ID, 6. Coverage Type, 7. Start Date, 8. End Date,
  // 9. Next Scheduled Visit, 10. Coverage Status, 11. Actions
  const coverageColumns = [
    {
      header: 'Customer ID',
      key: 'customerId',
      width: '120px',
      render: (item) => (
        <span className="font-mono font-bold text-primary" style={{ fontSize: '12px' }}>
          {item.customerId}
        </span>
      )
    },
    {
      header: 'Customer Name',
      key: 'customerName',
      width: '230px',
      render: (item) => (
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
          {item.customerName}
        </span>
      )
    },
    {
      header: 'Contact Number',
      key: 'contactNumber',
      width: '150px',
      render: (item) => (
        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#334155' }}>
          {item.contactNumber}
        </span>
      )
    },
    {
      header: 'Product / Equipment',
      key: 'productName',
      width: '220px',
      render: (item) => (
        <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: 500 }}>
          {item.productName}
        </span>
      )
    },
    {
      header: 'Warranty ID / AMC ID',
      key: 'id',
      width: '150px',
      render: (item) => (
        <div>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
            {item.id}
          </span>
          <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Ref: {item.recordRef}</span>
        </div>
      )
    },
    {
      header: 'Coverage Type',
      key: 'coverageType',
      width: '180px',
      render: (item) => (
        <span style={{ fontSize: '12px', color: '#475569' }}>
          {item.coverageType}
        </span>
      )
    },
    {
      header: 'Start Date',
      key: 'startDate',
      align: 'center',
      width: '110px',
      render: (item) => <span style={{ fontSize: '12px' }}>{formatDate(item.startDate)}</span>
    },
    {
      header: 'End Date',
      key: 'endDate',
      align: 'center',
      width: '110px',
      render: (item) => <span style={{ fontSize: '12px' }}>{formatDate(item.endDate)}</span>
    },
    {
      header: 'Next Scheduled Visit',
      key: 'nextScheduledVisit',
      align: 'center',
      width: '150px',
      render: (item) => (
        <div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
            {formatDate(item.nextScheduledVisit)}
          </span>
          <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>
            {item.visitFrequency}
          </span>
        </div>
      )
    },
    {
      header: 'Coverage Status',
      key: 'status',
      align: 'center',
      width: '130px',
      render: (item) => <StatusBadge status={item.status} />
    },
    {
      header: 'Actions',
      align: 'center',
      width: '150px',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
          {isManagerOrCoordinator && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ fontSize: '11px', padding: '3px 8px', height: '26px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              onClick={() => {
                setSchedulingCoverage(item.rawRecord);
                setSchedulingCoverageType(item.rawCoverageType);
              }}
              title="Schedule planned preventive service visit in Action Plan"
            >
              <CalendarCheck size={12} />
              Schedule Visit
            </button>
          )}
          <button
            type="button"
            className="table-action-icon-btn"
            onClick={() => {
              const cust = customers.find((c) => c.id === item.customerId);
              if (cust) setSelectedCustomer(cust);
            }}
            title="View Full Customer Details"
          >
            <Eye size={15} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row mb-4">
        <div>
          <h2 className="page-title">Customers</h2>
          <p className="page-description">
            View customer accounts, purchased products and warranty / AMC coverage information.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="summary-kpi-grid mb-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
          <div className="summary-kpi-label">Total Customers</div>
          <div className="summary-kpi-value">{metrics.totalCustomers}</div>
          <div className="summary-kpi-sub">Master accounts registered</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
          <div className="summary-kpi-label">Active Customers</div>
          <div className="summary-kpi-value text-success">{metrics.activeCustomers}</div>
          <div className="summary-kpi-sub">Commercial operational accounts</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #8b5cf6' }}>
          <div className="summary-kpi-label">Customers with Active Warranty</div>
          <div className="summary-kpi-value text-primary">{metrics.activeWarranties}</div>
          <div className="summary-kpi-sub">OEM equipment coverage active</div>
        </div>

        <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
          <div className="summary-kpi-label">Customers with Active AMC</div>
          <div className="summary-kpi-value text-warning">{metrics.activeAmc}</div>
          <div className="summary-kpi-sub">Annual maintenance agreement signed</div>
        </div>
      </div>

      {/* Section 3.3: Two Main Subpage Tabs */}
      <div className="tab-navigation-bar mb-4">
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'directory' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('directory');
            handleReset();
          }}
        >
          <Users size={16} />
          <span>Customer Directory ({customers.length})</span>
        </button>

        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'coverage' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('coverage');
            handleReset();
          }}
        >
          <ShieldCheck size={16} />
          <span>Warranty & AMC Coverage ({coverageRecordsList.length})</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={
          activeTab === 'directory'
            ? 'Search by Customer ID (e.g. CUS-000001), Business Name, or Contact...'
            : 'Search coverage by Customer ID, Name, Product, or Contract ID...'
        }
        filters={activeTab === 'directory' ? directoryFilters : coverageFilters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* Tab 1: Customer Directory */}
      {activeTab === 'directory' && (
        <DataTable
          columns={directoryColumns}
          data={filteredCustomers}
          keyField="id"
          minWidth="1700px"
          emptyMessage="No customer accounts match your search filters."
          defaultPageSize={10}
        />
      )}

      {/* Tab 2: Warranty & AMC Coverage (Section 3.3 & 3.4) */}
      {activeTab === 'coverage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Coverage Table */}
          <DataTable
            columns={coverageColumns}
            data={filteredCoverageRecords}
            keyField="id"
            minWidth="1800px"
            emptyMessage="No customer coverage records match your filters."
            defaultPageSize={10}
          />

          {/* Section 3.4: Preventive Service Visit Schedule Details */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={17} className="text-primary" />
                  Preventive Service Visit Schedule & Entitlements
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Periodic maintenance checkups scheduled according to warranty terms and active AMC contracts
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {coverageRecordsList.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '14px',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 700 }}>
                        {item.customerId} • {item.id}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>
                      {item.customerName}
                    </strong>
                    <span style={{ fontSize: '12px', color: '#475569', display: 'block', marginTop: '2px' }}>
                      {item.productName}
                    </span>
                  </div>

                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '8px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Visit Frequency:</span>
                      <strong style={{ color: '#1e293b' }}>{item.visitFrequency}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Visits Included / Completed:</span>
                      <strong style={{ color: '#10b981' }}>{item.visitsCompleted} of {item.totalVisits} Done</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Remaining Visits:</span>
                      <strong style={{ color: '#f59e0b' }}>{item.remainingVisits} Remaining</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Next Planned Date:</span>
                      <strong style={{ color: '#2563eb' }}>{formatDate(item.nextScheduledVisit)}</strong>
                    </div>
                  </div>

                  {isManagerOrCoordinator && item.remainingVisits > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', fontSize: '11px', padding: '4px 8px', marginTop: '4px' }}
                      onClick={() => {
                        setSchedulingCoverage(item.rawRecord);
                        setSchedulingCoverageType(item.rawCoverageType);
                      }}
                    >
                      Schedule Planned Visit
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Drawer / Modal (Section 3.2) */}
      {selectedCustomer && (
        <CustomerDetailModal
          isOpen={Boolean(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          customer={selectedCustomer}
          purchasedProducts={getCustomerProducts(selectedCustomer.id)}
          serviceRequests={serviceRequests}
          schedules={schedules}
          serviceHistory={serviceHistory}
        />
      )}

      {/* Schedule Preventive Visit Modal (Section 3.4) */}
      {schedulingCoverage && (
        <SchedulePreventiveVisitModal
          isOpen={Boolean(schedulingCoverage)}
          onClose={() => setSchedulingCoverage(null)}
          coverageRecord={schedulingCoverage}
          coverageType={schedulingCoverageType}
        />
      )}
    </div>
  );
}
