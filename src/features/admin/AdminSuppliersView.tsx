import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Supplier } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select, SearchInput } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import {
  Truck,
  Building2,
  Plus,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Star,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  ShieldCheck,
  Package,
  Layers,
  History,
  Info,
  Check,
  Copy,
  X,
  Boxes,
  Send,
} from 'lucide-react';
import { CreatePurchaseOrderModal } from './CreatePurchaseOrderModal';

export const AdminSuppliersView: React.FC = () => {
  const {
    suppliers,
    products,
    purchaseOrders,
    receivingDiscrepancies,
    inwardReceipts,
    currentUser,
    createSupplier,
    updateSupplier,
    approvePurchaseOrder,
    sendPurchaseOrderToSupplier,
  } = useErpStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'blacklisted'>('all');
  const [paymentTermsFilter, setPaymentTermsFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'overview' | 'products' | 'orders' | 'quality'>('overview');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreatePoOpen, setIsCreatePoOpen] = useState(false);

  // Add / Edit Modal States
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('Net 30');
  const [formRating, setFormRating] = useState('4.8');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive' | 'blacklisted'>('active');
  const [formBankName, setFormBankName] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formIfscCode, setFormIfscCode] = useState('');
  const [formBranch, setFormBranch] = useState('');
  const [formSelectedProducts, setFormSelectedProducts] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // KPI Calculations
  const totalSuppliersCount = suppliers.length;
  const activeSuppliersCount = suppliers.filter((s) => s.status === 'active').length;
  const totalSourcedValue = suppliers.reduce((sum, s) => sum + (s.totalPurchasesAmount || 0), 0);
  const totalPayables = suppliers.reduce((sum, s) => sum + (s.outstandingPayable || 0), 0);

  // Filtered Suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.gstin && s.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesTerms = paymentTermsFilter === 'all' || s.paymentTerms.toLowerCase().includes(paymentTermsFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesTerms;
  });

  const paginatedSuppliers = filteredSuppliers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenAdd = () => {
    const nextCodeNum = totalSuppliersCount + 1;
    const codePref = `SUP-VND-0${nextCodeNum}`;
    setFormName('');
    setFormCode(codePref);
    setFormContactPerson('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormGstin('');
    setFormPaymentTerms('Net 30');
    setFormRating('4.5');
    setFormStatus('active');
    setFormBankName('');
    setFormAccountNumber('');
    setFormIfscCode('');
    setFormBranch('');
    setFormSelectedProducts([]);
    setFormErrors({});
    setEditingSupplierId(null);
    setModalMode('add');
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplierId(s.id);
    setFormName(s.name);
    setFormCode(s.code || s.supplierCode || '');
    setFormContactPerson(s.contactPerson);
    setFormPhone(s.phone);
    setFormEmail(s.email);
    setFormAddress(s.address);
    setFormGstin(s.gstin || '');
    setFormPaymentTerms(s.paymentTerms);
    setFormRating((s.rating || 4.5).toString());
    setFormStatus(s.status);
    setFormBankName(s.bankDetails?.bankName || '');
    setFormAccountNumber(s.bankDetails?.accountNumber || '');
    setFormIfscCode(s.bankDetails?.ifscCode || '');
    setFormBranch(s.bankDetails?.branch || '');
    setFormSelectedProducts(s.suppliedProductIds || []);
    setFormErrors({});
    setModalMode('edit');
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formName.trim()) errs.name = 'Supplier / Vendor business name is required.';
    if (!formContactPerson.trim()) errs.contactPerson = 'Contact representative name is required.';
    if (!formPhone.trim()) errs.phone = 'Phone number is required.';
    if (!formEmail.trim() || !formEmail.includes('@')) errs.email = 'Valid commercial email is required.';
    if (!formAddress.trim()) errs.address = 'Office / warehouse address is required.';
    if (formGstin.trim() && formGstin.trim().length !== 15) {
      errs.gstin = 'GSTIN format must be exactly 15 alphanumeric characters (e.g. 27AAACT2727Q1ZW).';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const selectedProductNames = products
      .filter((p) => formSelectedProducts.includes(p.id))
      .map((p) => p.name);

    if (modalMode === 'add') {
      const created = createSupplier({
        name: formName.trim(),
        code: formCode.trim().toUpperCase() || `SUP-NEW-${Date.now().toString().slice(-3)}`,
        contactPerson: formContactPerson.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        address: formAddress.trim(),
        gstin: formGstin.trim().toUpperCase() || undefined,
        paymentTerms: formPaymentTerms,
        rating: parseFloat(formRating) || 4.5,
        status: formStatus,
        bankDetails: formBankName
          ? {
              bankName: formBankName.trim(),
              accountNumber: formAccountNumber.trim(),
              ifscCode: formIfscCode.trim().toUpperCase(),
              branch: formBranch.trim(),
            }
          : undefined,
        suppliedProductIds: formSelectedProducts,
        suppliedProductNames: selectedProductNames,
      });
      showToast(`Supplier "${created.name}" created successfully (Simulated Master Update).`);
    } else if (modalMode === 'edit' && editingSupplierId) {
      updateSupplier(editingSupplierId, {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        contactPerson: formContactPerson.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        address: formAddress.trim(),
        gstin: formGstin.trim().toUpperCase() || undefined,
        paymentTerms: formPaymentTerms,
        rating: parseFloat(formRating) || 4.5,
        status: formStatus,
        bankDetails: formBankName
          ? {
              bankName: formBankName.trim(),
              accountNumber: formAccountNumber.trim(),
              ifscCode: formIfscCode.trim().toUpperCase(),
              branch: formBranch.trim(),
            }
          : undefined,
        suppliedProductIds: formSelectedProducts,
        suppliedProductNames: selectedProductNames,
      });

      if (selectedSupplier && selectedSupplier.id === editingSupplierId) {
        setSelectedSupplier({
          ...selectedSupplier,
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          contactPerson: formContactPerson.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim(),
          address: formAddress.trim(),
          gstin: formGstin.trim().toUpperCase() || undefined,
          paymentTerms: formPaymentTerms,
          rating: parseFloat(formRating) || 4.5,
          status: formStatus,
          suppliedProductIds: formSelectedProducts,
          suppliedProductNames: selectedProductNames,
        });
      }
      showToast(`Supplier "${formName.trim()}" updated successfully.`);
    }

    setModalMode(null);
  };

  const handleToggleStatus = (s: Supplier) => {
    const newStatus = s.status === 'active' ? 'inactive' : 'active';
    updateSupplier(s.id, { status: newStatus });
    if (selectedSupplier && selectedSupplier.id === s.id) {
      setSelectedSupplier({ ...selectedSupplier, status: newStatus });
    }
    showToast(`Supplier "${s.name}" set to ${newStatus.toUpperCase()}`);
  };

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

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="purple" size="sm">Procurement &amp; Vendor Master</Badge>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">ISO 9001 Sourcing Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            Suppliers &amp; Vendor Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Centralized vendor registry managing raw material suppliers, contractual payment terms, bank settlement profiles, and discrepancy track records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            icon={<Plus className="w-4 h-4" />}
          >
            Add New Supplier
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Suppliers */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Registered Vendors
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {totalSuppliersCount}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> {activeSuppliersCount} Active Contracted
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Total Sourced Value */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Cumulative Purchases
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              ₹{(totalSourcedValue / 10000000).toFixed(2)} Cr
            </div>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
              FY 2026-27 Sourcing Run-Rate
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Outstanding Payables */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Accounts Payable (A/P)
            </span>
            <div className="text-2xl font-bold text-rose-700 mt-1">
              ₹{(totalPayables / 100000).toFixed(2)} L
            </div>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
              Within Scheduled Credit Terms
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* Quality & Discrepancy Performance */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Discrepancy Variance
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-1.5">
              1.8%
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Low Risk
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
              Avg Inbound Shortage &amp; Damage
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by vendor name, code, contact person, or GSTIN..."
        />

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="glass-input rounded-xl px-3 py-1.5 text-xs text-slate-800 bg-white cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive</option>
            <option value="blacklisted">Blacklisted</option>
          </select>

          {/* Payment Terms Filter */}
          <select
            value={paymentTermsFilter}
            onChange={(e) => setPaymentTermsFilter(e.target.value)}
            className="glass-input rounded-xl px-3 py-1.5 text-xs text-slate-800 bg-white cursor-pointer"
          >
            <option value="all">All Payment Terms</option>
            <option value="Net 30">Net 30 Days</option>
            <option value="Net 45">Net 45 Days</option>
            <option value="Advance">Advance / Partial</option>
          </select>
        </div>
      </div>

      {/* Main Suppliers Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Suppliers &amp; Raw Material Vendors ({filteredSuppliers.length})</CardTitle>
            <CardDescription>
              Click any vendor row to open the complete details drawer with product assignments, bank details, and purchase order history.
            </CardDescription>
          </div>
          <Badge variant="neutral" size="sm">
            {filteredSuppliers.filter((s) => s.status === 'active').length} of {filteredSuppliers.length} Active
          </Badge>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                <th className="py-3 px-4">Supplier Code &amp; Name</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4">Key Contact &amp; Communication</th>
                <th className="py-3 px-4">GSTIN &amp; Location</th>
                <th className="py-3 px-4">Payment Terms &amp; Banking</th>
                <th className="py-3 px-4 text-center">Sourced Products</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-sm text-slate-700">No suppliers found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No vendor profiles matched "{searchTerm}". Try clearing your filters or add a new supplier.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setPaymentTermsFilter('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((s) => {
                  const linkedProducts = products.filter(
                    (p) => p.supplierId === s.id || (s.suppliedProductIds && s.suppliedProductIds.includes(p.id))
                  );
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/90 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedSupplier(s);
                        setActiveDrawerTab('overview');
                      }}
                    >
                      {/* Code & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {s.code.slice(4, 7) || 'SUP'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors block">
                              {s.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/90 px-1.5 py-0.2 rounded select-all">
                                {s.code}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(s.code);
                                  setCopiedId(s.id);
                                  setTimeout(() => setCopiedId(null), 2000);
                                }}
                                className="p-0.5 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                                title="Copy Supplier ID"
                              >
                                {copiedId === s.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-amber-500 font-bold font-mono text-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{s.rating ? s.rating.toFixed(1) : '4.5'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-normal">Tier 1 Approved</span>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{s.contactPerson}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1 font-mono text-[10px]">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            {s.phone}
                          </span>
                        </div>
                        <div className="text-[10px] text-indigo-600 font-mono truncate max-w-[180px]">
                          {s.email}
                        </div>
                      </td>

                      {/* Location & GSTIN */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-[11px] font-bold text-slate-800">
                          {s.gstin || 'Unregistered'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 max-w-[200px] truncate" title={s.address}>
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{s.address.split(',').slice(-2).join(',').trim()}</span>
                        </div>
                      </td>

                      {/* Payment Terms & Bank */}
                      <td className="py-3.5 px-4">
                        <Badge variant="purple" size="sm">
                          {s.paymentTerms}
                        </Badge>
                        <div className="text-[10px] text-slate-500 font-mono mt-1">
                          {s.bankDetails ? `${s.bankDetails.bankName} (A/C: ...${s.bankDetails.accountNumber.slice(-4)})` : 'Bank on file'}
                        </div>
                      </td>

                      {/* Sourced Products */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-bold font-mono text-[11px]">
                          <Boxes className="w-3.5 h-3.5 text-slate-500" />
                          <span>{linkedProducts.length} items</span>
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(s)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors border ${
                            s.status === 'active'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Click to toggle Active / Inactive"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {s.status === 'active' ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(s)}
                          icon={<Edit2 className="w-3.5 h-3.5 text-slate-600" />}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSupplier(s);
                            setActiveDrawerTab('overview');
                          }}
                          icon={<ExternalLink className="w-3.5 h-3.5" />}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredSuppliers.length > pageSize && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/40">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredSuppliers.length / pageSize)}
              totalItems={filteredSuppliers.length}
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

      {/* SUPPLIER DETAILS DRAWER / MODAL */}
      {selectedSupplier && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSupplier(null)}
          title={`Supplier Profile: ${selectedSupplier.name}`}
          description={`Vendor Code: ${selectedSupplier.code} | Registered Status: ${selectedSupplier.status.toUpperCase()}`}
        >
          <div className="space-y-4 text-xs">
            {/* Header Identity Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-md">
                    {selectedSupplier.code.slice(4, 7) || 'SUP'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{selectedSupplier.name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                        <span>ID: {selectedSupplier.code}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedSupplier.code);
                            setCopiedId(selectedSupplier.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 cursor-pointer"
                          title="Copy Supplier ID"
                        >
                          {copiedId === selectedSupplier.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </span>
                      <span className="text-slate-300">•</span>
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{selectedSupplier.rating ? selectedSupplier.rating.toFixed(1) : '4.5'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={selectedSupplier.status === 'active' ? 'success' : 'neutral'}>
                    {selectedSupplier.status.toUpperCase()}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const curr = selectedSupplier;
                      setSelectedSupplier(null);
                      handleOpenEdit(curr);
                    }}
                    icon={<Edit2 className="w-3.5 h-3.5" />}
                  >
                    Edit Profile
                  </Button>
                </div>
              </div>

              {/* Financial snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-200/80">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Sourced</span>
                  <span className="font-bold font-mono text-slate-900 text-sm">
                    ₹{(selectedSupplier.totalPurchasesAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">A/P Balance</span>
                  <span className="font-bold font-mono text-rose-700 text-sm">
                    ₹{(selectedSupplier.outstandingPayable || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Terms</span>
                  <span className="font-bold text-indigo-700">{selectedSupplier.paymentTerms}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Registered Date</span>
                  <span className="font-bold text-slate-700">{selectedSupplier.createdAt}</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs inside Drawer */}
            <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
              <button
                onClick={() => setActiveDrawerTab('overview')}
                className={`pb-2 transition-colors ${
                  activeDrawerTab === 'overview'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Contact &amp; Banking
              </button>
              <button
                onClick={() => setActiveDrawerTab('products')}
                className={`pb-2 transition-colors ${
                  activeDrawerTab === 'products'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Sourced Catalog ({products.filter((p) => p.supplierId === selectedSupplier.id || (selectedSupplier.suppliedProductIds && selectedSupplier.suppliedProductIds.includes(p.id))).length})
              </button>
              <button
                onClick={() => setActiveDrawerTab('orders')}
                className={`pb-2 transition-colors ${
                  activeDrawerTab === 'orders'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                3. Purchase Orders ({purchaseOrders.filter((po) => po.supplierId === selectedSupplier.id).length})
              </button>
              <button
                onClick={() => setActiveDrawerTab('quality')}
                className={`pb-2 transition-colors ${
                  activeDrawerTab === 'quality'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                4. Quality &amp; Discrepancies
              </button>
            </div>

            {/* TAB 1: OVERVIEW & CONTACT */}
            {activeDrawerTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Commercial Contact Card */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Commercial Representative
                    </span>
                    <div className="font-semibold text-sm text-slate-900">{selectedSupplier.contactPerson}</div>
                    <div className="space-y-1 pt-1 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{selectedSupplier.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-indigo-600">{selectedSupplier.email}</span>
                      </div>
                      <div className="flex items-start gap-2 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{selectedSupplier.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Statutory & Tax Profile */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Tax &amp; Compliance Details
                    </span>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">GSTIN Registration:</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {selectedSupplier.gstin || 'Not Provided / SEZ Exempt'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Contractual Terms:</span>
                        <span className="font-bold text-slate-800">{selectedSupplier.paymentTerms}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Vendor Rating:</span>
                        <span className="font-bold text-emerald-700">
                          {selectedSupplier.rating ? `${selectedSupplier.rating} / 5.0 (High Reliability)` : 'Standard'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank Settlement Profile */}
                <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <span>Designated Electronic Wire / NEFT Bank Account</span>
                  </div>
                  {selectedSupplier.bankDetails ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-slate-700">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Bank Name:</span>
                        <span className="font-bold">{selectedSupplier.bankDetails.bankName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Account Number:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {selectedSupplier.bankDetails.accountNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">IFSC Code:</span>
                        <span className="font-mono font-bold text-indigo-700">
                          {selectedSupplier.bankDetails.ifscCode}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Branch Location:</span>
                        <span className="font-medium">{selectedSupplier.bankDetails.branch}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">No bank details recorded yet for this supplier.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: SOURCED PRODUCTS CATALOG */}
            {activeDrawerTab === 'products' && (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500">
                  Products configured with this supplier as the primary source in Product Master:
                </p>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {products.filter(
                    (p) =>
                      p.supplierId === selectedSupplier.id ||
                      (selectedSupplier.suppliedProductIds && selectedSupplier.suppliedProductIds.includes(p.id))
                  ).length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      No products mapped to this supplier yet. You can assign products in Product Master or by editing this supplier.
                    </div>
                  ) : (
                    products
                      .filter(
                        (p) =>
                          p.supplierId === selectedSupplier.id ||
                          (selectedSupplier.suppliedProductIds && selectedSupplier.suppliedProductIds.includes(p.id))
                      )
                      .map((p) => (
                        <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-600">{p.sku}</span>
                              <span className="font-semibold text-slate-900">{p.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {p.categoryName} • Unit: {p.unit}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-rose-700 block">
                              PO: ₹{(p.standardPurchaseCost || Math.round(p.actualCost * 0.95)).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400">Standard Landed: ₹{p.actualCost.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: PURCHASE ORDERS */}
            {activeDrawerTab === 'orders' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-500">
                    Purchase Orders issued to {selectedSupplier.name}:
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreatePoOpen(true)}
                    icon={<Plus className="w-3.5 h-3.5 text-indigo-600" />}
                  >
                    Issue Purchase Order
                  </Button>
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {purchaseOrders.filter((po) => po.supplierId === selectedSupplier.id).length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      No purchase orders recorded yet for this supplier.
                    </div>
                  ) : (
                    purchaseOrders
                      .filter((po) => po.supplierId === selectedSupplier.id)
                      .map((po) => (
                        <div key={po.id} className="p-3 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-600">{po.poNumber}</span>
                              <Badge
                                size="sm"
                                variant={
                                  po.status === 'fully_received'
                                    ? 'success'
                                    : po.status === 'partially_received'
                                    ? 'warning'
                                    : po.status === 'approved' || po.status === 'sent_to_supplier'
                                    ? 'purple'
                                    : po.status === 'rejected'
                                    ? 'danger'
                                    : 'neutral'
                                }
                              >
                                {po.status.replace(/_/g, ' ').toUpperCase()}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Order Date: {po.orderDate} • Expected: {po.expectedDeliveryDate} • Dest: {po.destinationWarehouseId}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-mono font-bold text-slate-900 block">
                                ₹{(po.totalCost || po.totalAmount || 0).toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-slate-400">{po.lines.length} Line items</span>
                            </div>

                            {/* PO Action Buttons based on lifecycle */}
                            {po.status === 'pending_approval' && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  approvePurchaseOrder(po.id, currentUser.name, 'Approved from Supplier View');
                                  showToast(`PO ${po.poNumber} approved successfully.`);
                                }}
                              >
                                Approve PO
                              </Button>
                            )}

                            {po.status === 'approved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  sendPurchaseOrderToSupplier(po.id);
                                  showToast(`PO ${po.poNumber} sent to supplier.`);
                                }}
                                icon={<Send className="w-3 h-3 text-indigo-600" />}
                              >
                                Send to Supplier
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: QUALITY & DISCREPANCIES */}
            {activeDrawerTab === 'quality' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 text-amber-950 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold flex items-center gap-1.5 text-xs text-amber-900">
                      <ShieldCheck className="w-4 h-4 text-amber-600" /> Vendor Quality Scorecard
                    </span>
                    <p className="text-[11px] text-amber-800">
                      Track record for physical count variances, transport leakage, and debit note settlements.
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-lg text-amber-950">
                    {selectedSupplier.rating ? `${(selectedSupplier.rating * 20).toFixed(0)}%` : '96%'}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {receivingDiscrepancies.filter((d) => d.supplierId === selectedSupplier.id || d.supplierName === selectedSupplier.name).length === 0 ? (
                    <div className="p-6 text-center text-slate-400 flex flex-col items-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1" />
                      <p className="font-semibold text-slate-700">Perfect Inward Delivery Record</p>
                      <p className="text-[11px] text-slate-400">Zero active shortages or damaged cargo flagged for this supplier.</p>
                    </div>
                  ) : (
                    receivingDiscrepancies
                      .filter((d) => d.supplierId === selectedSupplier.id || d.supplierName === selectedSupplier.name)
                      .map((d) => (
                        <div key={d.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-rose-700">{d.discrepancyNumber || d.id}</span>
                              <Badge size="sm" variant={d.status === 'resolved' ? 'success' : 'danger'}>
                                {d.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {d.productName} • Shortage: {d.shortageQuantity} | Damaged: {d.damagedQuantity}
                            </div>
                            {d.reason && (
                              <p className="text-[10px] text-slate-600 italic">"{d.reason}"</p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-slate-400 block">
                              Ref: {d.receiptNumber}
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <Button
                variant={selectedSupplier.status === 'active' ? 'danger' : 'outline'}
                size="sm"
                onClick={() => handleToggleStatus(selectedSupplier)}
              >
                {selectedSupplier.status === 'active' ? 'Deactivate Supplier' : 'Activate Supplier'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedSupplier(null)}>
                Close Drawer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ADD / EDIT SUPPLIER MODAL */}
      {modalMode && (
        <Modal
          isOpen={true}
          onClose={() => setModalMode(null)}
          title={modalMode === 'add' ? 'Register New Supplier / Vendor' : `Edit Supplier: ${formName}`}
          description="Maintain comprehensive vendor profile with GSTIN, contractual payment terms, and banking settlement details."
        >
          <form onSubmit={handleSaveSupplier} className="space-y-4 text-xs">
            {/* Business Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Input
                  label="Supplier / Vendor Legal Name *"
                  placeholder="e.g. Tata Steel & Industrial Polymers Ltd"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
                {formErrors.name && <p className="text-[10px] text-rose-600 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <Input
                  label="Supplier Code *"
                  placeholder="e.g. SUP-TAT-01"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Representative & Contacts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Input
                  label="Contact Representative *"
                  placeholder="e.g. Mr. Rajesh Gupta"
                  value={formContactPerson}
                  onChange={(e) => setFormContactPerson(e.target.value)}
                  required
                />
                {formErrors.contactPerson && <p className="text-[10px] text-rose-600 mt-1">{formErrors.contactPerson}</p>}
              </div>

              <div>
                <Input
                  label="Phone / Mobile *"
                  placeholder="e.g. +91-22-6660-1234"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  required
                />
                {formErrors.phone && <p className="text-[10px] text-rose-600 mt-1">{formErrors.phone}</p>}
              </div>

              <div>
                <Input
                  label="Commercial Email *"
                  type="email"
                  placeholder="e.g. orders@tatasteel.demo"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                />
                {formErrors.email && <p className="text-[10px] text-rose-600 mt-1">{formErrors.email}</p>}
              </div>
            </div>

            {/* Address */}
            <div>
              <Input
                label="Registered Office & Factory Address *"
                placeholder="e.g. Bombay House, 24 Homi Mody Street, Fort, Mumbai - 400001"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                required
              />
              {formErrors.address && <p className="text-[10px] text-rose-600 mt-1">{formErrors.address}</p>}
            </div>

            {/* Tax & Commercial Terms */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Input
                  label="GSTIN Number (15 Characters)"
                  placeholder="e.g. 27AAACT2727Q1ZW"
                  value={formGstin}
                  onChange={(e) => setFormGstin(e.target.value)}
                />
                {formErrors.gstin && <p className="text-[10px] text-rose-600 mt-1">{formErrors.gstin}</p>}
              </div>

              <Select
                label="Payment Terms *"
                value={formPaymentTerms}
                onChange={(e) => setFormPaymentTerms(e.target.value)}
                options={[
                  { label: 'Net 30 Days', value: 'Net 30' },
                  { label: 'Net 15 Days', value: 'Net 15' },
                  { label: 'Net 45 Days', value: 'Net 45' },
                  { label: 'Advance 50% / Net 15', value: 'Advance 50% / Net 15' },
                  { label: '100% Advance Payment', value: '100% Advance' },
                  { label: 'Immediate on Receipt', value: 'Immediate' },
                ]}
              />

              <Select
                label="Status *"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                options={[
                  { label: 'Active Contracted', value: 'active' },
                  { label: 'Inactive / On Hold', value: 'inactive' },
                  { label: 'Blacklisted (QC Failure)', value: 'blacklisted' },
                ]}
              />
            </div>

            {/* Banking Details Header */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Banking Settlement Profile (For Wire Payments)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Bank Name"
                  placeholder="e.g. State Bank of India"
                  value={formBankName}
                  onChange={(e) => setFormBankName(e.target.value)}
                />
                <Input
                  label="Account Number"
                  placeholder="e.g. 309988112233"
                  value={formAccountNumber}
                  onChange={(e) => setFormAccountNumber(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="IFSC Code"
                  placeholder="e.g. SBIN0000300"
                  value={formIfscCode}
                  onChange={(e) => setFormIfscCode(e.target.value)}
                />
                <Input
                  label="Branch"
                  placeholder="e.g. Mumbai Main Branch"
                  value={formBranch}
                  onChange={(e) => setFormBranch(e.target.value)}
                />
              </div>
            </div>

            {/* Product Sourcing Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Assign Products Supplied by this Vendor (Catalog Mapping)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-white">
                {products.map((p) => {
                  const isChecked = formSelectedProducts.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-indigo-300 bg-indigo-50/50 text-indigo-900 font-semibold'
                          : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setFormSelectedProducts(formSelectedProducts.filter((id) => id !== p.id));
                          } else {
                            setFormSelectedProducts([...formSelectedProducts, p.id]);
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="truncate">
                        <span className="font-mono text-[10px] text-slate-500 mr-1">{p.sku}</span>
                        {p.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" type="button" onClick={() => setModalMode(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" icon={<Check className="w-4 h-4" />}>
                {modalMode === 'add' ? 'Save New Supplier' : 'Save Profile Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Purchase Order Modal */}
      {isCreatePoOpen && (
        <CreatePurchaseOrderModal
          isOpen={isCreatePoOpen}
          onClose={() => setIsCreatePoOpen(false)}
          initialSupplierId={selectedSupplier?.id}
          onCreated={(po) => showToast(`Purchase Order ${po.poNumber} created successfully!`)}
        />
      )}
    </div>
  );
};
