import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Quotation, QuotationItem, User } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/Input';
import {
  FileText,
  UserCheck,
  UserX,
  Users,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Send,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  Sparkles,
  DollarSign,
  ChevronRight,
  Eye,
  RefreshCw,
  FolderSync,
  Tag,
  Share2,
} from 'lucide-react';

export const QuotationsManagement: React.FC = () => {
  const {
    quotations,
    users,
    regions,
    products,
    assignQuotation,
    batchAssignQuotationsBySender,
    createQuotation,
    updateQuotationStatus,
  } = useErpStore();

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSenderFilter, setSelectedSenderFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>('all');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'bySender'>('list');

  // Modals state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedQuoteForAssign, setSelectedQuoteForAssign] = useState<Quotation | null>(null);
  const [targetSalesUserId, setTargetSalesUserId] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');

  const [batchAssignModalOpen, setBatchAssignModalOpen] = useState(false);
  const [batchSenderName, setBatchSenderName] = useState('');
  const [batchTargetSalesUserId, setBatchTargetSalesUserId] = useState('');
  const [batchAssignmentNote, setBatchAssignmentNote] = useState('');

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewingQuote, setViewingQuote] = useState<Quotation | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newSenderName, setNewSenderName] = useState('');
  const [newSenderCompany, setNewSenderCompany] = useState('');
  const [newSenderEmail, setNewSenderEmail] = useState('');
  const [newSenderPhone, setNewSenderPhone] = useState('');
  const [newRegionId, setNewRegionId] = useState(regions[0]?.id || 'reg-north');
  const [newAssignedSalesUserId, setNewAssignedSalesUserId] = useState('');
  const [newPriority, setNewPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');
  const [newNotes, setNewNotes] = useState('');
  const [newItems, setNewItems] = useState<
    { productId: string; qty: number; discountPercent: number }[]
  >([{ productId: products[0]?.id || '', qty: 10, discountPercent: 0 }]);

  // Sales Role Users
  const salesUsers = useMemo(() => {
    return users.filter((u) => u.role === 'sales');
  }, [users]);

  // Distinct Senders list
  const distinctSenders = useMemo(() => {
    const map = new Map<string, { senderName: string; company: string; count: number }>();
    quotations.forEach((q) => {
      const key = q.senderName.trim();
      if (!map.has(key)) {
        map.set(key, { senderName: q.senderName, company: q.senderCompany, count: 1 });
      } else {
        const item = map.get(key)!;
        item.count++;
      }
    });
    return Array.from(map.values());
  }, [quotations]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = quotations.length;
    const unassigned = quotations.filter(
      (q) => !q.assignedSalesUserId || q.status === 'Unassigned'
    ).length;
    const assigned = total - unassigned;
    const pipelineValue = quotations.reduce((acc, q) => acc + q.grandTotal, 0);
    const converted = quotations.filter((q) => q.status === 'Converted').length;

    return { total, unassigned, assigned, pipelineValue, converted };
  }, [quotations]);

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const matchesSearch =
        !searchTerm.trim() ||
        q.quotationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.senderCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.assignedSalesUserName &&
          q.assignedSalesUserName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSender =
        selectedSenderFilter === 'all' ||
        q.senderName.trim().toLowerCase() === selectedSenderFilter.trim().toLowerCase();

      const matchesStatus =
        selectedStatusFilter === 'all'
          ? true
          : selectedStatusFilter === 'Unassigned'
          ? !q.assignedSalesUserId || q.status === 'Unassigned'
          : q.status === selectedStatusFilter;

      const matchesRep =
        selectedRepFilter === 'all'
          ? true
          : selectedRepFilter === 'unassigned'
          ? !q.assignedSalesUserId
          : q.assignedSalesUserId === selectedRepFilter;

      const matchesRegion =
        selectedRegionFilter === 'all' || q.regionId === selectedRegionFilter;

      return matchesSearch && matchesSender && matchesStatus && matchesRep && matchesRegion;
    });
  }, [
    quotations,
    searchTerm,
    selectedSenderFilter,
    selectedStatusFilter,
    selectedRepFilter,
    selectedRegionFilter,
  ]);

  // Senders Grouping Data
  const sendersGrouped = useMemo(() => {
    const map = new Map<
      string,
      {
        senderName: string;
        senderCompany: string;
        senderEmail?: string;
        senderPhone?: string;
        regionId: string;
        quotes: Quotation[];
        totalValue: number;
        unassignedCount: number;
        assignedCount: number;
        assignedSalesNames: string[];
      }
    >();

    quotations.forEach((q) => {
      const key = q.senderName.trim();
      if (!map.has(key)) {
        map.set(key, {
          senderName: q.senderName,
          senderCompany: q.senderCompany,
          senderEmail: q.senderEmail,
          senderPhone: q.senderPhone,
          regionId: q.regionId,
          quotes: [q],
          totalValue: q.grandTotal,
          unassignedCount: !q.assignedSalesUserId || q.status === 'Unassigned' ? 1 : 0,
          assignedCount: q.assignedSalesUserId && q.status !== 'Unassigned' ? 1 : 0,
          assignedSalesNames: q.assignedSalesUserName ? [q.assignedSalesUserName] : [],
        });
      } else {
        const item = map.get(key)!;
        item.quotes.push(q);
        item.totalValue += q.grandTotal;
        if (!q.assignedSalesUserId || q.status === 'Unassigned') {
          item.unassignedCount++;
        } else {
          item.assignedCount++;
        }
        if (q.assignedSalesUserName && !item.assignedSalesNames.includes(q.assignedSalesUserName)) {
          item.assignedSalesNames.push(q.assignedSalesUserName);
        }
      }
    });

    return Array.from(map.values()).filter((group) => {
      const matchesSearch =
        !searchTerm.trim() ||
        group.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.senderCompany.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSender =
        selectedSenderFilter === 'all' ||
        group.senderName.trim().toLowerCase() === selectedSenderFilter.trim().toLowerCase();

      return matchesSearch && matchesSender;
    });
  }, [quotations, searchTerm, selectedSenderFilter]);

  // Handle single quotation assignment
  const handleOpenAssignModal = (quote: Quotation) => {
    setSelectedQuoteForAssign(quote);
    setTargetSalesUserId(quote.assignedSalesUserId || salesUsers[0]?.id || '');
    setAssignmentNote('');
    setAssignModalOpen(true);
  };

  const handleConfirmAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuoteForAssign || !targetSalesUserId) return;

    assignQuotation(selectedQuoteForAssign.id, targetSalesUserId, assignmentNote);
    setAssignModalOpen(false);
    setSelectedQuoteForAssign(null);
  };

  // Handle batch assignment by sender name
  const handleOpenBatchAssignModal = (senderName?: string) => {
    setBatchSenderName(senderName || distinctSenders[0]?.senderName || '');
    setBatchTargetSalesUserId(salesUsers[0]?.id || '');
    setBatchAssignmentNote('');
    setBatchAssignModalOpen(true);
  };

  const handleConfirmBatchAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchSenderName || !batchTargetSalesUserId) return;

    batchAssignQuotationsBySender(batchSenderName, batchTargetSalesUserId, batchAssignmentNote);
    setBatchAssignModalOpen(false);
  };

  // Handle Create New Quotation
  const handleAddItemRow = () => {
    setNewItems([...newItems, { productId: products[0]?.id || '', qty: 10, discountPercent: 0 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (newItems.length > 1) {
      setNewItems(newItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...newItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewItems(updated);
  };

  const calculateNewQuoteTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    const parsedItems: QuotationItem[] = newItems.map((item) => {
      const prd = products.find((p) => p.id === item.productId);
      const unitPrice = prd?.standardSellingPrice || 1000;
      const baseLine = unitPrice * item.qty;
      const lineDisc = baseLine * (item.discountPercent / 100);
      const lineTaxable = baseLine - lineDisc;
      const lineTax = lineTaxable * 0.18; // 18% standard GST
      const lineTotal = lineTaxable + lineTax;

      subtotal += baseLine;
      discountTotal += lineDisc;
      taxTotal += lineTax;

      return {
        productId: item.productId,
        productName: prd?.name || 'Custom Product',
        unitPrice,
        qty: item.qty,
        discountPercent: item.discountPercent,
        taxRate: 18,
        lineTotal,
      };
    });

    const grandTotal = subtotal - discountTotal + taxTotal;
    return { parsedItems, subtotal, discountTotal, taxTotal, grandTotal };
  };

  const handleCreateQuotationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSenderName || !newSenderCompany) return;

    const { parsedItems, subtotal, discountTotal, taxTotal, grandTotal } = calculateNewQuoteTotals();
    const assignedUser = salesUsers.find((u) => u.id === newAssignedSalesUserId);

    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + 15);

    createQuotation({
      senderName: newSenderName,
      senderCompany: newSenderCompany,
      senderEmail: newSenderEmail || undefined,
      senderPhone: newSenderPhone || undefined,
      customerName: newSenderCompany,
      regionId: newRegionId,
      assignedSalesUserId: newAssignedSalesUserId || undefined,
      assignedSalesUserName: assignedUser?.name || undefined,
      validUntil: validUntilDate.toISOString().split('T')[0],
      status: newAssignedSalesUserId ? 'Draft' : 'Unassigned',
      priority: newPriority,
      notes: newNotes,
      items: parsedItems,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
    });

    // Reset
    setCreateModalOpen(false);
    setNewSenderName('');
    setNewSenderCompany('');
    setNewSenderEmail('');
    setNewSenderPhone('');
    setNewNotes('');
    setNewItems([{ productId: products[0]?.id || '', qty: 10, discountPercent: 0 }]);
  };

  const getStatusBadge = (status: Quotation['status']) => {
    switch (status) {
      case 'Unassigned':
        return <Badge variant="warning">Unassigned</Badge>;
      case 'Draft':
        return <Badge variant="neutral">Draft</Badge>;
      case 'Sent':
        return <Badge variant="primary">Sent to Customer</Badge>;
      case 'Awaiting Approval':
        return <Badge variant="purple">Awaiting Approval</Badge>;
      case 'Accepted':
        return <Badge variant="success">Accepted</Badge>;
      case 'Converted':
        return <Badge variant="success">Converted to SO</Badge>;
      case 'Rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'Expired':
        return <Badge variant="neutral">Expired</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: Quotation['priority']) => {
    switch (priority) {
      case 'Urgent':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" /> Urgent
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            High
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
            Normal
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              Quotations & Inward RFQs
            </h1>
            <Badge variant="purple" size="sm">Admin Role Delegation</Badge>
            <Badge variant="primary" size="sm">Sales Assign Desk</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
            Allocate inbound buyer inquiries and commercial quotes to Sales Representatives by sender name,
            monitor quota alignment, and drive deal conversion workflows.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenBatchAssignModal()}
            className="flex items-center gap-1.5 bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm"
          >
            <FolderSync className="w-4 h-4 text-indigo-600" />
            Batch Assign by Sender
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 shadow-sm shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            New Inward RFQ
          </Button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Quotation Pipe
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.total}</span>
            <span className="text-xs font-semibold text-slate-500">
              (₹{(metrics.pipelineValue / 100000).toFixed(2)}L Value)
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>{distinctSenders.length} unique senders recorded</span>
          </div>
        </Card>

        <Card className="p-4 border-amber-200/80 bg-gradient-to-br from-amber-50/40 to-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Unassigned Inquiries
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-900">{metrics.unassigned}</span>
            <span className="text-xs font-bold text-amber-600">Action Required</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700">
            <Clock className="w-3.5 h-3.5" />
            <span>Awaiting sales role assignment</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Assigned to Sales
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.assigned}</span>
            <span className="text-xs font-semibold text-emerald-600">Active Rep Pipeline</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Allocated across {salesUsers.length} sales executives</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Converted to Orders
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.converted}</span>
            <span className="text-xs font-bold text-purple-600">
              {metrics.total > 0 ? ((metrics.converted / metrics.total) * 100).toFixed(0) : 0}% Conversion
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Directly converted into active dispatches</span>
          </div>
        </Card>
      </div>

      {/* Filter and View Mode Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="flex-1 max-w-md">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search sender name, company, quote #, or sales rep..."
            />
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Quotes Ledger ({filteredQuotations.length})
            </button>
            <button
              onClick={() => setViewMode('bySender')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'bySender'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Group by Sender Name ({sendersGrouped.length})
            </button>
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Sender Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Sender:</span>
            <select
              value={selectedSenderFilter}
              onChange={(e) => setSelectedSenderFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Senders ({distinctSenders.length})</option>
              {distinctSenders.map((s) => (
                <option key={s.senderName} value={s.senderName}>
                  {s.senderName} ({s.company} - {s.count} quotes)
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="Unassigned">⚠️ Unassigned (Needs Rep)</option>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent to Customer</option>
              <option value="Awaiting Approval">Awaiting Approval</option>
              <option value="Accepted">Accepted</option>
              <option value="Converted">Converted to Order</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Sales Rep Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Sales Rep:</span>
            <select
              value={selectedRepFilter}
              onChange={(e) => setSelectedRepFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Sales Roles</option>
              <option value="unassigned">Unassigned Only</option>
              {salesUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} (Sales Rep)
                </option>
              ))}
            </select>
          </div>

          {/* Region Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Region:</span>
            <select
              value={selectedRegionFilter}
              onChange={(e) => setSelectedRegionFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Regions</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset button */}
          {(searchTerm ||
            selectedSenderFilter !== 'all' ||
            selectedStatusFilter !== 'all' ||
            selectedRepFilter !== 'all' ||
            selectedRegionFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedSenderFilter('all');
                setSelectedStatusFilter('all');
                setSelectedRepFilter('all');
                setSelectedRegionFilter('all');
              }}
              className="ml-auto text-indigo-600 hover:text-indigo-800 font-bold underline"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: GROUP BY SENDER NAME */}
      {viewMode === 'bySender' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-extrabold text-slate-900">
                Sender Portfolios & Inbound Inquiries
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                (Click "Assign All" to delegate all quotes from a sender to a sales rep)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sendersGrouped.map((sender) => {
              const reg = regions.find((r) => r.id === sender.regionId);
              return (
                <Card
                  key={sender.senderName}
                  className="p-5 border-slate-200/90 hover:border-indigo-300 transition-all shadow-sm bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-indigo-500/20">
                        {sender.senderName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-base">
                            {sender.senderName}
                          </h3>
                          {sender.unassignedCount > 0 && (
                            <Badge variant="warning" size="sm">
                              {sender.unassignedCount} Unassigned
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {sender.senderCompany}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenBatchAssignModal(sender.senderName)}
                      className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 flex items-center gap-1"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Assign All to Rep
                    </Button>
                  </div>

                  {/* Sender Contact & Region info */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {sender.senderEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {sender.senderEmail}
                      </span>
                    )}
                    {sender.senderPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {sender.senderPhone}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-slate-600 font-medium">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {reg?.name || sender.regionId}
                    </span>
                  </div>

                  {/* Metric Summary */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                        Total Quotes
                      </span>
                      <span className="font-black text-slate-900 text-sm">
                        {sender.quotes.length} Quotes
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                        Cumulative Value
                      </span>
                      <span className="font-black text-indigo-600 text-sm">
                        ₹{sender.totalValue.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                        Assigned Sales Role
                      </span>
                      <span className="font-bold text-slate-800 text-xs">
                        {sender.assignedSalesNames.length > 0
                          ? sender.assignedSalesNames.join(', ')
                          : 'None (Unassigned)'}
                      </span>
                    </div>
                  </div>

                  {/* Mini Quotes List */}
                  <div className="mt-4 space-y-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                      Sender Inquiries ({sender.quotes.length}):
                    </span>
                    {sender.quotes.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 text-xs hover:border-indigo-300 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-indigo-700">{q.quotationNo}</span>
                          {getPriorityBadge(q.priority)}
                          <span className="text-slate-500 font-medium">
                            ₹{q.grandTotal.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {q.assignedSalesUserName ? (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Assigned: {q.assignedSalesUserName.split(' ')[0]}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenAssignModal(q)}
                              className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-300"
                            >
                              + Assign Rep
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setViewingQuote(q);
                              setDetailModalOpen(true);
                            }}
                            className="text-slate-400 hover:text-indigo-600"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: QUOTATION LEDGER VIEW (TABLE) */}
      {viewMode === 'list' && (
        <Card className="border-slate-200/90 shadow-sm overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Quotation #</th>
                  <th className="py-3 px-4">Sender Details (Inquirer)</th>
                  <th className="py-3 px-4">Assigned Sales Role</th>
                  <th className="py-3 px-4">Territory</th>
                  <th className="py-3 px-4 text-right">Value (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      No quotations match the active filters or search query.
                    </td>
                  </tr>
                ) : (
                  filteredQuotations.map((q) => {
                    const reg = regions.find((r) => r.id === q.regionId);
                    const isUnassigned = !q.assignedSalesUserId || q.status === 'Unassigned';

                    return (
                      <tr
                        key={q.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isUnassigned ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        {/* Quotation # & Priority */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-extrabold text-indigo-700 text-sm">
                              {q.quotationNo}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {getPriorityBadge(q.priority)}
                              {q.convertedOrderNo && (
                                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1 rounded">
                                  &rarr; {q.convertedOrderNo}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Sender Details */}
                        <td className="py-3 px-4">
                          <div>
                            <span className="font-extrabold text-slate-900 block text-sm">
                              {q.senderName}
                            </span>
                            <span className="text-slate-600 font-semibold block text-[11px]">
                              {q.senderCompany}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                              {q.senderPhone && <span>{q.senderPhone}</span>}
                              {q.senderEmail && <span>• {q.senderEmail}</span>}
                            </div>
                          </div>
                        </td>

                        {/* Assigned Sales Role */}
                        <td className="py-3 px-4">
                          {q.assignedSalesUserName ? (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                {q.assignedSalesUserName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block text-xs">
                                  {q.assignedSalesUserName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  Sales Representative
                                </span>
                              </div>
                              <button
                                onClick={() => handleOpenAssignModal(q)}
                                title="Reassign to another sales rep"
                                className="ml-1 text-slate-400 hover:text-indigo-600"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                Unassigned
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAssignModal(q)}
                                className="text-[11px] py-1 px-2.5 font-bold text-indigo-700 bg-white hover:bg-indigo-50 border-indigo-200"
                              >
                                Assign Rep
                              </Button>
                            </div>
                          )}
                        </td>

                        {/* Territory */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-700 text-xs">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {reg?.code || q.regionId}
                          </span>
                        </td>

                        {/* Value */}
                        <td className="py-3 px-4 text-right">
                          <span className="font-black text-slate-900 text-sm block">
                            ₹{q.grandTotal.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {q.items.length} items
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          {getStatusBadge(q.status)}
                        </td>

                        {/* Validity */}
                        <td className="py-3 px-4">
                          <span className="text-slate-600 font-semibold block text-xs">
                            {q.validUntil}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Created: {q.createdDate}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setViewingQuote(q);
                                setDetailModalOpen(true);
                              }}
                              className="text-slate-600 hover:text-indigo-600 p-1.5"
                              title="View Quotation Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAssignModal(q)}
                              className="text-xs font-bold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50"
                            >
                              {q.assignedSalesUserId ? 'Reassign' : 'Assign'}
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
      )}

      {/* MODAL 1: ASSIGN QUOTATION TO SALES ROLE */}
      {assignModalOpen && selectedQuoteForAssign && (
        <Modal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title={`Assign Quotation: ${selectedQuoteForAssign.quotationNo}`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmAssignment} className="space-y-4">
            {/* Sender Context Box */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                Inward Sender / Customer:
              </span>
              <div className="mt-1 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    {selectedQuoteForAssign.senderName}
                  </h4>
                  <p className="text-xs text-slate-600 font-semibold">
                    {selectedQuoteForAssign.senderCompany}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-indigo-600 block">
                    ₹{selectedQuoteForAssign.grandTotal.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {selectedQuoteForAssign.items.length} line items
                  </span>
                </div>
              </div>
            </div>

            {/* Target Sales Rep Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assign to Sales Representative *
              </label>
              <select
                required
                value={targetSalesUserId}
                onChange={(e) => setTargetSalesUserId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Sales Executive</option>
                {salesUsers.map((rep) => {
                  const reg = regions.find((r) => r.id === rep.assignedRegionId);
                  const activeQuotes = quotations.filter(
                    (q) => q.assignedSalesUserId === rep.id && q.status !== 'Converted'
                  ).length;

                  return (
                    <option key={rep.id} value={rep.id}>
                      {rep.name} ({reg?.code || 'All Regions'}) • Max Disc: {rep.maxDiscountPercent || 8}% • {activeQuotes} active quotes
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                The assigned sales representative will receive instant notification and authorization to engage with this sender.
              </p>
            </div>

            {/* Priority & Handover Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Handover Notes & Pricing Directives
              </label>
              <textarea
                rows={3}
                value={assignmentNote}
                onChange={(e) => setAssignmentNote(e.target.value)}
                placeholder="e.g. High volume distributor. Quote within 24h. Authorized to offer up to 7% volume markdown..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAssignModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Confirm Sales Delegation
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: BATCH ASSIGN BY SENDER NAME */}
      {batchAssignModalOpen && (
        <Modal
          isOpen={batchAssignModalOpen}
          onClose={() => setBatchAssignModalOpen(false)}
          title="Batch Assign Quotations by Sender Name"
          maxWidth="md"
        >
          <form onSubmit={handleConfirmBatchAssignment} className="space-y-4">
            <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100 text-xs text-indigo-900">
              <p className="font-semibold">
                Delegate all incoming quotation requests sent by a particular sender to a designated Sales Representative.
              </p>
            </div>

            {/* Select Sender Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Sender Name *
              </label>
              <select
                required
                value={batchSenderName}
                onChange={(e) => setBatchSenderName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Choose Sender...</option>
                {distinctSenders.map((s) => (
                  <option key={s.senderName} value={s.senderName}>
                    {s.senderName} ({s.company} - {s.count} total quotes)
                  </option>
                ))}
              </select>
            </div>

            {/* Target Sales Rep */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assign All Quotes from this Sender To: *
              </label>
              <select
                required
                value={batchTargetSalesUserId}
                onChange={(e) => setBatchTargetSalesUserId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Sales Role User</option>
                {salesUsers.map((rep) => {
                  const reg = regions.find((r) => r.id === rep.assignedRegionId);
                  return (
                    <option key={rep.id} value={rep.id}>
                      {rep.name} ({reg?.code || 'Global'}) • Max Disc: {rep.maxDiscountPercent || 8}%
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Batch Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Batch Delegation Instruction
              </label>
              <input
                type="text"
                value={batchAssignmentNote}
                onChange={(e) => setBatchAssignmentNote(e.target.value)}
                placeholder="e.g. Assigned full sender account portfolio to West Region Sales Rep"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBatchAssignModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Assign All Quotes from Sender
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: CREATE NEW QUOTATION RFQ */}
      {createModalOpen && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Log Inward Quotation RFQ & Assign Sales Role"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreateQuotationSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            {/* Sender / Customer Section */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-extrabold uppercase text-indigo-700 tracking-wider block">
                1. Sender & Buyer Details (Inquirer)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sender Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSenderName}
                    onChange={(e) => setNewSenderName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sender Company / Firm *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSenderCompany}
                    onChange={(e) => setNewSenderCompany(e.target.value)}
                    placeholder="e.g. Chandra Engineering Spares LLP"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sender Email
                  </label>
                  <input
                    type="email"
                    value={newSenderEmail}
                    onChange={(e) => setNewSenderEmail(e.target.value)}
                    placeholder="rchandra@chandraengg.com"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sender Phone
                  </label>
                  <input
                    type="tel"
                    value={newSenderPhone}
                    onChange={(e) => setNewSenderPhone(e.target.value)}
                    placeholder="+91 98330 12345"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Sales Delegation & Territory Section */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-extrabold uppercase text-indigo-700 tracking-wider block">
                2. Sales Role Delegation & Territory
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Territory / Region *
                  </label>
                  <select
                    value={newRegionId}
                    onChange={(e) => setNewRegionId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  >
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assign to Sales Rep
                  </label>
                  <select
                    value={newAssignedSalesUserId}
                    onChange={(e) => setNewAssignedSalesUserId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Leave Unassigned (Queue)</option>
                    {salesUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} (Sales Rep)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Line Items Section */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase text-indigo-700 tracking-wider">
                  3. Requested Products & Volume
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItemRow}
                  className="text-xs font-bold text-indigo-700 bg-white"
                >
                  + Add Line Item
                </Button>
              </div>

              <div className="space-y-2">
                {newItems.map((item, index) => {
                  const prd = products.find((p) => p.id === item.productId);
                  const price = prd?.standardSellingPrice || 0;
                  const lineTotal = price * item.qty * (1 - item.discountPercent / 100) * 1.18;

                  return (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200"
                    >
                      <div className="col-span-5">
                        <label className="block text-[10px] font-bold text-slate-400">Product</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (₹{p.standardSellingPrice})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', parseInt(e.target.value) || 1)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400">Disc %</label>
                        <input
                          type="number"
                          min={0}
                          max={25}
                          value={item.discountPercent}
                          onChange={(e) =>
                            handleItemChange(index, 'discountPercent', parseFloat(e.target.value) || 0)
                          }
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1"
                        />
                      </div>

                      <div className="col-span-2 text-right">
                        <label className="block text-[10px] font-bold text-slate-400">Est. Total</label>
                        <span className="text-xs font-bold text-slate-800">
                          ₹{Math.round(lineTotal).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="col-span-1 text-center">
                        {newItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(index)}
                            className="text-rose-500 hover:text-rose-700 font-bold text-sm"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grand Total Preview */}
              <div className="pt-2 text-right font-black text-indigo-700 text-sm">
                Total Quotation Value: ₹{Math.round(calculateNewQuoteTotals().grandTotal).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Inquiry Requirements / Sender Notes
              </label>
              <textarea
                rows={2}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Specific delivery timeframe, batch requirements, packaging specifications..."
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
                Create & Assign Quotation
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: DETAILED QUOTATION INSPECTION */}
      {detailModalOpen && viewingQuote && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Quotation Ledger: ${viewingQuote.quotationNo}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Header banner */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {viewingQuote.quotationNo}
                  </h3>
                  {getStatusBadge(viewingQuote.status)}
                  {getPriorityBadge(viewingQuote.priority)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Issued on {viewingQuote.createdDate} • Valid through {viewingQuote.validUntil}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 block uppercase">
                  Grand Total (incl. GST)
                </span>
                <span className="text-xl font-black text-indigo-600">
                  ₹{viewingQuote.grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Sender and Rep 2-column info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                  Sender (Inquiring Customer)
                </span>
                <h4 className="font-extrabold text-slate-900 text-sm">
                  {viewingQuote.senderName}
                </h4>
                <p className="text-xs text-slate-700 font-semibold">
                  {viewingQuote.senderCompany}
                </p>
                {viewingQuote.senderEmail && (
                  <p className="text-xs text-slate-500">{viewingQuote.senderEmail}</p>
                )}
                {viewingQuote.senderPhone && (
                  <p className="text-xs text-slate-500">{viewingQuote.senderPhone}</p>
                )}
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                  Assigned Sales Role
                </span>
                {viewingQuote.assignedSalesUserName ? (
                  <>
                    <h4 className="font-extrabold text-indigo-700 text-sm">
                      {viewingQuote.assignedSalesUserName}
                    </h4>
                    <p className="text-xs text-slate-600 font-medium">
                      Field Sales Representative
                    </p>
                    {viewingQuote.assignedAt && (
                      <p className="text-[11px] text-slate-400">
                        Assigned on {new Date(viewingQuote.assignedAt).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="pt-2">
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-300 block text-center mb-2">
                      ⚠️ No Sales Rep Assigned
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setDetailModalOpen(false);
                        handleOpenAssignModal(viewingQuote);
                      }}
                      className="w-full text-xs"
                    >
                      Assign Sales Rep Now
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Line items table */}
            <div>
              <span className="text-xs font-bold text-slate-700 mb-2 block">
                Commercial Line Items
              </span>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Item / Product</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-center">Disc %</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingQuote.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {it.productName}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">{it.qty}</td>
                        <td className="py-2.5 px-3 text-right">₹{it.unitPrice.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-purple-700">
                          {it.discountPercent}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ₹{Math.round(it.lineTotal).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {viewingQuote.notes && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-0.5">Notes & Directives:</span>
                <p className="text-slate-600">{viewingQuote.notes}</p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDetailModalOpen(false);
                  handleOpenAssignModal(viewingQuote);
                }}
                className="text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
              >
                Reassign Sales Role
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
