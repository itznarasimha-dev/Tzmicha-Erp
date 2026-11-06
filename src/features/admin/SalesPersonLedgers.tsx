import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { SalesRemittanceEntry, User } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/Input';
import {
  DollarSign,
  FileCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  UserCheck,
  Users,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  FileText,
  Plus,
  Receipt,
  Landmark,
  CreditCard,
  QrCode,
  Paperclip,
  Download,
  Calendar,
  AlertCircle,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const SalesPersonLedgers: React.FC = () => {
  const {
    salesRemittances,
    users,
    regions,
    customers,
    verifyRemittance,
    flagRemittanceDiscrepancy,
    addRemittanceEntry,
  } = useErpStore();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRepFilter, setSelectedRepFilter] = useState('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedModeFilter, setSelectedModeFilter] = useState('all');

  // Modals
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [selectedEntryForProof, setSelectedEntryForProof] = useState<SalesRemittanceEntry | null>(null);

  const [discrepancyModalOpen, setDiscrepancyModalOpen] = useState(false);
  const [discrepancyReason, setDiscrepancyReason] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRepId, setNewRepId] = useState('');
  const [newType, setNewType] = useState<'collection_from_customer' | 'remittance_to_company'>(
    'remittance_to_company'
  );
  const [newAmount, setNewAmount] = useState('');
  const [newMode, setNewMode] = useState<'cash' | 'cheque' | 'neft_rtgs' | 'upi'>('cash');
  const [newReference, setNewReference] = useState('');
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newCompanyBank, setNewCompanyBank] = useState('HDFC Bank Ltd - A/c 502000889921 (Operations Main)');
  const [newProofName, setNewProofName] = useState('');
  const [newProofType, setNewProofType] = useState<SalesRemittanceEntry['proofType']>('deposit_slip');
  const [newNotes, setNewNotes] = useState('');

  // Sales Role Users
  const salesUsers = useMemo(() => {
    return users.filter((u) => u.role === 'sales');
  }, [users]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalCollected = 0;
    let totalRemitted = 0;
    let pendingVerificationAmount = 0;
    let pendingVerificationCount = 0;
    let discrepancyCount = 0;

    salesRemittances.forEach((entry) => {
      if (entry.type === 'collection_from_customer') {
        totalCollected += entry.amount;
      } else if (entry.type === 'remittance_to_company') {
        if (entry.status === 'verified') {
          totalRemitted += entry.amount;
        } else if (entry.status === 'pending_verification') {
          pendingVerificationAmount += entry.amount;
          pendingVerificationCount++;
        } else if (entry.status === 'discrepancy') {
          discrepancyCount++;
        }
      }
    });

    const netCashInHand = Math.max(0, totalCollected - totalRemitted);

    return {
      totalCollected,
      totalRemitted,
      netCashInHand,
      pendingVerificationAmount,
      pendingVerificationCount,
      discrepancyCount,
    };
  }, [salesRemittances]);

  // Per-Salesperson Summary
  const repLedgers = useMemo(() => {
    return salesUsers.map((rep) => {
      const repEntries = salesRemittances.filter((r) => r.salesUserId === rep.id);
      let collected = 0;
      let remitted = 0;
      let pendingVerification = 0;

      repEntries.forEach((entry) => {
        if (entry.type === 'collection_from_customer') {
          collected += entry.amount;
        } else if (entry.type === 'remittance_to_company') {
          if (entry.status === 'verified') {
            remitted += entry.amount;
          } else if (entry.status === 'pending_verification') {
            pendingVerification += entry.amount;
          }
        }
      });

      const inHand = Math.max(0, collected - remitted);
      const reg = regions.find((r) => r.id === rep.assignedRegionId);

      return {
        rep,
        regionName: reg?.name || 'Global Region',
        totalEntries: repEntries.length,
        collected,
        remitted,
        inHand,
        pendingVerification,
        hasDiscrepancy: repEntries.some((r) => r.status === 'discrepancy'),
      };
    });
  }, [salesUsers, salesRemittances, regions]);

  // Filtered Ledger Entries
  const filteredEntries = useMemo(() => {
    return salesRemittances.filter((entry) => {
      const matchesSearch =
        !searchTerm.trim() ||
        entry.entryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.salesUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.customerName && entry.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.companyBankAccount &&
          entry.companyBankAccount.toLowerCase().includes(searchTerm.toLowerCase())) ||
        entry.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.proofAttachmentName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRep = selectedRepFilter === 'all' || entry.salesUserId === selectedRepFilter;

      const matchesType = selectedTypeFilter === 'all' || entry.type === selectedTypeFilter;

      const matchesStatus = selectedStatusFilter === 'all' || entry.status === selectedStatusFilter;

      const matchesMode = selectedModeFilter === 'all' || entry.paymentMode === selectedModeFilter;

      return matchesSearch && matchesRep && matchesType && matchesStatus && matchesMode;
    });
  }, [
    salesRemittances,
    searchTerm,
    selectedRepFilter,
    selectedTypeFilter,
    selectedStatusFilter,
    selectedModeFilter,
  ]);

  // Handlers
  const handleOpenProofModal = (entry: SalesRemittanceEntry) => {
    setSelectedEntryForProof(entry);
    setProofModalOpen(true);
  };

  const handleVerify = (entry: SalesRemittanceEntry) => {
    verifyRemittance(entry.id);
    if (selectedEntryForProof?.id === entry.id) {
      setSelectedEntryForProof({ ...entry, status: 'verified' });
    }
  };

  const handleOpenDiscrepancyModal = (entry: SalesRemittanceEntry) => {
    setSelectedEntryForProof(entry);
    setDiscrepancyReason('');
    setDiscrepancyModalOpen(true);
  };

  const handleConfirmDiscrepancy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntryForProof || !discrepancyReason.trim()) return;

    flagRemittanceDiscrepancy(selectedEntryForProof.id, discrepancyReason);
    setDiscrepancyModalOpen(false);
    if (proofModalOpen) {
      setSelectedEntryForProof({
        ...selectedEntryForProof,
        status: 'discrepancy',
        discrepancyReason,
      });
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rep = salesUsers.find((u) => u.id === newRepId);
    if (!rep) return;

    const cust = customers.find((c) => c.id === newCustomerId);
    const amountVal = parseFloat(newAmount) || 0;
    if (amountVal <= 0) return;

    addRemittanceEntry({
      date: new Date().toISOString().split('T')[0],
      salesUserId: rep.id,
      salesUserName: rep.name,
      userRole: 'sales',
      regionId: rep.assignedRegionId,
      type: newType,
      customerId: newType === 'collection_from_customer' ? newCustomerId : undefined,
      customerName: newType === 'collection_from_customer' ? cust?.name || 'Customer' : undefined,
      companyBankAccount: newType === 'remittance_to_company' ? newCompanyBank : undefined,
      amount: amountVal,
      paymentMode: newMode,
      referenceNumber: newReference || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      proofAttachmentName:
        newProofName ||
        `${newMode}_proof_${amountVal}_${Date.now().toString().slice(-4)}.${
          newMode === 'neft_rtgs' ? 'pdf' : 'jpg'
        }`,
      proofType: newProofType,
      status: 'pending_verification',
      notes: newNotes,
    });

    setCreateModalOpen(false);
    setNewAmount('');
    setNewReference('');
    setNewProofName('');
    setNewNotes('');
  };

  const getModeBadge = (mode: SalesRemittanceEntry['paymentMode']) => {
    switch (mode) {
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <DollarSign className="w-3 h-3 text-amber-600" /> Cash
          </span>
        );
      case 'cheque':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <FileText className="w-3 h-3 text-blue-600" /> Cheque
          </span>
        );
      case 'neft_rtgs':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <Landmark className="w-3 h-3 text-purple-600" /> NEFT / RTGS
          </span>
        );
      case 'upi':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <QrCode className="w-3 h-3 text-emerald-600" /> UPI
          </span>
        );
      default:
        return <Badge variant="neutral">{mode}</Badge>;
    }
  };

  const getStatusBadge = (status: SalesRemittanceEntry['status']) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified & Credited
          </span>
        );
      case 'pending_verification':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Verification
          </span>
        );
      case 'discrepancy':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Discrepancy Flagged
          </span>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              Sales Collections & Remittance Ledger
            </h1>
            <Badge variant="purple" size="sm">Admin Audit Desk</Badge>
            <Badge variant="success" size="sm">Proof Verification</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
            Reconcile all field payments collected by sales persons from customers, track remittances
            paid into company bank accounts, audit deposit slips & transaction proofs, and eliminate cash leakage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setNewRepId(salesUsers[0]?.id || '');
              setNewCustomerId(customers[0]?.id || '');
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 shadow-sm shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            Record Collection / Remittance
          </Button>
        </div>
      </div>

      {/* Top Reconciled Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Customer Collections
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              ₹{metrics.totalCollected.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Collected by sales reps across all regional accounts
          </p>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Remitted & Credited to Company
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">
              ₹{metrics.totalRemitted.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Bank deposits and RTGS verified in company accounts
          </p>
        </Card>

        <Card className="p-4 border-amber-200/80 bg-gradient-to-br from-amber-50/40 to-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Pending In-Hand Cash Balance
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-900">
              ₹{metrics.netCashInHand.toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-bold text-amber-700">In Rep Possession</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-700">
            Cash collected from dealers awaiting bank deposit
          </p>
        </Card>

        <Card className="p-4 border-purple-200/80 bg-gradient-to-br from-purple-50/40 to-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
              Proofs Audit Queue
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {metrics.pendingVerificationCount} Pending
            </span>
            {metrics.discrepancyCount > 0 && (
              <span className="text-xs font-bold text-rose-600">
                ({metrics.discrepancyCount} Flagged)
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            ₹{metrics.pendingVerificationAmount.toLocaleString('en-IN')} awaiting admin approval
          </p>
        </Card>
      </div>

      {/* Per Sales Person Balances Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Sales Representatives Cash & Remittance Accounts
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            (Calculated from real-time customer payments vs. bank remittances)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {repLedgers.map(({ rep, regionName, collected, remitted, inHand, pendingVerification, hasDiscrepancy, totalEntries }) => {
            return (
              <Card
                key={rep.id}
                className="p-5 border-slate-200/90 hover:border-indigo-300 transition-all shadow-sm bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={rep.avatar || 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'}
                      alt={rep.name}
                      className="w-11 h-11 rounded-full object-cover border-2 border-indigo-100 shadow-sm"
                    />
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">{rep.name}</h3>
                      <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {regionName}
                      </p>
                    </div>
                  </div>

                  {hasDiscrepancy && (
                    <Badge variant="danger" size="sm">
                      ⚠️ Discrepancy
                    </Badge>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">
                      Total Collected
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      ₹{collected.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">
                      Paid to Company
                    </span>
                    <span className="font-extrabold text-emerald-700 text-sm">
                      ₹{remitted.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="col-span-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Current In-Hand Cash Balance
                      </span>
                      <span
                        className={`text-sm font-black ${
                          inHand > 0 ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        ₹{inHand.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedRepFilter(rep.id);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                    >
                      Filter {totalEntries} Entries
                    </button>
                  </div>
                </div>

                {pendingVerification > 0 && (
                  <div className="mt-2 text-[11px] text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 flex items-center justify-between">
                    <span>Deposit proof submitted:</span>
                    <span className="font-bold">₹{pendingVerification.toLocaleString('en-IN')} (Awaiting Check)</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search entry #, sales rep, customer, bank, UTR, or proof name..."
            />
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Showing <span className="font-extrabold text-slate-900">{filteredEntries.length}</span> of{' '}
            {salesRemittances.length} ledger transactions
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Sales Rep Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Sales Person:</span>
            <select
              value={selectedRepFilter}
              onChange={(e) => setSelectedRepFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Sales Persons</option>
              {salesUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} (Sales Rep)
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Transaction:</span>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="collection_from_customer">Customer Field Collections</option>
              <option value="remittance_to_company">Remittances to Company Bank</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Audit Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="verified">Verified & Credited</option>
              <option value="pending_verification">Pending Verification</option>
              <option value="discrepancy">Discrepancy Flagged</option>
            </select>
          </div>

          {/* Mode Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Mode:</span>
            <select
              value={selectedModeFilter}
              onChange={(e) => setSelectedModeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Modes</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="neft_rtgs">NEFT / RTGS</option>
              <option value="upi">UPI</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(searchTerm ||
            selectedRepFilter !== 'all' ||
            selectedTypeFilter !== 'all' ||
            selectedStatusFilter !== 'all' ||
            selectedModeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedRepFilter('all');
                setSelectedTypeFilter('all');
                setSelectedStatusFilter('all');
                setSelectedModeFilter('all');
              }}
              className="ml-auto text-indigo-600 hover:text-indigo-800 font-bold underline"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Ledger Table */}
      <Card className="border-slate-200/90 shadow-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Entry # & Date</th>
                <th className="py-3 px-4">Sales Person</th>
                <th className="py-3 px-4">Transaction Flow</th>
                <th className="py-3 px-4">Account / Counterparty</th>
                <th className="py-3 px-4">Mode & Ref #</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-center">Payment Proof</th>
                <th className="py-3 px-4 text-center">Audit Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    No collection or remittance entries match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const isRemit = entry.type === 'remittance_to_company';
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Entry # & Date */}
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-slate-900 block text-xs">
                          {entry.entryNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {entry.date}
                        </span>
                      </td>

                      {/* Sales Person */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {entry.salesUserName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">
                              {entry.salesUserName}
                            </span>
                            <span className="text-[10px] text-slate-400">Sales Representative</span>
                          </div>
                        </div>
                      </td>

                      {/* Transaction Flow */}
                      <td className="py-3 px-4">
                        {isRemit ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" /> Paid to Company
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                            <ArrowDownLeft className="w-3.5 h-3.5 text-indigo-600" /> Customer Collection
                          </span>
                        )}
                      </td>

                      {/* Account / Counterparty */}
                      <td className="py-3 px-4 max-w-xs">
                        {isRemit ? (
                          <div>
                            <span className="font-semibold text-slate-900 block text-xs truncate">
                              {entry.companyBankAccount}
                            </span>
                            <span className="text-[10px] text-slate-400">Company Bank Vault</span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-semibold text-slate-900 block text-xs truncate">
                              {entry.customerName || 'Customer Account'}
                            </span>
                            <span className="text-[10px] text-slate-400">Dealer Settlement</span>
                          </div>
                        )}
                      </td>

                      {/* Mode & Ref */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          {getModeBadge(entry.paymentMode)}
                          <span className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]">
                            {entry.referenceNumber}
                          </span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-black text-sm block ${
                            isRemit ? 'text-emerald-700' : 'text-indigo-900'
                          }`}
                        >
                          ₹{entry.amount.toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Proof Thumbnail */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenProofModal(entry)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 transition-all shadow-xs"
                          title="Click to view payment proof / deposit slip"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                          <span className="max-w-[100px] truncate">{entry.proofAttachmentName}</span>
                          <Eye className="w-3 h-3 text-indigo-600" />
                        </button>
                      </td>

                      {/* Audit Status */}
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(entry.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {entry.status === 'pending_verification' && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleVerify(entry)}
                                className="text-[11px] py-1 px-2.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                                title="Verify deposit in company bank account"
                              >
                                Verify
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDiscrepancyModal(entry)}
                                className="text-[11px] py-1 px-2 font-bold text-rose-700 hover:bg-rose-50 border-rose-200"
                                title="Flag Discrepancy"
                              >
                                Flag
                              </Button>
                            </>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenProofModal(entry)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600"
                            title="Inspect details and receipt"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
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

      {/* MODAL 1: VIEW PROOF & VERIFY */}
      {proofModalOpen && selectedEntryForProof && (
        <Modal
          isOpen={proofModalOpen}
          onClose={() => setProofModalOpen(false)}
          title={`Audit Payment Proof: ${selectedEntryForProof.entryNumber}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Header summary banner */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {selectedEntryForProof.entryNumber}
                  </h3>
                  {getStatusBadge(selectedEntryForProof.status)}
                  {getModeBadge(selectedEntryForProof.paymentMode)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recorded on {selectedEntryForProof.date} by {selectedEntryForProof.salesUserName}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  Amount
                </span>
                <span className="text-2xl font-black text-indigo-700">
                  ₹{selectedEntryForProof.amount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Document Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                  Transaction Classification
                </span>
                <p className="font-bold text-slate-800">
                  {selectedEntryForProof.type === 'remittance_to_company'
                    ? 'Payment Remitted into Company Bank Account'
                    : 'Customer Collection from Field Dealer'}
                </p>
                <p className="text-slate-500">
                  Account:{' '}
                  <span className="font-semibold text-slate-700">
                    {selectedEntryForProof.companyBankAccount ||
                      selectedEntryForProof.customerName}
                  </span>
                </p>
                <p className="text-slate-500">
                  Bank Ref / UTR:{' '}
                  <span className="font-mono font-semibold text-slate-800">
                    {selectedEntryForProof.referenceNumber}
                  </span>
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                  Proof Verification Audit
                </span>
                {selectedEntryForProof.verifiedByUserName ? (
                  <>
                    <p className="font-bold text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Verified by {selectedEntryForProof.verifiedByUserName}
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      At:{' '}
                      {selectedEntryForProof.verifiedAt
                        ? new Date(selectedEntryForProof.verifiedAt).toLocaleString('en-IN')
                        : 'Recorded'}
                    </p>
                  </>
                ) : (
                  <p className="text-amber-800 font-semibold flex items-center gap-1">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Pending Finance / Admin Sign-off
                  </p>
                )}

                {selectedEntryForProof.discrepancyReason && (
                  <div className="p-2 bg-rose-50 text-rose-800 rounded border border-rose-200 text-[11px] mt-1">
                    <span className="font-bold block">Discrepancy Note:</span>
                    {selectedEntryForProof.discrepancyReason}
                  </div>
                )}
              </div>
            </div>

            {/* Simulated Visual Proof Document Card */}
            <div>
              <span className="text-xs font-bold text-slate-700 mb-1.5 block">
                Attached Deposit Counterfoil / Remittance Slip:
              </span>
              <div className="p-4 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 text-center">
                <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 max-w-lg mx-auto text-left relative overflow-hidden">
                  {/* Bank stamp watermark */}
                  <div className="absolute right-4 top-4 border-2 border-emerald-600/30 rounded-full w-20 h-20 flex items-center justify-center transform rotate-12 pointer-events-none">
                    <span className="text-[9px] font-black uppercase text-emerald-700/40 text-center leading-tight">
                      BANK CREDIT
                      <br />
                      VERIFIED
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Landmark className="w-5 h-5 text-indigo-700" />
                      <span className="font-extrabold text-slate-900 text-sm">
                        OFFICIAL TRANSACTION COUNTERFOIL
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      DOC #{selectedEntryForProof.referenceNumber}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Depositor:</span>
                      <span className="font-bold text-slate-800">
                        {selectedEntryForProof.salesUserName}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Remitted To:</span>
                      <span className="font-bold text-slate-800 truncate block">
                        {selectedEntryForProof.companyBankAccount || 'Company Escrow'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Date & Time:</span>
                      <span className="font-bold text-slate-800">{selectedEntryForProof.date}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Mode:</span>
                      <span className="font-bold text-slate-800 uppercase">
                        {selectedEntryForProof.paymentMode}
                      </span>
                    </div>

                    <div className="col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-extrabold text-slate-500">Amount Received:</span>
                      <span className="font-black text-indigo-700 text-lg">
                        ₹{selectedEntryForProof.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5" />
                      {selectedEntryForProof.proofAttachmentName}
                    </span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Authentic Proof Attached
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedEntryForProof.notes && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-0.5">Notes:</span>
                <p className="text-slate-600">{selectedEntryForProof.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedEntryForProof.status === 'pending_verification' && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleVerify(selectedEntryForProof)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Verify & Credit Company Account
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDiscrepancyModal(selectedEntryForProof)}
                      className="text-rose-700 border-rose-200 hover:bg-rose-50"
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Flag Discrepancy
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setProofModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: FLAG DISCREPANCY */}
      {discrepancyModalOpen && selectedEntryForProof && (
        <Modal
          isOpen={discrepancyModalOpen}
          onClose={() => setDiscrepancyModalOpen(false)}
          title={`Flag Remittance Discrepancy: ${selectedEntryForProof.entryNumber}`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmDiscrepancy} className="space-y-4">
            <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 text-xs text-rose-900">
              <p className="font-semibold">
                Please state why this remittance counterfoil / collection does not match company records.
                The sales representative will receive immediate notification to submit an amended receipt.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Discrepancy Reason *
              </label>
              <textarea
                required
                rows={3}
                value={discrepancyReason}
                onChange={(e) => setDiscrepancyReason(e.target.value)}
                placeholder="e.g. Bank slip reference number does not match account credit, amount discrepancy of ₹5,000, or illegible branch counterfoil..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDiscrepancyModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white">
                Submit Discrepancy Flag
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: RECORD COLLECTION OR REMITTANCE */}
      {createModalOpen && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Record Sales Person Collection / Remittance"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sales Representative *
                </label>
                <select
                  required
                  value={newRepId}
                  onChange={(e) => setNewRepId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500"
                >
                  {salesUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (Sales Rep)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Transaction Classification *
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="remittance_to_company">Remittance Paid to Company Bank</option>
                  <option value="collection_from_customer">Customer Field Collection</option>
                </select>
              </div>
            </div>

            {newType === 'collection_from_customer' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer / Dealer Account *
                </label>
                <select
                  value={newCustomerId}
                  onChange={(e) => setNewCustomerId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Company Destination Bank Account *
                </label>
                <select
                  value={newCompanyBank}
                  onChange={(e) => setNewCompanyBank(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="HDFC Bank Ltd - A/c 502000889921 (Operations Main)">
                    HDFC Bank Ltd - A/c 502000889921 (Operations Main)
                  </option>
                  <option value="State Bank of India - Current A/c 38192039485">
                    State Bank of India - Current A/c 38192039485
                  </option>
                  <option value="ICICI Bank - Escrow A/c 00192837465">
                    ICICI Bank - Escrow A/c 00192837465
                  </option>
                  <option value="Head Office Petty Cash Vault">
                    Head Office Petty Cash Vault
                  </option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. 75000"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Mode *
                </label>
                <select
                  value={newMode}
                  onChange={(e) => setNewMode(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="cash">Cash Deposit</option>
                  <option value="cheque">Cheque</option>
                  <option value="neft_rtgs">NEFT / RTGS Transfer</option>
                  <option value="upi">UPI Instant</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reference / UTR / Cheque # *
                </label>
                <input
                  type="text"
                  required
                  value={newReference}
                  onChange={(e) => setNewReference(e.target.value)}
                  placeholder="e.g. HDFC-DEP-99120 or UTR-SBIN001928"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Proof Document Type
                </label>
                <select
                  value={newProofType}
                  onChange={(e) => setNewProofType(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="deposit_slip">Bank Deposit Slip / Counterfoil</option>
                  <option value="bank_statement_screenshot">Bank Statement / UTR Screenshot</option>
                  <option value="cheque_photo">Cheque Front Photo</option>
                  <option value="cash_receipt">Signed Cash Voucher</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Proof Attachment Filename
              </label>
              <input
                type="text"
                value={newProofName}
                onChange={(e) => setNewProofName(e.target.value)}
                placeholder="e.g. branch_deposit_counterfoil_75000.jpg"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Remittance Notes
              </label>
              <textarea
                rows={2}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Branch name, depositor signature reference, or customer bill number..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Record Entry & Queue for Verification
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
