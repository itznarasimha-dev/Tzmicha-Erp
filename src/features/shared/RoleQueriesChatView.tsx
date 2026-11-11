import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Tag,
  Paperclip,
  User,
  Sparkles,
  X,
  Shield,
  HelpCircle,
  FileText,
  Boxes,
  Truck,
  CreditCard,
  Receipt,
  Lock,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Building2,
  Check,
  Flame,
  Info,
} from 'lucide-react';
import { useErpStore } from '../../store/useErpStore';
import {
  RoleQueryTicket,
  ChatMessage,
  QueryCategory,
  QueryPriority,
  QueryStatus,
  UserRole,
} from '../../types';

interface RoleQueriesChatViewProps {
  roleContext?: UserRole;
}

const CATEGORIES: QueryCategory[] = [
  'Sales & Quotations',
  'Stock & Inventory Discrepancy',
  'Dispatch & Logistics',
  'Customer Credit & Invoicing',
  'Expense & Reimbursement',
  'Field Marketing & Surveys',
  'RMA & Quality Control',
  'HR, Attendance & Payroll',
  'IT & System Access',
  'General Operational Support',
];

const CANNED_REPLIES_ADMIN = [
  'Approved. Please proceed with execution.',
  'Please provide photos and the signed transporter LR copy.',
  'Stock has been allocated from Bhiwandi Depot; dispatch scheduled today.',
  'Under review with the finance controller; update shortly.',
  'Credit limit exception granted for this single lot only.',
];

const CANNED_REPLIES_EMPLOYEE = [
  'Shared update with the customer/dealer. Closing ticket.',
  'Client is requesting urgent dispatch confirmation today.',
  'Uploaded proof voucher and receipt copy.',
  'Thank you for the quick resolution!',
];

