import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { ExpenseClaim, ExpenseCategory, UserRole } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, SearchInput } from '../../components/ui/Input';
import {
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  Building,
  Car,
  Utensils,
  Hotel,
  Users,
  Gift,
  Wrench,
  Search,
  Filter,
  DollarSign,
  Briefcase,
  Compass,
  ArrowRight,
  ShieldCheck,
  Send,
  Download,
  FileText,
  AlertTriangle,
  Truck,
  Package,
  Plus,
  Check,
  Copy,
  Wallet,
  Eye,
  ChevronRight,
  UserCheck,
  Layers,
} from 'lucide-react';

export const FieldExpensesSettlement: React.FC = () => {
  const {
    expenseClaims,
    users,
    regions,
    customerDispatches,
    customers,
    walletTransactions,
    currentUser,
    approveExpenseClaim,
    rejectExpenseClaim,
    settleExpenseClaim,
    batchSettleClaims,
    allocateWalletFunds,
    submitExpenseClaim,
    addDispatchDeliveryExpense,
  } = useErpStore();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'claims' | 'dispatches' | 'wallets'>('claims');

  // Filters
  const [roleFilter, setRoleFilter] = useState<'all' | 'sales' | 'marketing' | 'store_manager' | 'operations'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');

  // Multi-selection for batch settlement
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Settle Payment Modal State
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [paymentMode, setPaymentMode] = useState<'bank_transfer' | 'upi' | 'wallet_credit' | 'petty_cash'>('bank_transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNotes, setSettleNotes] = useState('');

  // Batch Settle Modal State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchPaymentMode, setBatchPaymentMode] = useState<'bank_transfer' | 'upi' | 'wallet_credit' | 'petty_cash'>('bank_transfer');
  const [batchPaymentRef, setBatchPaymentRef] = useState('');

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [claimToReject, setClaimToReject] = useState<ExpenseClaim | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Proof Preview Modal State
  const [proofClaim, setProofClaim] = useState<ExpenseClaim | null>(null);

  // Allocate Wallet Funds Modal State
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState(users[0]?.id || '');
  const [allocationAmount, setAllocationAmount] = useState('10000');
  const [allocationNotes, setAllocationNotes] = useState('Operational Field Allotment');
  const [isAllocating, setIsAllocating] = useState(false);

  // New Expense Claim Modal State
  const [newExpenseModalOpen, setNewExpenseModalOpen] = useState(false);
  const [expUserId, setExpUserId] = useState(currentUser.id);
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('travel');
  const [expAmount, setExpAmount] = useState('1500');
  const [expDescription, setExpDescription] = useState('');
  const [expLinkedCustomerId, setExpLinkedCustomerId] = useState('');
  const [expLinkedDispatchId, setExpLinkedDispatchId] = useState('');
  const [expProofType, setExpProofType] = useState<'receipt' | 'invoice' | 'bill' | 'statement'>('receipt');
  const [expAttachment, setExpAttachment] = useState('expense_voucher.pdf');

  // Filter Claims across all roles
  const filteredClaims = expenseClaims.filter((c) => {
    const matchesRole = roleFilter === 'all' || c.userRole === roleFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    const matchesRegion = regionFilter === 'all' || c.regionId === regionFilter;
    const matchesSearch =
      c.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.linkedDispatchId && c.linkedDispatchId.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesRole && matchesStatus && matchesCategory && matchesRegion && matchesSearch;
  });

  // Calculate Aggregates
  const totalClaimsCount = expenseClaims.length;
  const pendingClaims = expenseClaims.filter((c) => c.status === 'submitted' || c.status === 'approved');
  const pendingAmount = pendingClaims.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalSettledAmount = expenseClaims
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalWalletBalances = users.reduce((sum, u) => sum + (u.walletBalance || 0), 0);

  // Category Icon Mapper
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'fuel':
      case 'travel':
        return <Car className="w-3.5 h-3.5 text-blue-600" />;
      case 'accommodation':
        return <Hotel className="w-3.5 h-3.5 text-indigo-600" />;
      case 'food':
        return <Utensils className="w-3.5 h-3.5 text-amber-600" />;
      case 'customer_meeting':
        return <Users className="w-3.5 h-3.5 text-emerald-600" />;
      case 'sample_promotion':
        return <Gift className="w-3.5 h-3.5 text-purple-600" />;
      case 'transportation_freight':
        return <Truck className="w-3.5 h-3.5 text-emerald-600" />;
      case 'loading_unloading':
      case 'delivery_manpower':
        return <Package className="w-3.5 h-3.5 text-orange-600" />;
      case 'packaging_handling':
      case 'tolls_parking':
        return <Car className="w-3.5 h-3.5 text-slate-600" />;
      default:
        return <Receipt className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    return category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getStatusBadge = (status: ExpenseClaim['status']) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="warning">Pending Review</Badge>;
      case 'approved':
        return <Badge variant="purple">Approved (Pending Payout)</Badge>;
      case 'paid':
        return <Badge variant="success">Paid &amp; Settled</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'draft':
      default:
        return <Badge variant="neutral">Draft</Badge>;
    }
  };

  // Selection handlers
  const handleSelectClaim = (claimId: string) => {
    setSelectedClaimIds((prev) =>
      prev.includes(claimId) ? prev.filter((id) => id !== claimId) : [...prev, claimId]
    );
  };

  const selectAllFiltered = () => {
    const pendingIds = filteredClaims
      .filter((c) => c.status === 'submitted' || c.status === 'approved')
      .map((c) => c.id);
    setSelectedClaimIds(pendingIds);
  };

  const clearSelection = () => {
    setSelectedClaimIds([]);
  };

  // Open Settle Modal
  const handleOpenSettle = (claim: ExpenseClaim) => {
    setSelectedClaim(claim);
    setSettleAmount(claim.amount.toString());
    setPaymentRef(`TXN-${Date.now().toString().slice(-6)}`);
    setSettleNotes(`Direct reimbursement payment for ${claim.claimNumber}`);
    setSettleModalOpen(true);
  };

  const handleConfirmSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;

    settleExpenseClaim(
      selectedClaim.id,
      paymentMode,
      paymentRef,
      parseFloat(settleAmount) || selectedClaim.amount,
      settleNotes
    );

    showToast(`Claim ${selectedClaim.claimNumber} settled successfully.`);
    setSettleModalOpen(false);
    setSelectedClaim(null);
  };

  // Open Batch Settle Modal
  const handleOpenBatchSettle = () => {
    setBatchPaymentRef(`BATCH-TXN-${Date.now().toString().slice(-6)}`);
    setBatchModalOpen(true);
  };

  const handleConfirmBatchSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClaimIds.length === 0) return;

    batchSettleClaims(selectedClaimIds, batchPaymentMode, batchPaymentRef);
    showToast(`Batch settled ${selectedClaimIds.length} expense claims.`);
    setSelectedClaimIds([]);
    setBatchModalOpen(false);
  };

  // Open Reject Modal
  const handleOpenReject = (claim: ExpenseClaim) => {
    setClaimToReject(claim);
    setRejectReason('Insufficient supporting receipt details or out-of-policy expense.');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimToReject) return;

    rejectExpenseClaim(claimToReject.id, rejectReason);
    showToast(`Claim ${claimToReject.claimNumber} rejected.`);
    setRejectModalOpen(false);
    setClaimToReject(null);
  };

  // Confirm Wallet Funds Allocation
  const handleConfirmAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAllocating) return; // Prevent double clicks
    const amt = parseFloat(allocationAmount);
    if (!targetUserId || !amt || amt <= 0) return;

    setIsAllocating(true);
    const res = allocateWalletFunds(targetUserId, amt, allocationNotes);
    setIsAllocating(false);

    if (res.success) {
      showToast(res.message);
      setAllocateModalOpen(false);
    }
  };

  // Confirm New Expense Claim Submission
  const handleConfirmNewExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = users.find((u) => u.id === expUserId) || currentUser;
    const amt = parseFloat(expAmount) || 0;

    if (amt <= 0 || !expDescription.trim()) return;

    submitExpenseClaim({
      userId: targetUser.id,
      userName: targetUser.name,
      userRole: targetUser.role,
      regionId: targetUser.assignedRegionId !== 'all' ? targetUser.assignedRegionId : 'reg-north',
      date: new Date().toISOString().split('T')[0],
      category: expCategory,
      amount: amt,
      description: expDescription.trim(),
      linkedCustomerId: expLinkedCustomerId || undefined,
      linkedDispatchId: expLinkedDispatchId || undefined,
      proofType: expProofType,
      proofUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
      receiptAttachment: expAttachment,
    });

    showToast(`Expense claim submitted for ${targetUser.name}.`);
    setNewExpenseModalOpen(false);
    setExpDescription('');
  };

  const selectedClaimsTotal = expenseClaims
    .filter((c) => selectedClaimIds.includes(c.id))
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-semibold animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="purple" size="sm">Financial Governance</Badge>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">Enterprise Claims &amp; Dispatches</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            Expense Management &amp; Wallet Desk
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Unified claims audit, customer dispatch delivery cost tracking, and employee wallet balance allocations across Field Sales, Marketing, Store Keepers, and Central Logistics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAllocateModalOpen(true)}
            icon={<Wallet className="w-4 h-4 text-indigo-600" />}
          >
            Allocate Wallet Funds
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setNewExpenseModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Record Expense Claim
          </Button>

          {selectedClaimIds.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenBatchSettle}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Settle Selected ({selectedClaimIds.length}) • ₹{selectedClaimsTotal.toLocaleString('en-IN')}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Approvals</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            ₹{pendingAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {pendingClaims.length} claims awaiting review &amp; disbursement
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Settled</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            ₹{totalSettledAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Disbursed directly across all departments</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dispatch Logistics</span>
            <Truck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            ₹{customerDispatches.reduce((s, d) => s + (d.totalDeliveryExpenses || 0), 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Freight &amp; handling for {customerDispatches.length} customer dispatches
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Field Wallets</span>
            <Wallet className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            ₹{totalWalletBalances.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Live unspent advance held by field personnel
          </p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'claims'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>All Expense Claims ({expenseClaims.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dispatches')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'dispatches'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Dispatch Delivery Expenses ({customerDispatches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wallets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'wallets'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Employee Wallet Profiles &amp; Allocations</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: ALL EXPENSE CLAIMS (ALL ROLES)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          {/* Sub-Filters: Role Scope Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                roleFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
              }`}
            >
              All Roles ({expenseClaims.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('sales')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                roleFilter === 'sales' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Sales ({expenseClaims.filter((c) => c.userRole === 'sales').length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('marketing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                roleFilter === 'marketing' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Marketing ({expenseClaims.filter((c) => c.userRole === 'marketing').length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('store_manager')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                roleFilter === 'store_manager' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Store Keepers ({expenseClaims.filter((c) => c.userRole === 'store_manager').length})
            </button>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by claim #, employee name, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 font-medium focus:outline-none"
              >
                <option value="all">All Payout Statuses</option>
                <option value="submitted">Submitted (Pending Review)</option>
                <option value="approved">Approved (Pending Payout)</option>
                <option value="paid">Paid &amp; Settled</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 font-medium focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="travel">Travel &amp; Transit</option>
                <option value="fuel">Fuel &amp; Mileage</option>
                <option value="food">Food &amp; Meals</option>
                <option value="accommodation">Accommodation &amp; Hotels</option>
                <option value="customer_meeting">Customer Entertainment</option>
                <option value="transportation_freight">Freight &amp; Delivery</option>
                <option value="loading_unloading">Loading &amp; Unloading</option>
                <option value="tolls_parking">Highway Tolls &amp; Parking</option>
              </select>

              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 font-medium focus:outline-none"
              >
                <option value="all">All Territories</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {selectedClaimIds.length > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">
                    {selectedClaimIds.length} Selected (₹{selectedClaimsTotal.toLocaleString('en-IN')})
                  </span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  Select All Pending ({filteredClaims.filter((c) => c.status === 'submitted' || c.status === 'approved').length})
                </button>
              )}
            </div>
          </div>

          {/* Claims Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedClaimIds.length > 0 &&
                          selectedClaimIds.length === filteredClaims.filter((c) => c.status === 'submitted' || c.status === 'approved').length
                        }
                        onChange={(e) => {
                          if (e.target.checked) selectAllFiltered();
                          else clearSelection();
                        }}
                        className="rounded text-indigo-600 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Claim # &amp; Date</th>
                    <th className="py-3 px-4">Employee &amp; Role</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description &amp; Dispatch Link</th>
                    <th className="py-3 px-4">Proof Receipt</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClaims.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">No expense claims match current filters.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredClaims.map((claim) => {
                      const isPending = claim.status === 'submitted';
                      const isApproved = claim.status === 'approved';
                      const isSelected = selectedClaimIds.includes(claim.id);

                      return (
                        <tr
                          key={claim.id}
                          className={`hover:bg-slate-50/90 transition-colors ${
                            isSelected ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            {(isPending || isApproved) && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectClaim(claim.id)}
                                className="rounded text-indigo-600 cursor-pointer"
                              />
                            )}
                          </td>

                          {/* Claim # & Date */}
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-slate-900 block">{claim.claimNumber}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{claim.date}</span>
                          </td>

                          {/* Employee */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{claim.userName}</div>
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                              {claim.userRole.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              {getCategoryIcon(claim.category)}
                              <span className="font-semibold text-slate-700">
                                {getCategoryLabel(claim.category)}
                              </span>
                            </div>
                          </td>

                          {/* Description & Links */}
                          <td className="py-3 px-4 max-w-xs">
                            <p className="text-slate-700 truncate" title={claim.description}>
                              {claim.description}
                            </p>
                            {claim.linkedDispatchId && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Truck className="w-3 h-3 text-emerald-600" />
                                <span className="font-mono font-bold text-[10px] text-emerald-700">
                                  Linked: {claim.linkedDispatchId}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Proof Receipt */}
                          <td className="py-3 px-4">
                            {claim.receiptAttachment || claim.proofUrl ? (
                              <button
                                type="button"
                                onClick={() => setProofClaim(claim)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View Voucher</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No receipt</span>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              ₹{claim.amount.toLocaleString('en-IN')}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            {getStatusBadge(claim.status)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending && (
                                <>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                      approveExpenseClaim(claim.id);
                                      showToast(`Claim ${claim.claimNumber} approved.`);
                                    }}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenReject(claim)}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}

                              {isApproved && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleOpenSettle(claim)}
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                  Disburse Payout
                                </Button>
                              )}

                              {claim.status === 'paid' && (
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                                  Settled ({claim.paymentMethod || 'Bank'})
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: DISPATCH DELIVERY EXPENSES
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'dispatches' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-indigo-600" />
                  Customer Dispatch Logistics &amp; Delivery Freight Ledger
                </CardTitle>
                <CardDescription>
                  Trace stock issued to customers back to originating batch lots and track carrier freight, loading, and transit expenses without double-counting.
                </CardDescription>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Dispatch #</th>
                    <th className="py-3 px-4">Sales Order &amp; Date</th>
                    <th className="py-3 px-4">Customer Account</th>
                    <th className="py-3 px-4">Originating Depot</th>
                    <th className="py-3 px-4">Transporter &amp; Tracking</th>
                    <th className="py-3 px-4">Dispatched Items &amp; Batch</th>
                    <th className="py-3 px-4 text-right">Delivery Expenses</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerDispatches.map((dsp) => (
                    <tr key={dsp.id} className="hover:bg-slate-50/90 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                          {dsp.dispatchNumber}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{dsp.orderNumber}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{dsp.dispatchDate}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{dsp.customerName}</div>
                        <span className="font-mono text-[10px] text-slate-400">ID: {dsp.customerId}</span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {dsp.originatingWarehouseId}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{dsp.transporterName || 'Line Haul Carrier'}</div>
                        <span className="text-[10px] font-mono text-slate-500 block">
                          AWB: {dsp.trackingNumber || 'PENDING-AWB'}
                        </span>
                        {dsp.vehicleNumber && (
                          <span className="text-[9px] font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                            Veh: {dsp.vehicleNumber}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {dsp.items.map((item, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <span className="font-bold text-slate-900 block">{item.productName}</span>
                            <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50/80 px-1.5 py-0.2 rounded border border-indigo-100">
                              Batch: {item.batchNumber} • {item.quantity} {item.unit}
                            </span>
                          </div>
                        ))}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono font-bold text-emerald-700 text-sm">
                          ₹{(dsp.totalDeliveryExpenses || 0).toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={
                            dsp.deliveryStatus === 'delivered'
                              ? 'success'
                              : dsp.deliveryStatus === 'in_transit'
                              ? 'purple'
                              : 'warning'
                          }
                        >
                          {dsp.deliveryStatus.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setExpLinkedDispatchId(dsp.id);
                            setExpLinkedCustomerId(dsp.customerId);
                            setExpCategory('transportation_freight');
                            setExpDescription(`Freight charge for dispatch ${dsp.dispatchNumber}`);
                            setNewExpenseModalOpen(true);
                          }}
                        >
                          + Add Expense
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: EMPLOYEE WALLET PROFILES & ALLOCATIONS
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'wallets' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-indigo-600" />
                  Employee Expense Wallet Master Ledger
                </CardTitle>
                <CardDescription>
                  Audit opening balances, funds allocated by Admin, claims approved/reimbursed, and active balances across all regional staff.
                </CardDescription>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setAllocateModalOpen(true)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Allocate Wallet Funds
              </Button>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department &amp; Role</th>
                    <th className="py-3 px-4">Assigned Territory</th>
                    <th className="py-3 px-4 text-right">Funds Allocated</th>
                    <th className="py-3 px-4 text-right">Claims Approved</th>
                    <th className="py-3 px-4 text-right">Pending Claims</th>
                    <th className="py-3 px-4 text-right">Available Wallet Balance</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const userClaims = expenseClaims.filter((c) => c.userId === u.id);
                    const approvedTotal = userClaims
                      .filter((c) => c.status === 'paid' || c.status === 'approved')
                      .reduce((sum, c) => sum + (c.amount || 0), 0);
                    const pendingTotal = userClaims
                      .filter((c) => c.status === 'submitted')
                      .reduce((sum, c) => sum + (c.amount || 0), 0);
                    const userAllocations = walletTransactions
                      .filter((w) => w.userId === u.id && w.type === 'advance_issued')
                      .reduce((sum, w) => sum + w.amount, 0);

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/90 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                            <div>
                              <div className="font-bold text-slate-900">{u.name}</div>
                              <span className="font-mono text-[10px] text-slate-400">
                                {u.employeeId || 'EMP-GEN'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{u.department || 'Operations'}</div>
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {u.assignedRegionId === 'all' ? 'All Territories' : u.assignedRegionId}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                          ₹{(userAllocations || (u.walletBalance || 0)).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700">
                          ₹{approvedTotal.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-amber-700">
                          ₹{pendingTotal.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-mono font-bold text-indigo-900 text-sm bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                            ₹{(u.walletBalance || 0).toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTargetUserId(u.id);
                              setAllocateModalOpen(true);
                            }}
                          >
                            Allocate Funds
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: SETTLE CLAIM PAYMENT
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={settleModalOpen}
        onClose={() => setSettleModalOpen(false)}
        title="Disburse Expense Reimbursement"
        description="Verify and record payment disbursement reference for this employee claim."
      >
        {selectedClaim && (
          <form onSubmit={handleConfirmSettle} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Claim Reference:</span>
                <span className="font-mono font-bold text-slate-900">{selectedClaim.claimNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Employee Beneficiary:</span>
                <span className="font-bold text-slate-900">{selectedClaim.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Claimed Amount:</span>
                <span className="font-mono font-bold text-indigo-700">₹{selectedClaim.amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
              >
                <option value="bank_transfer">Direct Corporate Bank Transfer (NEFT/RTGS)</option>
                <option value="upi">Corporate UPI Handle</option>
                <option value="wallet_credit">Credit to Employee Field Wallet</option>
                <option value="petty_cash">Depot Petty Cash Voucher</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Reference Number *</label>
              <Input
                placeholder="e.g. UTR-98214412998 or UPI Ref"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setSettleModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                Confirm Disbursement
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: BATCH SETTLEMENT
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        title="Batch Payout Settlement"
        description={`Disburse settlement payouts for ${selectedClaimIds.length} claims totaling ₹${selectedClaimsTotal.toLocaleString('en-IN')}.`}
      >
        <form onSubmit={handleConfirmBatchSettle} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Disbursement Account</label>
            <select
              value={batchPaymentMode}
              onChange={(e) => setBatchPaymentMode(e.target.value as any)}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
            >
              <option value="bank_transfer">SBI Corporate Current A/C (NEFT Batch)</option>
              <option value="wallet_credit">Re-credit to Field Personnel Wallets</option>
              <option value="upi">ICICI Corporate UPI Autopay</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Bank Settlement Ref *</label>
            <Input
              placeholder="e.g. BATCH-NEFT-2026-9912"
              value={batchPaymentRef}
              onChange={(e) => setBatchPaymentRef(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setBatchModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              Authorize Batch Payout
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: REJECT EXPENSE CLAIM
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Expense Claim"
        description="Provide a formal compliance or policy reason for rejecting this claim."
      >
        {claimToReject && (
          <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 rounded-xl space-y-1 border border-rose-200">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Claim Number:</span>
                <span className="font-mono font-bold text-rose-800">{claimToReject.claimNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Amount:</span>
                <span className="font-mono font-bold text-rose-800">₹{claimToReject.amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Rejection Reason *</label>
              <Input
                placeholder="Specify policy violation or missing receipt documentation..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" type="submit">
                Confirm Rejection
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 4: ALLOCATE WALLET FUNDS
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={allocateModalOpen}
        onClose={() => setAllocateModalOpen(false)}
        title="Allocate Employee Wallet Funds"
        description="Disburse corporate operational expense advance directly into an employee's field wallet."
      >
        <form onSubmit={handleConfirmAllocation} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Employee *</label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
              required
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.employeeId || u.role}) — Current Balance: ₹{(u.walletBalance || 0).toLocaleString('en-IN')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Allocation Amount (₹) *</label>
            <Input
              type="number"
              min="1"
              value={allocationAmount}
              onChange={(e) => setAllocationAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose / Allocation Notes *</label>
            <Input
              placeholder="e.g. Monthly travel advance, depot emergency fund, transit tolls"
              value={allocationNotes}
              onChange={(e) => setAllocationNotes(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setAllocateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isAllocating}>
              {isAllocating ? 'Processing...' : 'Confirm Allocation'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 5: SUBMIT NEW EXPENSE CLAIM
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={newExpenseModalOpen}
        onClose={() => setNewExpenseModalOpen(false)}
        title="Record Expense Claim"
        description="File an official employee expense or freight voucher with supporting proof and optional customer/dispatch linkage."
        maxWidth="lg"
      >
        <form onSubmit={handleConfirmNewExpense} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Claiming Employee *</label>
              <select
                value={expUserId}
                onChange={(e) => setExpUserId(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
                required
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Category *</label>
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value as any)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
                required
              >
                <option value="travel">Travel &amp; Public Transit</option>
                <option value="fuel">Fuel &amp; Vehicle Mileage</option>
                <option value="food">Meals &amp; Working Lunch</option>
                <option value="accommodation">Hotel Accommodation</option>
                <option value="customer_meeting">Customer Entertainment</option>
                <option value="transportation_freight">Freight &amp; Carrier Line Haul</option>
                <option value="loading_unloading">Depot Loading &amp; Unloading</option>
                <option value="delivery_manpower">Delivery Driver / Helper Manpower</option>
                <option value="packaging_handling">Pallet Shrink-wrap &amp; Packaging</option>
                <option value="tolls_parking">Highway FASTag Tolls &amp; Parking</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Claim Amount (₹) *</label>
              <Input
                type="number"
                min="1"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Proof Type *</label>
              <select
                value={expProofType}
                onChange={(e) => setExpProofType(e.target.value as any)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
              >
                <option value="receipt">Official Tax Receipt</option>
                <option value="invoice">Carrier GST Invoice</option>
                <option value="bill">Restaurant / Fuel Bill</option>
                <option value="statement">FASTag / Bank Statement Slip</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Description *</label>
            <Input
              placeholder="e.g. Freight paid to VRL logistics for urgent customer shipment"
              value={expDescription}
              onChange={(e) => setExpDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Linked Customer Account (Optional)</label>
              <select
                value={expLinkedCustomerId}
                onChange={(e) => setExpLinkedCustomerId(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
              >
                <option value="">None (General Operational)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Linked Dispatch (Optional)</label>
              <select
                value={expLinkedDispatchId}
                onChange={(e) => setExpLinkedDispatchId(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 bg-white"
              >
                <option value="">None</option>
                {customerDispatches.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.dispatchNumber} — {d.customerName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setNewExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Submit Expense Claim
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 6: PROOF PREVIEW MODAL
      ───────────────────────────────────────────────────────────── */}
      {proofClaim && (
        <Modal
          isOpen={!!proofClaim}
          onClose={() => setProofClaim(null)}
          title={`Supporting Proof Document: ${proofClaim.claimNumber}`}
          description={`Submitted by ${proofClaim.userName} on ${proofClaim.date} for ₹${proofClaim.amount.toLocaleString('en-IN')}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-900 shadow-md">
              <img
                src={proofClaim.proofUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80'}
                alt="Receipt Voucher"
                className="w-full h-64 object-cover opacity-90"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Document Type:</span>
                <span className="font-bold text-slate-900 uppercase">{proofClaim.proofType || 'Official Receipt'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">File Attachment:</span>
                <span className="font-mono font-bold text-indigo-700">{proofClaim.receiptAttachment || 'voucher.pdf'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Claim Category:</span>
                <span className="font-bold text-slate-900">{getCategoryLabel(proofClaim.category)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Audited Amount:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">₹{proofClaim.amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setProofClaim(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FieldExpensesSettlement;
