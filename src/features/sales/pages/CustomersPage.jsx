import { useState, useMemo } from 'react';
import DataTable from '../components/common/DataTable';
import SearchFilterBar from '../components/common/SearchFilterBar';
import AddCustomerModal from '../components/modals/AddCustomerModal';
import EditCustomerModal from '../components/modals/EditCustomerModal';
import CustomerDetailModal from '../components/modals/CustomerDetailModal';
import WhatsAppIcon from '../components/common/WhatsAppIcon';
import CallsFollowupsPage from './CallsFollowupsPage';
import CustomersSubNav from '../components/common/CustomersSubNav';
import { useSales } from '../context/SalesContext';
import { useToast } from '../context/ToastContext';
import { formatDate, getWhatsAppUrl } from '../utils/formatters';
import { Plus, Eye, Edit3, Phone, PhoneCall, Download, ShieldCheck } from 'lucide-react';

export default function CustomersPage() {
  const { customers, followups, orders = [], pageFilter, permissions, userRole, userProfile, downloadCustomerData } = useSales();
  const { showToast } = useToast();

  // Tabs: Existing Customers, New Customers, and Calls & Follow-ups
  const [activeTab, setActiveTab] = useState(() => (pageFilter === 'calls-followups' ? 'calls-followups' : 'existing'));
  const [prevFilter, setPrevFilter] = useState(pageFilter);
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({
    type: 'all',
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Sync tab if navigated with pageFilter
  if (pageFilter !== prevFilter) {
    setPrevFilter(pageFilter);
    if (pageFilter === 'calls-followups') {
      setActiveTab('calls-followups');
    }
  }

  // Stable internal serial number mapping based on registration order (stable across sorts and refreshes)
  const customerSerialMap = useMemo(() => {
    const map = {};
    customers.forEach((c, idx) => {
      map[c.id] = String(idx + 1).padStart(2, '0');
    });
    return map;
  }, [customers]);

  // Map each customer to their previous product/order and quantity
  const customerLastOrderMap = useMemo(() => {
    const map = {};
    customers.forEach((c) => {
      const custOrders = orders.filter(
        (o) =>
          o.customerId === c.id ||
          o.customerId === c.customerId ||
          (o.customerName && c.name && o.customerName.trim().toLowerCase() === c.name.trim().toLowerCase())
      );
      if (custOrders.length === 0) {
        map[c.id] = { text: 'No orders yet', hasOrder: false };
      } else {
        const sorted = [...custOrders].sort((a, b) => (b.orderDate || '').localeCompare(a.orderDate || ''));
        const last = sorted[0];
        if (last && last.items && last.items.length > 0) {
          const item = last.items[0];
          map[c.id] = {
            text: `${item.productName} — ${item.orderedQty || item.qty} units`,
            orderNo: last.orderNo,
            orderDate: last.orderDate,
            hasOrder: true,
          };
        } else {
          map[c.id] = { text: 'No orders yet', hasOrder: false };
        }
      }
    });
    return map;
  }, [customers, orders]);

  const filters = [
    {
      key: 'type',
      label: 'Customer Type',
      options: [
        { value: 'Distributor/Dealer', label: 'Distributor / Dealer' },
        { value: 'Retailer', label: 'Retailer' },
        { value: 'End Customer', label: 'End Customer' },
        { value: 'Corporate/Institutional Customer', label: 'Corporate / Institutional' },
      ],
    },
  ];

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSearch('');
    setFilterValues({ type: 'all' });
  };

  const handleDownloadData = () => {
    try {
      const res = downloadCustomerData();
      showToast(`Exported ${res.count} customer records successfully to CSV!`, 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Scoped customer view: Sales Representatives and Junior Sales Employees manage their assigned accounts; Managers & Coordinators access team records
  const visibleCustomers = useMemo(() => {
    if (userRole === 'sales_rep' || userRole === 'junior_sales') {
      return customers.filter(
        (c) =>
          c.assignedTo === userProfile.fullName ||
          c.assignedEmployeeId === userProfile.employeeId ||
          !c.assignedTo
      );
    }
    return customers;
  }, [customers, userRole, userProfile]);

  // Derive Existing vs New customers strictly from actual order history
  const tabCustomers = useMemo(() => {
    return visibleCustomers.filter((c) => {
      const hasOrder = orders.some(
        (o) =>
          o.customerId === c.id ||
          o.customerId === c.customerId ||
          (o.customerName && c.name && o.customerName.trim().toLowerCase() === c.name.trim().toLowerCase())
      );
      if (activeTab === 'existing') {
        return hasOrder;
      } else {
        return !hasOrder;
      }
    });
  }, [visibleCustomers, orders, activeTab]);

  const existingCustomersCount = useMemo(() => {
    return visibleCustomers.filter((c) =>
      orders.some(
        (o) =>
          o.customerId === c.id ||
          o.customerId === c.customerId ||
          (o.customerName && c.name && o.customerName.trim().toLowerCase() === c.name.trim().toLowerCase())
      )
    ).length;
  }, [visibleCustomers, orders]);

  const newCustomersCount = useMemo(() => {
    return visibleCustomers.filter(
      (c) =>
        !orders.some(
          (o) =>
            o.customerId === c.id ||
            o.customerId === c.customerId ||
            (o.customerName && c.name && o.customerName.trim().toLowerCase() === c.name.trim().toLowerCase())
        )
    ).length;
  }, [visibleCustomers, orders]);

  const filteredCustomers = useMemo(() => {
    return tabCustomers.filter((c) => {
      const matchesSearch =
        !search.trim() ||
        (c.customerId && c.customerId.toLowerCase().includes(search.toLowerCase())) ||
        (c.code && c.code.toLowerCase().includes(search.toLowerCase())) ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
        (c.designation && c.designation.toLowerCase().includes(search.toLowerCase())) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
        (c.city && c.city.toLowerCase().includes(search.toLowerCase()));

      const matchesType = filterValues.type === 'all' || c.type === filterValues.type;

      return matchesSearch && matchesType;
    });
  }, [tabCustomers, search, filterValues]);

  // Consistent columns across both Existing and New Customer tabs:
  // Serial No., Customer ID, Business Name, Customer Type, Contact Person, Phone Number, Email, City, Last Order Details, Actions
  const columns = [
    {
      header: 'Serial No.',
      key: 'serialNo',
      width: '80px',
      minWidth: '75px',
      align: 'center',
      render: (c) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {customerSerialMap[c.id] || '01'}
        </span>
      ),
    },
    {
      header: 'Customer ID',
      key: 'customerId',
      width: '125px',
      minWidth: '115px',
      align: 'center',
      render: (c) => (
        <span className="font-mono text-xs font-semibold text-primary bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
          {c.customerId || c.code || c.id}
        </span>
      ),
    },
    {
      header: 'Business Name',
      key: 'name',
      width: '230px',
      minWidth: '200px',
      render: (c) => (
        <div>
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => setSelectedCustomer(c)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '13px',
            }}
          >
            {c.name}
          </button>
        </div>
      ),
    },
    {
      header: 'Customer Type',
      key: 'type',
      width: '150px',
      minWidth: '135px',
      render: (c) => (
        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
          {c.type}
        </span>
      ),
    },
    {
      header: 'Contact Person',
      key: 'contactPerson',
      width: '180px',
      minWidth: '160px',
      render: (c) => {
        const cleanName = c.contactPerson ? c.contactPerson.replace(/\s*\(.*?\)/, '').trim() : '—';
        const desig = c.designation || (c.contactPerson?.match(/\((.*?)\)/)?.[1] || '');
        return (
          <div>
            <span className="font-semibold text-xs text-slate-900 block">{cleanName}</span>
            {desig && (
              <span className="text-xxs text-slate-500 font-normal block mt-0.5" style={{ fontSize: '11px' }}>
                ({desig})
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Phone Number',
      key: 'phone',
      width: '165px',
      minWidth: '155px',
      render: (c) => {
        const waUrl = getWhatsAppUrl(c.phone, `Hello ${c.contactPerson || c.name}, contacting you from ApexERP Sales.`);
        return (
          <div className="text-xs text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
            <Phone size={12} className="text-slate-400 shrink-0" />
            <span className="font-medium">{c.phone}</span>
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="table-action-icon-btn shrink-0"
                title={`Open WhatsApp chat with ${c.contactPerson || c.name} (${c.phone})`}
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '18px',
                  height: '18px',
                  color: '#25D366',
                  padding: '1px',
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
      width: '190px',
      minWidth: '170px',
      render: (c) => {
        const rawEmail = c.email || '';
        const emailList = rawEmail
          .split(/[,;\s]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        const primaryEmail = emailList[0] || '—';
        return (
          <a
            href={`mailto:${primaryEmail}`}
            className="text-xs text-slate-600 hover:text-primary hover:underline truncate block"
            style={{ maxWidth: '180px' }}
            title={primaryEmail}
            onClick={(e) => e.stopPropagation()}
          >
            {primaryEmail}
          </a>
        );
      },
    },
    {
      header: 'City',
      key: 'city',
      width: '120px',
      minWidth: '110px',
      render: (c) => (
        <span className="text-xs font-medium text-slate-800">{c.city || '—'}</span>
      ),
    },
    {
      header: 'Remarks (Initial Reason)',
      key: 'remarks',
      width: '230px',
      minWidth: '200px',
      render: (c) => (
        <div style={{ maxWidth: '220px' }}>
          <span
            className="text-xs text-slate-700 block truncate"
            title={c.remarks || 'Direct inbound sales inquiry'}
            style={{ lineHeight: '1.4' }}
          >
            {c.remarks || 'Direct inbound sales inquiry'}
          </span>
          {c.assignedTo && (
            <span className="text-xxs text-slate-400 block mt-0.5" style={{ fontSize: '11px' }}>
              Owner: {c.assignedTo}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Last Order Details',
      key: 'lastOrder',
      width: '240px',
      minWidth: '210px',
      render: (c) => {
        const orderInfo = customerLastOrderMap[c.id] || { text: 'No orders yet', hasOrder: false };
        return (
          <div className="max-w-xs">
            <span
              className={`text-xs block ${orderInfo.hasOrder ? 'font-semibold text-slate-900' : 'text-slate-400 italic'}`}
            >
              {orderInfo.text}
            </span>
            {orderInfo.hasOrder && orderInfo.orderNo && (
              <span className="text-xxs text-slate-500 font-normal block mt-0.5 truncate" style={{ fontSize: '11px' }}>
                {orderInfo.orderNo} {orderInfo.orderDate && `• ${formatDate(orderInfo.orderDate)}`}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      width: '105px',
      minWidth: '95px',
      align: 'center',
      render: (c) => {
        const waUrl = getWhatsAppUrl(c.phone, `Hello ${c.contactPerson || c.name}, contacting you from ApexERP Sales.`);
        return (
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="table-action-icon-btn"
                title={`Open WhatsApp chat with ${c.contactPerson || c.name} (${c.phone})`}
                style={{ color: '#25D366' }}
                onClick={(e) => e.stopPropagation()}
              >
                <WhatsAppIcon size={15} color="#25D366" />
              </a>
            )}
            <button
              type="button"
              className="table-action-icon-btn"
              onClick={() => setSelectedCustomer(c)}
              title="View customer profile & order history"
            >
              <Eye size={15} />
            </button>
            <button
              type="button"
              className="table-action-icon-btn"
              onClick={() => setEditingCustomer(c)}
              title="Edit customer master data"
            >
              <Edit3 size={15} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="page-container">
      {/* Sub-Navigation for Customers Module */}
      <CustomersSubNav currentTab="sales-customers" />

      {/* Page Header */}
      <div className="page-header-row mb-4">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="page-title" style={{ margin: 0 }}>Customers Directory</h2>
            {userRole === 'sales_rep' ? (
              <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                Assigned Accounts ({userProfile.fullName})
              </span>
            ) : (
              <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                Full Team Directory ({userRole === 'sales_manager' ? 'Sales Manager' : 'Sales Coordinator'})
              </span>
            )}
          </div>
          <p className="page-description" style={{ marginTop: '4px' }}>
            Maintain accounts for corporate OEMs, institutional buyers, retailers, and authorized distribution networks
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {permissions.canDownloadCustomerData && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-icon-text"
              onClick={handleDownloadData}
              title="Export complete customer database to CSV"
            >
              <Download size={14} />
              <span>Export Customer Data</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-primary btn-sm btn-icon-text"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={15} />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Tabs: Existing Customers vs New Customers */}
      <div className="tab-navigation-bar" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          type="button"
          style={{
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'existing' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'existing' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'existing' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          onClick={() => setActiveTab('existing')}
        >
          <span>Existing Customers</span>
          <span style={{ fontSize: '11px', background: activeTab === 'existing' ? '#eff6ff' : '#f1f5f9', color: activeTab === 'existing' ? '#2563eb' : '#64748b', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
            {existingCustomersCount}
          </span>
        </button>

        <button
          type="button"
          style={{
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'new' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'new' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'new' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          onClick={() => setActiveTab('new')}
        >
          <span>New Customers</span>
          <span style={{ fontSize: '11px', background: activeTab === 'new' ? '#eff6ff' : '#f1f5f9', color: activeTab === 'new' ? '#2563eb' : '#64748b', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
            {newCustomersCount}
          </span>
        </button>

        <button
          type="button"
          style={{
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'calls-followups' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'calls-followups' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'calls-followups' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          onClick={() => setActiveTab('calls-followups')}
        >
          <PhoneCall size={14} />
          <span>Calls &amp; Follow-ups</span>
          <span style={{ fontSize: '11px', background: activeTab === 'calls-followups' ? '#eff6ff' : '#f1f5f9', color: activeTab === 'calls-followups' ? '#2563eb' : '#64748b', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
            {followups ? followups.filter((f) => f.status !== 'Completed').length : 0}
          </span>
        </button>
      </div>

      {activeTab === 'calls-followups' ? (
        <CallsFollowupsPage embedded />
      ) : (
        <>
          <SearchFilterBar
            searchPlaceholder="Search by customer name, code, contact person, or city..."
            searchValue={search}
            onSearchChange={setSearch}
            filters={filters}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />

          <DataTable
            columns={columns}
            data={filteredCustomers}
            keyField="id"
            emptyMessage={
              activeTab === 'existing'
                ? 'No existing customer records match your filter criteria'
                : 'No newly registered customers found'
            }
            pageSize={8}
            minWidth="1200px"
          />
        </>
      )}

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Edit Customer Modal */}
      <EditCustomerModal
        isOpen={Boolean(editingCustomer)}
        onClose={() => setEditingCustomer(null)}
        customer={editingCustomer}
      />

      {/* Customer Detail Profile Modal */}
      <CustomerDetailModal
        isOpen={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        customer={selectedCustomer}
      />
    </div>
  );
}