export const RoleQueriesChatView: React.FC<RoleQueriesChatViewProps> = ({ roleContext }) => {
  const {
    currentUser,
    currentRole: storeRole,
    roleQueries,
    addRoleQuery,
    addChatMessage,
    updateQueryStatus,
    assignQuery,
    users,
  } = useErpStore();

  const effectiveRole = roleContext || storeRole || currentUser?.role || 'admin';
  const isAdminOrManager = effectiveRole === 'admin' || effectiveRole === 'manager';

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [scopeTab, setScopeTab] = useState<'all' | 'my' | 'assigned'>(isAdminOrManager ? 'all' : 'my');

  // Selected Active Ticket
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  // Chat message composition state
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [isSimulatingBotReply, setIsSimulatingBotReply] = useState(false);

  // New Query Modal State
  const [isNewQueryModalOpen, setIsNewQueryModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<QueryCategory>('Sales & Quotations');
  const [newPriority, setNewPriority] = useState<QueryPriority>('Normal');
  const [newReferenceType, setNewReferenceType] = useState<RoleQueryTicket['referenceType']>('General');
  const [newReferenceId, setNewReferenceId] = useState('');
  const [newInitialMessage, setNewInitialMessage] = useState('');
  const [newAttachmentName, setNewAttachmentName] = useState('');

  const chatScrollEndRef = useRef<HTMLDivElement>(null);

  // Initialize active ticket
  useEffect(() => {
    if (roleQueries && roleQueries.length > 0 && !activeTicketId) {
      if (isAdminOrManager) {
        setActiveTicketId(roleQueries[0].id);
      } else {
        const myFirst = roleQueries.find((q) => q.requesterId === currentUser?.id || q.requesterRole === effectiveRole);
        setActiveTicketId(myFirst ? myFirst.id : roleQueries[0].id);
      }
    }
  }, [roleQueries, activeTicketId, isAdminOrManager, currentUser, effectiveRole]);

  // Scroll to bottom when messages update
  useEffect(() => {
    chatScrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roleQueries, activeTicketId]);

  // Filtered queries list
  const filteredQueries = useMemo(() => {
    return (roleQueries || []).filter((q) => {
      // Scope Tab
      if (scopeTab === 'my') {
        const isMyTicket = q.requesterId === currentUser?.id || q.requesterRole === effectiveRole;
        if (!isMyTicket) return false;
      } else if (scopeTab === 'assigned') {
        if (q.assignedToId !== currentUser?.id && !isAdminOrManager) return false;
      }

      // Status
      if (selectedStatus !== 'all' && q.status !== selectedStatus) return false;

      // Category
      if (selectedCategory !== 'all' && q.category !== selectedCategory) return false;

      // Priority
      if (selectedPriority !== 'all' && q.priority !== selectedPriority) return false;

      // Search Query
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase();
        const matchesNo = q.ticketNo.toLowerCase().includes(term);
        const matchesTitle = q.title.toLowerCase().includes(term);
        const matchesSender = q.requesterName.toLowerCase().includes(term);
        const matchesRef = (q.referenceId || '').toLowerCase().includes(term);
        const matchesCat = q.category.toLowerCase().includes(term);
        if (!matchesNo && !matchesTitle && !matchesSender && !matchesRef && !matchesCat) {
          return false;
        }
      }

      return true;
    });
  }, [roleQueries, scopeTab, selectedStatus, selectedCategory, selectedPriority, searchQuery, currentUser, effectiveRole, isAdminOrManager]);

  const activeTicket = useMemo(() => {
    return (roleQueries || []).find((q) => q.id === activeTicketId) || filteredQueries[0] || null;
  }, [roleQueries, activeTicketId, filteredQueries]);

  // Stats calculation
  const stats = useMemo(() => {
    const list = roleQueries || [];
    const openCount = list.filter((q) => q.status === 'open').length;
    const inProgressCount = list.filter((q) => q.status === 'in_progress').length;
    const resolvedCount = list.filter((q) => q.status === 'resolved' || q.status === 'closed').length;
    const urgentCount = list.filter((q) => q.priority === 'Urgent' && q.status !== 'resolved' && q.status !== 'closed').length;
    const myQueriesCount = list.filter((q) => q.requesterId === currentUser?.id || q.requesterRole === effectiveRole).length;
    return {
      total: list.length,
      open: openCount,
      inProgress: inProgressCount,
      resolved: resolvedCount,
      urgent: urgentCount,
      myQueries: myQueriesCount,
    };
  }, [roleQueries, currentUser, effectiveRole]);

  // Handle Send Chat Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyMessage.trim() || !activeTicket) return;

    const ticketId = activeTicket.id;
    const msgText = replyMessage.trim();
    const isNote = isInternalNote;
    const attName = attachedFileName || undefined;

    addChatMessage(ticketId, msgText, isNote, attName);
    setReplyMessage('');
    setIsInternalNote(false);
    setAttachedFileName(null);

    // If non-admin is chatting, simulate realistic response from management after 1.2s
    if (!isAdminOrManager && !isNote) {
      setIsSimulatingBotReply(true);
      setTimeout(() => {
        setIsSimulatingBotReply(false);
        const automatedResponses = [
          'Acknowledged. Operations Desk has received your update and is reviewing with the warehouse.',
          'Understood. Discrepancy noted and tagged in the daily executive log.',
          'Noted. Rajesh Verma has approved the exception request. Proceed accordingly.',
          'Received your request. Devendra Rawat from Store Hub has been notified for dispatch priority.',
        ];
        const randomResp = automatedResponses[Math.floor(Math.random() * automatedResponses.length)];
        
        // Add response from Pooja Hegde (Operations Manager)
        const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today';
        const updated = (useErpStore.getState().roleQueries || []).map((t) => {
          if (t.id === ticketId) {
            const respMsg: ChatMessage = {
              id: `sim-${Date.now()}`,
              senderId: 'usr-mgr-01',
              senderName: 'Pooja Hegde',
              senderRole: 'manager',
              senderAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
              message: randomResp,
              timestamp: timeFormatted,
            };
            return {
              ...t,
              status: t.status === 'open' ? ('in_progress' as const) : t.status,
              updatedAt: new Date().toISOString(),
              messages: [...t.messages, respMsg],
            };
          }
          return t;
        });
        useErpStore.setState({ roleQueries: updated });
      }, 1200);
    }
  };

  // Handle Create New Query
  const handleCreateNewQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newInitialMessage.trim()) return;

    const created = addRoleQuery({
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      referenceType: newReferenceType,
      referenceId: newReferenceId.trim() || undefined,
      initialMessage: newInitialMessage.trim(),
    });

    if (newAttachmentName.trim()) {
      addChatMessage(created.id, `Attached reference document: ${newAttachmentName.trim()}`, false, newAttachmentName.trim());
    }

    setIsNewQueryModalOpen(false);
    setNewTitle('');
    setNewInitialMessage('');
    setNewReferenceId('');
    setNewAttachmentName('');
    setActiveTicketId(created.id);
  };

  const getPriorityBadge = (priority: QueryPriority) => {
    switch (priority) {
      case 'Urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Flame className="w-3 h-3 text-rose-500 fill-rose-500 animate-pulse" />
            Urgent
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            High
          </span>
        );
      case 'Normal':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Info className="w-3 h-3 text-blue-500" />
            Normal
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: QueryStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600 animate-spin" />
            Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <RefreshCw className="w-3 h-3 text-indigo-600 animate-spin" />
            In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Resolved
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Closed
          </span>
        );
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-white">Admin</span>;
      case 'manager':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white">Operations Manager</span>;
      case 'sales':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600 text-white">Sales Rep</span>;
      case 'store_manager':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-600 text-white">Store Keeper</span>;
      case 'marketing':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-600 text-white">Field Marketing</span>;
      case 'service':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-600 text-white">Service Desk</span>;
      case 'finance':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-600 text-white">Finance Desk</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-500 text-white">{role}</span>;
    }
  };

  return (
    <div className="w-full space-y-5 pb-12 font-sans max-w-[1600px] mx-auto">
      {/* Top Header & Overview Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-indigo-800 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                <MessageSquare className="w-5 h-5 text-indigo-100" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Role Queries & Internal Helpdesk Chat
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Live Desk
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  {isAdminOrManager
                    ? 'Cross-departmental employee inquiry coordination, approval escalations & fast resolution thread'
                    : 'Raise operational queries, discount limit exceptions, dispatch tracking, and chat directly with Admin & Management'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Persona Badge & Primary Action Button */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-slate-500">Active Profile:</span>
              <span className="font-bold text-slate-800">{currentUser?.name || 'Authorized User'}</span>
              {getRoleBadge(effectiveRole)}
            </div>

            <button
              type="button"
              onClick={() => setIsNewQueryModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-lg shadow-slate-900/10 hover:shadow-xl transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-lime-400" />
              <span>Raise New Query</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Stats Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
          <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-200/60">
            <span className="text-[11px] font-semibold text-slate-500 block">Total Queries</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
              <span className="text-[10px] text-slate-400 font-medium">Logged</span>
            </div>
          </div>

          <div className="bg-amber-50/60 rounded-2xl p-3.5 border border-amber-200/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-700">Open & Pending</span>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-amber-900">{stats.open}</span>
              <span className="text-[10px] text-amber-600 font-medium">Action Required</span>
            </div>
          </div>

          <div className="bg-indigo-50/60 rounded-2xl p-3.5 border border-indigo-200/60">
            <span className="text-[11px] font-semibold text-indigo-700 block">In Progress</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-indigo-900">{stats.inProgress}</span>
              <span className="text-[10px] text-indigo-600 font-medium">Under Review</span>
            </div>
          </div>

          <div className="bg-emerald-50/60 rounded-2xl p-3.5 border border-emerald-200/60">
            <span className="text-[11px] font-semibold text-emerald-700 block">Resolved</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-900">{stats.resolved}</span>
              <span className="text-[10px] text-emerald-600 font-medium">Closed Today</span>
            </div>
          </div>

          <div className="bg-rose-50/60 rounded-2xl p-3.5 border border-rose-200/60 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-rose-700">Urgent Priority</span>
              <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-rose-900">{stats.urgent}</span>
              <span className="text-[10px] text-rose-600 font-medium">Escalated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Split Helpdesk Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[700px]">
        {/* Left Column: Query Tickets List (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden">
          {/* List Search & Filter Toolbar */}
          <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/40">
            {/* Scope Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl">
              <button
                type="button"
                onClick={() => setScopeTab('all')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  scopeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Queries ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setScopeTab('my')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  scopeTab === 'my'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                My Queries ({stats.myQueries})
              </button>
              {isAdminOrManager && (
                <button
                  type="button"
                  onClick={() => setScopeTab('assigned')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    scopeTab === 'assigned'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Assigned
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket #, subject, sender, reference..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Selectors */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-[11px] px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="text-[11px] px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Priority</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-[11px] px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-500 max-w-[140px] truncate"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tickets Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[620px] scrollbar-thin scrollbar-thumb-slate-200">
            {filteredQueries.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-slate-700">No queries matching current criteria</p>
                <p className="text-[11px] text-slate-400">
                  Try clearing the filters or click "Raise New Query" above to initiate a support request.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatus('all');
                    setSelectedPriority('all');
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              filteredQueries.map((ticket) => {
                const isSelected = activeTicket?.id === ticket.id;
                const lastMessage = ticket.messages[ticket.messages.length - 1];

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setActiveTicketId(ticket.id)}
                    className={`p-4 transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-indigo-50/60 border-l-4 border-indigo-600'
                        : 'hover:bg-slate-50/80 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-indigo-600">
                          {ticket.ticketNo}
                        </span>
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {ticket.messages[0]?.timestamp.split(',')[0]}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1 leading-snug">
                      {ticket.title}
                    </h3>

                    {lastMessage && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mb-2 font-normal">
                        <span className="font-semibold text-slate-700">
                          {lastMessage.senderName.split(' ')[0]}:
                        </span>{' '}
                        {lastMessage.message}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5">
                        <img
                          src={ticket.requesterAvatar}
                          alt={ticket.requesterName}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        <span className="font-medium text-slate-600 truncate max-w-[120px]">
                          {ticket.requesterName}
                        </span>
                        <span>•</span>
                        <span className="truncate max-w-[130px] font-medium text-slate-500">
                          {ticket.category.split('&')[0]}
                        </span>
                      </div>

                      {ticket.referenceId && (
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 font-mono text-[9px] font-semibold text-slate-600">
                          {ticket.referenceId}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Chat Thread & Action Console (7 cols on lg) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden">
          {activeTicket ? (
            <>
              {/* Active Conversation Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                        {activeTicket.ticketNo}
                      </span>
                      {getStatusBadge(activeTicket.status)}
                      {getPriorityBadge(activeTicket.priority)}
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-600">
                        {activeTicket.category}
                      </span>
                    </div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {activeTicket.title}
                    </h2>
                  </div>

                  {/* Status & Assignment Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status Dropdown */}
                    <div className="relative">
                      <select
                        value={activeTicket.status}
                        onChange={(e) => updateQueryStatus(activeTicket.id, e.target.value as QueryStatus)}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="open">Status: Open</option>
                        <option value="in_progress">Status: In Progress</option>
                        <option value="resolved">Status: Resolved</option>
                        <option value="closed">Status: Closed</option>
                      </select>
                    </div>

                    {/* Quick Resolve Button for Employee if satisfied */}
                    {activeTicket.status !== 'resolved' && activeTicket.status !== 'closed' && (
                      <button
                        type="button"
                        onClick={() => updateQueryStatus(activeTicket.id, 'resolved')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                        title="Mark query as resolved"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Resolve</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Requester Metadata Ribbon */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={activeTicket.requesterAvatar}
                      alt={activeTicket.requesterName}
                      className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
                    />
                    <div>
                      <span className="font-bold text-slate-800">{activeTicket.requesterName}</span>
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span className="text-slate-500 font-medium">{activeTicket.requesterDepartment}</span>
                    </div>
                    {getRoleBadge(activeTicket.requesterRole)}
                  </div>

                  {activeTicket.referenceId && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium text-[11px]">
                      <Tag className="w-3 h-3 text-indigo-500" />
                      <span>Ref:</span>
                      <span className="font-mono font-bold">{activeTicket.referenceId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Thread Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-h-[500px] scrollbar-thin scrollbar-thumb-slate-200">
                {/* Initial Query Card Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">Initial Issue Brief</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-[11px] text-slate-500">Created {activeTicket.messages[0]?.timestamp}</span>
                    </div>
                    <span className="font-mono text-[10px] font-semibold text-slate-500">
                      Logged via Web Portal
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">
                    {activeTicket.messages[0]?.message}
                  </p>
                </div>

                {/* Subsequent Messages */}
                {activeTicket.messages.slice(1).map((msg) => {
                  const isSystem = msg.senderId === 'system';
                  const isMine = msg.senderId === currentUser?.id;

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="text-center my-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200">
                          <Info className="w-3 h-3 text-slate-500" />
                          <span>{msg.message}</span>
                          <span className="text-slate-400">({msg.timestamp})</span>
                        </span>
                      </div>
                    );
                  }

                  const isInternal = Boolean(msg.isInternalNote);

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <img
                        src={msg.senderAvatar}
                        alt={msg.senderName}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-xs shrink-0"
                      />

                      <div className={`space-y-1 max-w-[85%] sm:max-w-[75%]`}>
                        <div
                          className={`flex items-center gap-2 text-[11px] ${
                            isMine ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <span className="font-bold text-slate-800">{msg.senderName}</span>
                          {getRoleBadge(msg.senderRole)}
                          <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                          {isInternal && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-md">
                              <Lock className="w-2.5 h-2.5" /> Note
                            </span>
                          )}
                        </div>

                        <div
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed font-sans shadow-xs ${
                            isInternal
                              ? 'bg-amber-50 border border-amber-200 text-amber-900'
                              : isMine
                              ? 'bg-indigo-600 text-white rounded-tr-xs'
                              : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs shadow-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.message}</p>

                          {msg.attachmentName && (
                            <div
                              className={`mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] font-mono ${
                                isMine ? 'bg-indigo-700/60 text-indigo-100' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              <span className="truncate">{msg.attachmentName}</span>
                              <span className="text-[9px] opacity-75 font-sans">(Verified Attachment)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Simulation indicator */}
                {isSimulatingBotReply && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 italic p-2 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Operations Management desk is typing response...</span>
                  </div>
                )}

                <div ref={chatScrollEndRef} />
              </div>

              {/* Quick Canned Suggestions */}
              <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  Quick:
                </span>
                {(isAdminOrManager ? CANNED_REPLIES_ADMIN : CANNED_REPLIES_EMPLOYEE).map((reply, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReplyMessage(reply)}
                    className="text-[11px] px-2.5 py-1 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 transition-all shrink-0 cursor-pointer text-left"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Message Composition Input Area */}
              <div className="p-4 border-t border-slate-100 bg-white space-y-2">
                {attachedFileName && (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs border border-indigo-100">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-mono font-medium">{attachedFileName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedFileName(null)}
                      className="text-indigo-400 hover:text-indigo-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="space-y-2">
                  <div className="relative flex items-end gap-2">
                    <textarea
                      rows={2}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={
                        isInternalNote
                          ? 'Write an internal management note (private to Admin & Managers)...'
                          : `Type message as ${currentUser?.name || 'Authorized User'}... (Press Enter to send)`
                      }
                      className={`w-full p-3 rounded-2xl border text-xs focus:outline-none transition-all resize-none ${
                        isInternalNote
                          ? 'bg-amber-50/50 border-amber-300 text-amber-900 focus:ring-2 focus:ring-amber-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10'
                      }`}
                    />

                    <button
                      type="submit"
                      disabled={!replyMessage.trim()}
                      className="h-11 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Attachment & Note Options */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const mockFiles = [
                            'transport_lr_counterfoil.pdf',
                            'chemical_batch_lab_report.pdf',
                            'transporter_damage_photos.png',
                            'customer_debit_note_signed.pdf',
                          ];
                          const picked = mockFiles[Math.floor(Math.random() * mockFiles.length)];
                          setAttachedFileName(picked);
                        }}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 cursor-pointer text-[11px]"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>Attach Document</span>
                      </button>

                      {isAdminOrManager && (
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-amber-800">
                          <input
                            type="checkbox"
                            checked={isInternalNote}
                            onChange={(e) => setIsInternalNote(e.target.checked)}
                            className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                          />
                          <span>Internal Admin Note</span>
                        </label>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400">
                      Press <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Enter</kbd> to send
                    </span>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-12 text-center text-slate-400 space-y-3">
              <div>
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Select a query ticket to view conversation</p>
                <p className="text-xs text-slate-400">Or click "Raise New Query" to start a new support request.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Raise New Query Modal */}
      {isNewQueryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Raise New Operational Query / Ticket</h3>
                  <p className="text-[11px] text-slate-500">Escalate an inquiry or approval request directly to management</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewQueryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewQuery} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Query Subject / Issue Summary <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Discount authorization: 12% needed for Kisan Agro bulk booking"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as QueryCategory)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Priority Level <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as QueryPriority)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                  >
                    <option value="Low">Low (General guidance)</option>
                    <option value="Normal">Normal (Standard operational inquiry)</option>
                    <option value="High">High (Impacting today's dispatch/booking)</option>
                    <option value="Urgent">Urgent (Immediate executive sign-off needed)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reference Type (Optional)
                  </label>
                  <select
                    value={newReferenceType}
                    onChange={(e) => setNewReferenceType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                  >
                    <option value="General">General / None</option>
                    <option value="Quotation">Quotation (QT)</option>
                    <option value="Order">Sales Order (SO)</option>
                    <option value="Customer">Customer Account</option>
                    <option value="GRN">Goods Receipt Note (GRN)</option>
                    <option value="Batch">Chemical Batch</option>
                    <option value="Expense">Expense Claim (EXP)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reference ID / Number
                  </label>
                  <input
                    type="text"
                    value={newReferenceId}
                    onChange={(e) => setNewReferenceId(e.target.value)}
                    placeholder="e.g. QT-2026-004 or SO-2026-088"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Query Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={newInitialMessage}
                  onChange={(e) => setNewInitialMessage(e.target.value)}
                  placeholder="Provide complete background, operational reasons, and what authorization or clarification is needed..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supporting Attachment Name
                </label>
                <input
                  type="text"
                  value={newAttachmentName}
                  onChange={(e) => setNewAttachmentName(e.target.value)}
                  placeholder="e.g. quotation_breakdown.pdf or damaged_drums_photo.jpg"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewQueryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Submit & Open Query Thread
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
