import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import { Customer, SalesOrder, CustomerReturnRecord } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select, SearchInput } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import {
  Users,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Plus,
  Edit2,
  ExternalLink,
  ShoppingBag,
  FileText,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Search,
  Filter,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  X,
  Check,
  Copy,
} from 'lucide-react';

interface CustomersDirectoryViewProps {
  role?: 'admin' | 'sales';
}

export const CustomersDirectoryView: React.FC<CustomersDirectoryViewProps> = ({ role = 'admin' }) => {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const {
    customers,
    salesOrders,
    customerReturns,
    regions,
    users,
    currentUser,
  } = useErpStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'existing' | 'new'>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Selected customer for full drawer/modal details
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailTab, setDetailTab] = useState<'orders' | 'invoices' | 'returns' | 'profile'>('orders');

  // Add / Edit Modal state
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formBusinessName, setFormBusinessName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<Customer['type']>('dealer');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formBillingAddress, setFormBillingAddress] = useState('');
  const [formShippingAddress, setFormShippingAddress] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('Net 30');
  const [formCreditLimit, setFormCreditLimit] = useState('500000');
  const [formRegionId, setFormRegionId] = useState('reg-north');
  const [formStatus, setFormStatus] = useState<Customer['status']>('active');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper to determine customer classification based on mock transaction history
  const getCustomerTradeStats = (customerId: string) => {
    const orders = salesOrders.filter((o) => o.customerId === customerId);
    // Completed/confirmed purchases in mock history
    const completedOrders = orders.filter(
      (o) => o.status === 'dispatched' || o.status === 'completed' || o.status === 'reserved' || o.status === 'stock_verified'
    );
    const isExisting = completedOrders.length > 0;
    const totalLifetimeSpent = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return {
      totalOrdersCount: orders.length,
      completedOrdersCount: completedOrders.length,
      isExisting,
      classification: isExisting ? ('existing' as const) : ('new' as const),
      totalLifetimeSpent,
      lastOrder: orders[0],
    };
  };

  // KPI calculations
  const totalCustomersCount = customers.length;
  const existingCustomersCount = customers.filter((c) => getCustomerTradeStats(c.id).isExisting).length;
  const newCustomersCount = customers.filter((c) => !getCustomerTradeStats(c.id).isExisting).length;
  const totalReceivables = customers.reduce((sum, c) => sum + (c.currentOutstanding || 0), 0);

  // Filtered customer list
  const filteredCustomers = customers.filter((c) => {
    const stats = getCustomerTradeStats(c.id);

    // Tab filter
    if (activeTab === 'existing' && !stats.isExisting) return false;
    if (activeTab === 'new' && stats.isExisting) return false;

    // Search query
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(query) ||
      c.businessName.toLowerCase().includes(query) ||
      (c.code && c.code.toLowerCase().includes(query)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(query)) ||
      c.phone.includes(query) ||
      c.email.toLowerCase().includes(query) ||
      (c.gstin && c.gstin.toLowerCase().includes(query)) ||
      c.address.toLowerCase().includes(query);

    // Dropdown filters
    const matchesType = selectedTypeFilter === 'all' || c.type === selectedTypeFilter;
    const matchesStatus = selectedStatusFilter === 'all' || c.status === selectedStatusFilter;
    const matchesRegion = selectedRegionFilter === 'all' || c.regionId === selectedRegionFilter;

    return matchesSearch && matchesType && matchesStatus && matchesRegion;
  });

  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenAdd = () => {
    const nextNum = totalCustomersCount + 1;
    setFormCode(`CUST-NEW-0${nextNum}`);
    setFormName('');
    setFormBusinessName('');
    setFormType('dealer');
    setFormContactPerson('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormBillingAddress('');
    setFormShippingAddress('');
    setFormGstin('');
    setFormPaymentTerms('Net 30');
    setFormCreditLimit('500000');
    setFormRegionId('reg-north');
    setFormStatus('active');
    setEditingCustomerId(null);
    setModalMode('add');
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomerId(c.id);
    setFormCode(c.code || `CUST-${c.id}`);
    setFormName(c.name);
    setFormBusinessName(c.businessName);
    setFormType(c.type);
    setFormContactPerson(c.contactPerson || c.name);
    setFormPhone(c.phone);
    setFormEmail(c.email);
    setFormAddress(c.address);
    setFormBillingAddress(c.billingAddress || c.address);
    setFormShippingAddress(c.shippingAddress || c.address);
    setFormGstin(c.gstin || '');
    setFormPaymentTerms(c.paymentTerms || 'Net 30');
    setFormCreditLimit((c.creditLimit || 500000).toString());
    setFormRegionId(c.regionId || 'reg-north');
    setFormStatus(c.status);
    setModalMode('edit');
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formBusinessName.trim()) {
      alert('Customer proprietor name and business legal name are required.');
      return;
    }

    if (modalMode === 'add') {
      const newCust: Customer = {
        id: `cust-${Date.now().toString().slice(-4)}`,
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        businessName: formBusinessName.trim(),
        type: formType,
        regionId: formRegionId,
        contactPerson: formContactPerson.trim() || formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        address: formAddress.trim(),
        billingAddress: formBillingAddress.trim() || formAddress.trim(),
        shippingAddress: formShippingAddress.trim() || formAddress.trim(),
        gstin: formGstin.trim().toUpperCase() || undefined,
        paymentTerms: formPaymentTerms,
        creditLimit: parseFloat(formCreditLimit) || 0,
        currentOutstanding: 0,
        onboardingDate: new Date().toISOString().split('T')[0],
        status: formStatus,
        customerTypeClassification: 'new',
        totalCompletedOrders: 0,
        totalLifetimeRevenue: 0,
      };

      // Add to store
      const store = useErpStore.getState();
      useErpStore.setState({ customers: [newCust, ...store.customers] });
      showToast(`Customer account "${newCust.businessName}" created successfully as New Customer.`);
    } else if (modalMode === 'edit' && editingCustomerId) {
      const store = useErpStore.getState();
      useErpStore.setState({
        customers: store.customers.map((c) =>
          c.id === editingCustomerId
            ? {
                ...c,
                code: formCode.trim().toUpperCase(),
                name: formName.trim(),
                businessName: formBusinessName.trim(),
                type: formType,
                regionId: formRegionId,
                contactPerson: formContactPerson.trim() || formName.trim(),
                phone: formPhone.trim(),
                email: formEmail.trim(),
                address: formAddress.trim(),
                billingAddress: formBillingAddress.trim() || formAddress.trim(),
                shippingAddress: formShippingAddress.trim() || formAddress.trim(),
                gstin: formGstin.trim().toUpperCase() || undefined,
                paymentTerms: formPaymentTerms,
                creditLimit: parseFloat(formCreditLimit) || 0,
                status: formStatus,
              }
            : c
        ),
      });

      if (selectedCustomer && selectedCustomer.id === editingCustomerId) {
        setSelectedCustomer({
          ...selectedCustomer,
          code: formCode.trim().toUpperCase(),
          name: formName.trim(),
          businessName: formBusinessName.trim(),
          type: formType,
          regionId: formRegionId,
          contactPerson: formContactPerson.trim() || formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim(),
          address: formAddress.trim(),
          billingAddress: formBillingAddress.trim() || formAddress.trim(),
          shippingAddress: formShippingAddress.trim() || formAddress.trim(),
          gstin: formGstin.trim().toUpperCase() || undefined,
          paymentTerms: formPaymentTerms,
          creditLimit: parseFloat(formCreditLimit) || 0,
          status: formStatus,
        });
      }
      showToast(`Customer account "${formBusinessName.trim()}" updated successfully.`);
    }

    setModalMode(null);
  };

  // Linked transactions for selected customer
  const customerOrders = selectedCustomer
    ? salesOrders.filter((o) => o.customerId === selectedCustomer.id)
    : [];

  const customerReturnsList = selectedCustomer
    ? customerReturns.filter(
        (r) => r.customerId === selectedCustomer.id || r.customerName === selectedCustomer.businessName
      )
    : [];

  const selectedStats = selectedCustomer ? getCustomerTradeStats(selectedCustomer.id) : null;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-semibold animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="primary" size="sm">Commercial Accounts &amp; Dealers</Badge>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">CRM &amp; Sales Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            Customers &amp; Dealers Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Unified registry distinguishing <strong>New Customers</strong> (zero completed purchases) from <strong>Existing Customers</strong> (with verifiable transaction history, credit ledgers, and return records).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            icon={<Plus className="w-4 h-4" />}
          >
            Add New Customer
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Accounts */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Registered Accounts
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {totalCustomersCount}
            </div>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
              Active Trade Partners
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Existing Customers */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Existing Customers
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-1 flex items-center gap-1.5">
              {existingCustomersCount}
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Purchased
              </span>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
              1+ Completed Orders On File
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* New Customers */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              New Customers
            </span>
            <div className="text-2xl font-black text-blue-700 mt-1 flex items-center gap-1.5">
              {newCustomersCount}
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                0 Orders
              </span>
            </div>
            <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">
              Ready for First Order Booking
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Total Receivables */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Outstanding A/R
            </span>
            <div className="text-2xl font-black text-rose-700 mt-1 font-mono">
              ₹{(totalReceivables / 100000).toFixed(2)} L
            </div>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
              Assigned Credit Exposure
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sourcing & Classification Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Classification Tab Switcher */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-2xl text-xs shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-1.5 rounded-xl font-bold transition-colors ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Accounts ({totalCustomersCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('existing')}
            className={`px-4 py-1.5 rounded-xl font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'existing'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Existing Customers ({existingCustomersCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`px-4 py-1.5 rounded-xl font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'new'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-blue-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            New Customers ({newCustomersCount})
          </button>
        </div>

        {/* Search & Dropdown Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-64">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by company, code, person, or GSTIN..."
            />
          </div>

          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="glass-input rounded-xl px-3 py-1.5 text-xs text-slate-800 bg-white cursor-pointer"
          >
            <option value="all">All Account Types</option>
            <option value="dealer">Authorized Dealer</option>
            <option value="distributor">Regional Distributor</option>
            <option value="retailer">Retail Partner</option>
            <option value="direct_customer">Direct OEM / Client</option>
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="glass-input rounded-xl px-3 py-1.5 text-xs text-slate-800 bg-white cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="prospect">Prospect</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Main Customers Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              {activeTab === 'all'
                ? `Customer Registry (${filteredCustomers.length})`
                : activeTab === 'existing'
                ? `Existing Customers with Completed Trade History (${filteredCustomers.length})`
                : `Newly Onboarded Customers (${filteredCustomers.length})`}
            </CardTitle>
            <CardDescription>
              Click any customer row to inspect complete sales orders history, invoice payments, and return records.
            </CardDescription>
          </div>
          <Badge variant={activeTab === 'new' ? 'primary' : 'neutral'} size="sm">
            {filteredCustomers.length} Records Shown
          </Badge>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                <th className="py-3 px-4">Customer ID</th>
                <th className="py-3 px-4">Customer &amp; Legal Entity</th>
                <th className="py-3 px-4 text-center">Classification</th>
                <th className="py-3 px-4">Assigned Officer</th>
                <th className="py-3 px-4">Location &amp; GSTIN</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Outstanding (A/R)</th>
                <th className="py-3 px-4 text-center">Orders &amp; History</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-sm text-slate-700">No customer records found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No accounts matched "{searchTerm}". Try clearing your search or filters.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setSearchTerm('');
                        setActiveTab('all');
                        setSelectedTypeFilter('all');
                        setSelectedStatusFilter('all');
                      }}
                    >
                      Clear All Filters
                    </Button>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c) => {
                  const stats = getCustomerTradeStats(c.id);
                  const assignedUser = users.find(
                    (u) => u.id === c.assignedSalesUserId || u.id === c.assignedMarketingUserId
                  );
                  const displayCode = c.code || `CUST-${c.id.slice(-4).toUpperCase()}`;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/90 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setDetailTab('orders');
                      }}
                    >
                      {/* 1. Customer Master ID */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-extrabold text-xs text-indigo-700 bg-indigo-50/90 border border-indigo-200/90 px-2 py-0.5 rounded-lg select-all">
                            {displayCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(displayCode);
                              setCopiedId(c.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Copy Customer ID"
                          >
                            {copiedId === c.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 2. Name & Legal Entity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 border ${
                            stats.isExisting
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {c.code ? c.code.slice(5, 8) : c.businessName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors block">
                              {c.businessName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              Prop: {c.contactPerson || c.name} • <span className="capitalize">{c.type.replace('_', ' ')}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Customer Classification Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {stats.isExisting ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Existing Customer
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                            <Sparkles className="w-3 h-3 text-blue-600" />
                            New Customer
                          </span>
                        )}
                      </td>

                      {/* 4. Assigned Officer & Employee ID */}
                      <td className="py-3.5 px-4">
                        {assignedUser ? (
                          <div>
                            <div className="font-semibold text-slate-900 text-xs">{assignedUser.name}</div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5">
                              <span className="font-semibold text-indigo-700 bg-indigo-50 px-1 rounded border border-indigo-100">
                                {assignedUser.employeeId || 'EMP-SLS'}
                              </span>
                              <span>•</span>
                              <span className="capitalize text-slate-600 font-sans">{assignedUser.role.replace('_', ' ')}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Direct Account</span>
                        )}
                      </td>

                      {/* 5. Location & GSTIN */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-[11px] font-bold text-slate-800">
                          {c.gstin || 'Unregistered'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 max-w-[190px] truncate" title={c.address}>
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{c.address.split(',').slice(-2).join(',').trim()}</span>
                        </div>
                      </td>

                      {/* 6. Credit Limit */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                        ₹{c.creditLimit.toLocaleString('en-IN')}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {c.paymentTerms || 'Net 30'}
                        </span>
                      </td>

                      {/* 7. Outstanding (A/R) */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {c.currentOutstanding > 0 ? (
                          <span className="font-bold text-rose-700">
                            ₹{c.currentOutstanding.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">₹0</span>
                        )}
                      </td>

                      {/* 8. Orders & Trade History */}
                      <td className="py-3.5 px-4 text-center">
                        {stats.isExisting ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/orders?search=${c.businessName}`);
                            }}
                            className="inline-flex flex-col items-center px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition-colors cursor-pointer group/btn"
                            title="Open in Orders Hub"
                          >
                            <span className="font-mono font-bold text-slate-900 group-hover/btn:text-indigo-600 text-xs">
                              {stats.totalOrdersCount} Orders
                            </span>
                            <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                              ₹{(stats.totalLifetimeSpent / 1000).toFixed(0)}k vol →
                            </span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No purchases yet</span>
                        )}
                      </td>

                      {/* 9. Status */}
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={c.status === 'active' ? 'success' : c.status === 'prospect' ? 'warning' : 'neutral'}
                          size="sm"
                        >
                          {c.status.toUpperCase()}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(c)}
                          icon={<Edit2 className="w-3.5 h-3.5 text-slate-600" />}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCustomer(c);
                            setDetailTab('orders');
                          }}
                          icon={<ExternalLink className="w-3.5 h-3.5" />}
                        >
                          History
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length > pageSize && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/40">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredCustomers.length / pageSize)}
              totalItems={filteredCustomers.length}
              itemsPerPage={pageSize}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </Card>

      {/* CUSTOMER DETAILS DRAWER / MODAL WITH FULL TIMELINE */}
      {selectedCustomer && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCustomer(null)}
          title={selectedCustomer.businessName}
          description={`Customer Code: ${selectedCustomer.code || selectedCustomer.id} | Classification: ${selectedStats?.isExisting ? 'Existing Trade Account' : 'New Customer (0 Orders)'}`}
        >
          <div className="space-y-4 text-xs">
            {/* Top Identity Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl text-white font-black text-sm flex items-center justify-center shadow-md ${
                    selectedStats?.isExisting ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}>
                    {selectedCustomer.code ? selectedCustomer.code.slice(5, 8) : 'CUS'}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">{selectedCustomer.businessName}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                        <span>ID: {selectedCustomer.code || `CUST-${selectedCustomer.id.slice(-4).toUpperCase()}`}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const idToCopy = selectedCustomer.code || `CUST-${selectedCustomer.id.slice(-4).toUpperCase()}`;
                            navigator.clipboard.writeText(idToCopy);
                            setCopiedId(selectedCustomer.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 cursor-pointer"
                          title="Copy Customer ID"
                        >
                          {copiedId === selectedCustomer.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="capitalize text-slate-700 font-semibold text-xs">
                        {selectedCustomer.type.replace('_', ' ')}
                      </span>
                      {(() => {
                        const officer = users.find(
                          (u) => u.id === selectedCustomer.assignedSalesUserId || u.id === selectedCustomer.assignedMarketingUserId
                        );
                        if (!officer) return null;
                        return (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600 text-xs font-medium flex items-center gap-1">
                              <span>Rep: {officer.name}</span>
                              <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 px-1 rounded border border-indigo-100">
                                {officer.employeeId || 'EMP-SLS'}
                              </span>
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedStats?.isExisting ? (
                    <Badge variant="success">EXISTING CUSTOMER</Badge>
                  ) : (
                    <Badge variant="primary">NEW CUSTOMER</Badge>
                  )}
                  <Badge variant={selectedCustomer.status === 'active' ? 'success' : 'warning'}>
                    {selectedCustomer.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-200/80">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Credit Limit</span>
                  <span className="font-bold font-mono text-slate-900 text-sm">
                    ₹{selectedCustomer.creditLimit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Outstanding (A/R)</span>
                  <span className={`font-bold font-mono text-sm ${selectedCustomer.currentOutstanding > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                    ₹{selectedCustomer.currentOutstanding.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Lifetime Sales</span>
                  <span className="font-bold font-mono text-emerald-800 text-sm">
                    ₹{selectedStats?.totalLifetimeSpent.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Terms</span>
                  <span className="font-bold text-indigo-700">{selectedCustomer.paymentTerms || 'Net 30'}</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs Header */}
            <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
              <button
                onClick={() => setDetailTab('orders')}
                className={`pb-2 transition-colors flex items-center gap-1.5 ${
                  detailTab === 'orders'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Sales Orders History ({customerOrders.length})</span>
              </button>
              <button
                onClick={() => setDetailTab('invoices')}
                className={`pb-2 transition-colors flex items-center gap-1.5 ${
                  detailTab === 'invoices'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Invoices &amp; Payments</span>
              </button>
              <button
                onClick={() => setDetailTab('returns')}
                className={`pb-2 transition-colors flex items-center gap-1.5 ${
                  detailTab === 'returns'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Return History ({customerReturnsList.length})</span>
              </button>
              <button
                onClick={() => setDetailTab('profile')}
                className={`pb-2 transition-colors flex items-center gap-1.5 ${
                  detailTab === 'profile'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Commercial Profile</span>
              </button>
            </div>

            {/* TAB 1: SALES ORDERS TIMELINE & HISTORY */}
            {detailTab === 'orders' && (
              <div className="space-y-3">
                {customerOrders.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 space-y-2">
                    <Sparkles className="w-10 h-10 text-blue-500 mx-auto opacity-70" />
                    <h4 className="font-bold text-slate-800 text-sm">
                      New Customer Account — No Completed Purchases Yet
                    </h4>
                    <p className="text-slate-500 max-w-md mx-auto text-[11px] leading-relaxed">
                      This account is newly registered and has zero prior sales transactions recorded in mock history. It is eligible and ready for initial sales order booking.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {customerOrders.map((o) => (
                      <div key={o.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-xs">
                              {o.orderNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(o.orderNumber);
                                setCopiedId(o.id);
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                              className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                              title="Copy Order ID"
                            >
                              {copiedId === o.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <Badge
                              size="sm"
                              variant={
                                o.status === 'dispatched' || o.status === 'completed'
                                  ? 'success'
                                  : o.status === 'reserved'
                                  ? 'purple'
                                  : 'warning'
                              }
                            >
                              {o.status.replace(/_/g, ' ').toUpperCase()}
                            </Badge>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(null);
                                navigate(`/admin/orders?search=${o.orderNumber}`);
                              }}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer ml-1"
                            >
                              Open in Orders Hub →
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Booked on {new Date(o.createdAt).toLocaleDateString('en-IN')} • By {o.salesUserName}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-black text-slate-900 block text-sm">
                            ₹{o.totalAmount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {o.items.length} product lines • {o.paymentStatus.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: INVOICES & PAYMENT STATUS */}
            {detailTab === 'invoices' && (
              <div className="space-y-3">
                {customerOrders.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 space-y-1">
                    <Receipt className="w-8 h-8 text-slate-400 mx-auto" />
                    <h4 className="font-bold text-slate-700">No Invoices Generated</h4>
                    <p className="text-slate-500 text-[11px]">
                      Invoices will be generated once this new customer books their first sales order.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {customerOrders.map((o, idx) => {
                      const invNo = `INV-2026-${(100 + idx * 7).toString()}`;
                      const isPaid = o.paymentStatus === 'paid';
                      return (
                        <div key={o.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">{invNo}</span>
                              <Badge size="sm" variant={isPaid ? 'success' : 'danger'}>
                                {isPaid ? 'PAID IN FULL' : 'PAYMENT OVERDUE'}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Ref Order: {o.orderNumber} • Terms: {selectedCustomer.paymentTerms || 'Net 30'}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-black text-slate-900 block text-sm">
                              ₹{o.totalAmount.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              GST 18% Included
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CUSTOMER RETURNS & RMA HISTORY (MOCK RECORDS) */}
            {detailTab === 'returns' && (
              <div className="space-y-3">
                {/* Bridge Notice */}
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-[11px] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold flex items-center gap-1.5 text-purple-900">
                      <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0" />
                      Future Service &amp; Finance Interface Ready
                    </span>
                    <p className="text-purple-800">
                      This return ledger displays customer RMA records prepared for future Service RMA inspection and automated Finance credit notes.
                    </p>
                  </div>
                  <Badge variant="purple" size="sm">Pre-Configured</Badge>
                </div>

                {customerReturnsList.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
                    <h4 className="font-bold text-slate-700">Zero Customer Return Claims</h4>
                    <p className="text-slate-500 text-[11px]">
                      No goods return or warranty refund requests recorded for this customer.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerReturnsList.map((ret) => (
                      <div
                        key={ret.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-rose-700 text-sm">{ret.returnNumber}</span>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-slate-500 text-[11px]">Ref: {ret.salesOrderNumber}</span>
                          </div>
                          <Badge size="sm" variant={ret.status === 'credit_note_issued' ? 'success' : 'warning'}>
                            {ret.status.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Product Item</span>
                            <span className="font-bold text-slate-900 text-xs">{ret.productName}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Qty Returned</span>
                            <span className="font-mono font-bold text-rose-700 text-xs">
                              {ret.returnedQuantity} {ret.unit}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Credit Value</span>
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              ₹{ret.refundOrCreditAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        <p className="text-slate-700 italic text-[11px]">
                          <strong>Customer Reason:</strong> "{ret.returnReason}"
                        </p>

                        {ret.serviceInspectionNotes && (
                          <div className="p-2 rounded bg-indigo-50/60 border border-indigo-100 text-[10px] text-indigo-900">
                            <strong>Service Inspection ({ret.inspectedByUserName}): </strong>
                            {ret.serviceInspectionNotes}
                          </div>
                        )}

                        {ret.creditNoteNumber && (
                          <div className="text-[10px] text-emerald-700 font-mono font-bold flex items-center justify-between pt-1">
                            <span>Settled via Credit Note: {ret.creditNoteNumber}</span>
                            <span>Date: {ret.creditNoteDate}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: COMMERCIAL PROFILE */}
            {detailTab === 'profile' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Proprietor &amp; Commercial Contacts
                    </span>
                    <div className="font-bold text-sm text-slate-900">{selectedCustomer.name}</div>
                    <div className="space-y-1 pt-1 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{selectedCustomer.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-indigo-600">{selectedCustomer.email}</span>
                      </div>
                      <div className="flex items-start gap-2 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{selectedCustomer.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Statutory Tax &amp; Logistics
                    </span>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">GSTIN Registration:</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {selectedCustomer.gstin || 'Unregistered Dealer'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Billing Address:</span>
                        <span className="text-slate-800">{selectedCustomer.billingAddress || selectedCustomer.address}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Shipping Depot / Delivery Site:</span>
                        <span className="text-slate-800">{selectedCustomer.shippingAddress || selectedCustomer.address}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const curr = selectedCustomer;
                  setSelectedCustomer(null);
                  handleOpenEdit(curr);
                }}
                icon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Edit Account Details
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>
                Close Drawer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ADD / EDIT CUSTOMER MODAL */}
      {modalMode && (
        <Modal
          isOpen={true}
          onClose={() => setModalMode(null)}
          title={modalMode === 'add' ? 'Register New Customer Account' : `Edit Customer: ${formBusinessName}`}
          description="Maintain commercial master data, statutory GSTIN, credit limits, and delivery addresses."
        >
          <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Business / Enterprise Legal Name *"
                placeholder="e.g. Apex Hardware & Industrial Traders"
                value={formBusinessName}
                onChange={(e) => setFormBusinessName(e.target.value)}
                required
              />
              <Input
                label="Customer Account Code *"
                placeholder="e.g. CUST-APX-01"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Proprietor / Representative *"
                placeholder="e.g. Sunil Aggarwal"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
              <Input
                label="Phone / Mobile *"
                placeholder="e.g. +91 98101 44219"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                required
              />
              <Input
                label="Commercial Email *"
                type="email"
                placeholder="e.g. orders@apexindustrial.in"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Customer Account Type *"
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                options={[
                  { label: 'Authorized Dealer', value: 'dealer' },
                  { label: 'Regional Distributor', value: 'distributor' },
                  { label: 'Retail Partner', value: 'retailer' },
                  { label: 'Direct OEM / Client', value: 'direct_customer' },
                ]}
              />
              <Input
                label="GSTIN (15 Alphanumeric)"
                placeholder="e.g. 09AAACA1122D1Z1"
                value={formGstin}
                onChange={(e) => setFormGstin(e.target.value)}
              />
              <Select
                label="Payment Terms *"
                value={formPaymentTerms}
                onChange={(e) => setFormPaymentTerms(e.target.value)}
                options={[
                  { label: 'Net 30 Days', value: 'Net 30' },
                  { label: 'Net 15 Days', value: 'Net 15' },
                  { label: 'Net 45 Days', value: 'Net 45' },
                  { label: 'Immediate on Delivery', value: 'Immediate' },
                  { label: 'Advance 50%', value: 'Advance 50%' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Credit Limit (₹) *"
                type="number"
                value={formCreditLimit}
                onChange={(e) => setFormCreditLimit(e.target.value)}
                required
              />
              <Select
                label="Account Status *"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                options={[
                  { label: 'Active Trade Partner', value: 'active' },
                  { label: 'Prospect (Lead)', value: 'prospect' },
                  { label: 'Inactive / On Hold', value: 'inactive' },
                ]}
              />
            </div>

            <div>
              <Input
                label="Billing / Registered Office Address *"
                placeholder="e.g. Shop 18, Marble Market, Sector 9, Noida - 201301"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                required
              />
            </div>

            <div>
              <Input
                label="Shipping / Delivery Warehouse Address"
                placeholder="e.g. Godown 4, Sector 10 Transport Nagar, Noida - 201301"
                value={formShippingAddress}
                onChange={(e) => setFormShippingAddress(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" type="button" onClick={() => setModalMode(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" icon={<Check className="w-4 h-4" />}>
                {modalMode === 'add' ? 'Save New Customer' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
