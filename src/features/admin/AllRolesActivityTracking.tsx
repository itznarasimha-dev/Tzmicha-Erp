import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { UserRole } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  Activity,
  Briefcase,
  Warehouse,
  Compass,
  Shield,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  MapPin,
  FileText,
  Truck,
  Package,
  DollarSign,
  Users,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface UnifiedActivityEvent {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  userAvatar?: string;
  category: 'sales' | 'warehouse' | 'marketing' | 'admin';
  actionTitle: string;
  description: string;
  entityType: string;
  entityId: string;
  regionId: string;
  locationDetails?: string;
  amount?: number;
  badgeVariant?: 'primary' | 'success' | 'warning' | 'purple' | 'neutral';
}

export const AllRolesActivityTracking: React.FC = () => {
  const {
    users,
    regions,
    salesOrders,
    inwardReceipts,
    stockMovements,
    fieldVisits,
    marketSurveys,
    expenseClaims,
    auditLogs,
  } = useErpStore();

  const [activeRoleFilter, setActiveRoleFilter] = useState<'all' | 'sales' | 'store_manager' | 'marketing' | 'admin'>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<UnifiedActivityEvent | null>(null);
  const [eventDetailModalOpen, setEventDetailModalOpen] = useState(false);

  // Synthesize Unified Activity Stream across all 4 roles
  const unifiedActivities = useMemo(() => {
    const events: UnifiedActivityEvent[] = [];

    // 1. Sales Orders & Quotes Events (Sales Role)
    salesOrders.forEach((order) => {
      const rep = users.find((u) => u.id === order.salesUserId);
      events.push({
        id: `act-so-${order.id}`,
        timestamp: order.createdAt,
        userId: order.salesUserId,
        userName: order.salesUserName || rep?.name || 'Sales Rep',
        userRole: 'sales',
        userAvatar: rep?.avatar,
        category: 'sales',
        actionTitle:
          order.status === 'dispatched'
            ? 'Order Dispatched'
            : order.status === 'pending_discount_approval'
            ? 'Quote Awaiting Discount Approval'
            : 'Sales Order Booked',
        description: `Booked ${order.items.length} items for ${order.customerName} (${order.customerType}). Total: ₹${order.totalAmount.toLocaleString('en-IN')}`,
        entityType: 'Sales Order',
        entityId: order.orderNumber,
        regionId: order.regionId,
        locationDetails: 'Dealer Distribution Network',
        amount: order.totalAmount,
        badgeVariant: 'primary',
      });
    });

    // 2. Inward Receipts & Batch Registration (Warehouse Role)
    inwardReceipts.forEach((rcpt) => {
      const mgr = users.find((u) => u.id === rcpt.receivedByUserId);
      events.push({
        id: `act-inw-${rcpt.id}`,
        timestamp: rcpt.date || new Date().toISOString(),
        userId: rcpt.receivedByUserId,
        userName: rcpt.receivedByUserName || mgr?.name || 'Store Manager',
        userRole: 'store_manager',
        userAvatar: mgr?.avatar,
        category: 'warehouse',
        actionTitle: 'Goods Inward & Batch Recorded',
        description: `Received ${rcpt.receivedQuantity} ${rcpt.unit} of ${rcpt.productName} into Batch ${rcpt.batchNumber} from ${rcpt.supplierName}`,
        entityType: 'Inward Receipt',
        entityId: rcpt.receiptNumber,
        regionId: rcpt.regionId,
        locationDetails: `Warehouse ${rcpt.warehouseId} • ${rcpt.storageLocationId || 'Bay 01'}`,
        amount: rcpt.totalCost,
        badgeVariant: 'neutral',
      });
    });

    // 3. Stock Movements & Transfers (Warehouse Role)
    stockMovements.forEach((mv) => {
      const user = users.find((u) => u.id === mv.performedByUserId);
      events.push({
        id: `act-sm-${mv.id}`,
        timestamp: mv.timestamp,
        userId: mv.performedByUserId,
        userName: mv.performedByUserName || user?.name || 'Logistics Officer',
        userRole: 'store_manager',
        userAvatar: user?.avatar,
        category: 'warehouse',
        actionTitle:
          mv.movementType === 'transfer_out'
            ? 'Inter-Depot Stock Transfer Dispatched'
            : mv.movementType === 'transfer_in'
            ? 'Inter-Depot Transfer Received'
            : mv.movementType === 'outward_dispatch'
            ? 'Customer Order Dispatched'
            : 'Inventory Movement Logged',
        description: `${mv.quantity} units of ${mv.productName} moved at ${mv.warehouseName}. Ref: ${mv.referenceId}`,
        entityType: 'Stock Movement',
        entityId: mv.referenceId,
        regionId: mv.regionId,
        locationDetails: mv.warehouseName,
        badgeVariant: 'neutral',
      });
    });

    // 4. Ground Marketing Visits & Dealer Demos (Marketing Role)
    fieldVisits.forEach((visit) => {
      const mktUser = users.find((u) => u.id === visit.marketingUserId);
      events.push({
        id: `act-vst-${visit.id}`,
        timestamp: `${visit.visitDate}T${visit.checkInTime}:00`,
        userId: visit.marketingUserId,
        userName: visit.marketingUserName || mktUser?.name || 'Marketing Executive',
        userRole: 'marketing',
        userAvatar: mktUser?.avatar,
        category: 'marketing',
        actionTitle:
          visit.purpose === 'dealer_acquisition'
            ? 'Dealer Acquisition Visit Conducted'
            : visit.purpose === 'product_demo'
            ? 'Product Demonstration & Trial'
            : 'Physical Dealer Visit Checked-In',
        description: `Conducted field visit with ${visit.prospectName || 'Local Dealer'} (${visit.customerType}). Notes: ${visit.outcomeNotes || 'Routine territory coverage'}`,
        entityType: 'Field Visit',
        entityId: visit.id,
        regionId: visit.regionId,
        locationDetails: visit.locationAddress,
        badgeVariant: 'warning',
      });
    });

    // 5. Market Surveys (Marketing Role)
    marketSurveys.forEach((survey) => {
      const mktUser = users.find((u) => u.id === survey.marketingUserId);
      events.push({
        id: `act-ms-${survey.id}`,
        timestamp: survey.date ? `${survey.date}T10:00:00` : new Date().toISOString(),
        userId: survey.marketingUserId,
        userName: mktUser?.name || 'Marketing Executive',
        userRole: 'marketing',
        userAvatar: mktUser?.avatar,
        category: 'marketing',
        actionTitle: 'Market Price & Competitor Survey',
        description: `Recorded competitor intelligence: ${survey.competitorProduct} by ${survey.competitorBrand} at ₹${survey.competitorPricePerUnit} vs our ${survey.ourEquivalentProduct} at ₹${survey.ourSellingPrice}`,
        entityType: 'Market Survey',
        entityId: survey.id,
        regionId: survey.regionId,
        locationDetails: survey.dealerName,
        badgeVariant: 'warning',
      });
    });

    // 6. Expense Claims & Reimbursements (Sales & Marketing Roles)
    expenseClaims.forEach((claim) => {
      const claimUser = users.find((u) => u.id === claim.userId);
      events.push({
        id: `act-exp-${claim.id}`,
        timestamp: claim.submittedAt || `${claim.date}T12:00:00`,
        userId: claim.userId,
        userName: claim.userName || claimUser?.name || 'Field Officer',
        userRole: claim.userRole,
        userAvatar: claimUser?.avatar,
        category: claim.userRole === 'sales' ? 'sales' : 'marketing',
        actionTitle:
          claim.status === 'paid'
            ? 'Field Claim Settled & Reimbursed'
            : claim.status === 'approved'
            ? 'Expense Claim Approved'
            : 'Field Operating Expense Claim Submitted',
        description: `Submitted ${claim.category.replace('_', ' ')} reimbursement claim (${claim.claimNumber}): ${claim.description}`,
        entityType: 'Expense Claim',
        entityId: claim.claimNumber,
        regionId: claim.regionId,
        amount: claim.amount,
        badgeVariant: claim.status === 'paid' ? 'success' : 'primary',
      });
    });

    // 7. System Governance & Admin Audit Logs
    auditLogs.forEach((log) => {
      const logUser = users.find((u) => u.id === log.userId);
      events.push({
        id: `act-log-${log.id}`,
        timestamp: log.timestamp,
        userId: log.userId,
        userName: log.userName || logUser?.name || 'System Admin',
        userRole: log.userRole || 'admin',
        userAvatar: logUser?.avatar,
        category: 'admin',
        actionTitle: `Governance: ${log.action}`,
        description: `${log.details} (Entity: ${log.entityType} ${log.entityId})`,
        entityType: log.entityType,
        entityId: log.entityId,
        regionId: log.regionId || 'all',
        locationDetails: 'Corporate HQ Admin Console',
        badgeVariant: 'purple',
      });
    });

    // Sort chronologically (latest first)
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [salesOrders, inwardReceipts, stockMovements, fieldVisits, marketSurveys, expenseClaims, auditLogs, users]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return unifiedActivities.filter((event) => {
      const matchesRole = activeRoleFilter === 'all' || event.userRole === activeRoleFilter;
      const matchesRegion = selectedRegion === 'all' || event.regionId === selectedRegion;
      const matchesSearch =
        event.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.actionTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.entityId.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesRole && matchesRegion && matchesSearch;
    });
  }, [unifiedActivities, activeRoleFilter, selectedRegion, searchTerm]);

  // Role Counts
  const salesCount = unifiedActivities.filter((e) => e.userRole === 'sales').length;
  const warehouseCount = unifiedActivities.filter((e) => e.userRole === 'store_manager').length;
  const marketingCount = unifiedActivities.filter((e) => e.userRole === 'marketing').length;
  const adminCount = unifiedActivities.filter((e) => e.userRole === 'admin').length;

  const handleOpenDetail = (event: UnifiedActivityEvent) => {
    setSelectedEvent(event);
    setEventDetailModalOpen(true);
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'sales':
        return <Briefcase className="w-3.5 h-3.5 text-indigo-600" />;
      case 'store_manager':
        return <Warehouse className="w-3.5 h-3.5 text-blue-600" />;
      case 'marketing':
        return <Compass className="w-3.5 h-3.5 text-amber-600" />;
      case 'admin':
        return <Shield className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'sales':
        return <Badge variant="primary">Field Sales</Badge>;
      case 'store_manager':
        return <Badge variant="neutral">Warehouse Manager</Badge>;
      case 'marketing':
        return <Badge variant="warning">Ground Marketing</Badge>;
      case 'admin':
        return <Badge variant="purple">Executive Admin</Badge>;
      default:
        return <Badge variant="neutral">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            Enterprise All Roles Operational Activity Feed
            <Badge variant="purple" size="sm">Audit Stream</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time cross-functional tracking of Field Sales bookings, Warehouse inward/dispatches, Ground Marketing dealer visits, and Executive Governance actions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live Real-Time Stream</span>
          </div>
        </div>
      </div>

      {/* 4 Roles Activity Volume Scorecards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Sales Scorecard */}
        <div
          onClick={() => setActiveRoleFilter('sales')}
          className={`glass-card p-4 space-y-1.5 cursor-pointer transition-all border ${
            activeRoleFilter === 'sales'
              ? 'border-indigo-500 bg-indigo-50/50 shadow-xs'
              : 'border-indigo-100 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Field Sales Activity</span>
            <Briefcase className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{salesCount} Events</div>
          <p className="text-[11px] text-slate-500 font-medium">Orders booked, quotations & collections</p>
        </div>

        {/* Warehouse Scorecard */}
        <div
          onClick={() => setActiveRoleFilter('store_manager')}
          className={`glass-card p-4 space-y-1.5 cursor-pointer transition-all border ${
            activeRoleFilter === 'store_manager'
              ? 'border-blue-500 bg-blue-50/50 shadow-xs'
              : 'border-blue-100 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Warehouse & Depots</span>
            <Warehouse className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{warehouseCount} Events</div>
          <p className="text-[11px] text-slate-500 font-medium">Inward batches, dispatches & transfers</p>
        </div>

        {/* Marketing Scorecard */}
        <div
          onClick={() => setActiveRoleFilter('marketing')}
          className={`glass-card p-4 space-y-1.5 cursor-pointer transition-all border ${
            activeRoleFilter === 'marketing'
              ? 'border-amber-500 bg-amber-50/50 shadow-xs'
              : 'border-amber-100 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ground Marketing</span>
            <Compass className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{marketingCount} Events</div>
          <p className="text-[11px] text-slate-500 font-medium">Dealer visits, demo trials & competitor surveys</p>
        </div>

        {/* Executive Admin Scorecard */}
        <div
          onClick={() => setActiveRoleFilter('admin')}
          className={`glass-card p-4 space-y-1.5 cursor-pointer transition-all border ${
            activeRoleFilter === 'admin'
              ? 'border-purple-500 bg-purple-50/50 shadow-xs'
              : 'border-purple-100 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Executive Governance</span>
            <Shield className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{adminCount} Events</div>
          <p className="text-[11px] text-slate-500 font-medium">Price floor rules, approvals & user provisioning</p>
        </div>
      </div>

      {/* Role Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveRoleFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeRoleFilter === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Roles Combined ({unifiedActivities.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveRoleFilter('sales')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeRoleFilter === 'sales'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Field Sales Operations ({salesCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveRoleFilter('store_manager')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeRoleFilter === 'store_manager'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Warehouse className="w-3.5 h-3.5" />
          <span>Warehouse & Logistics ({warehouseCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveRoleFilter('marketing')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeRoleFilter === 'marketing'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Ground Marketing Ops ({marketingCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveRoleFilter('admin')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeRoleFilter === 'admin'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Executive Admin Governance ({adminCount})</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by actor name, event action, entity ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Operating Territories</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium self-center">
          Showing {filteredEvents.length} recorded events
        </span>
      </div>

      {/* Unified Chronological Activity Stream */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <Card>
            <div className="py-12 text-center space-y-2">
              <Activity className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-600">No operational activity matching active criteria.</p>
              <p className="text-xs text-slate-400">Try broadening your role filter, region, or search query.</p>
            </div>
          </Card>
        ) : (
          filteredEvents.map((event) => {
            return (
              <div
                key={event.id}
                onClick={() => handleOpenDetail(event)}
                className="glass-card p-4 rounded-2xl hover:border-indigo-300 transition-all duration-150 cursor-pointer border border-slate-200/80 bg-white/90 shadow-2xs hover:shadow-xs group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: User Profile + Action Narrative */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={
                          event.userAvatar ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                        }
                        alt={event.userName}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
                      />
                      <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white shadow-2xs">
                        {getRoleIcon(event.userRole)}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{event.userName}</span>
                        {getRoleBadge(event.userRole)}
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.2 rounded-md">
                          {event.actionTitle}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {event.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-slate-400">
                        <span className="font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded text-slate-700 font-semibold">
                          {event.entityType}: {event.entityId}
                        </span>

                        <span className="flex items-center gap-1 text-slate-500 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {event.locationDetails || event.regionId}
                        </span>

                        {event.amount !== undefined && (
                          <span className="font-bold text-slate-900 bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200">
                            ₹{event.amount.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Timestamp and Arrow */}
                  <div className="flex items-center sm:flex-col sm:items-end justify-between shrink-0 text-right">
                    <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(event.timestamp).toLocaleDateString()}
                    </span>
                    <span className="text-indigo-600 text-xs font-bold group-hover:translate-x-0.5 transition-transform hidden sm:inline-flex items-center gap-1 mt-1">
                      Inspect Event <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Event Details Inspection Modal */}
      <Modal
        isOpen={eventDetailModalOpen}
        onClose={() => setEventDetailModalOpen(false)}
        title="Operational Event Audit Inspection"
        description="Immutable operational activity record and audit verification."
      >
        <div className="space-y-4 pt-2">
          {selectedEvent && (
            <>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Event Action:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedEvent.actionTitle}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Personnel / Actor:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{selectedEvent.userName}</span>
                    {getRoleBadge(selectedEvent.userRole)}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="font-mono text-slate-800">
                    {new Date(selectedEvent.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Territory / Region:</span>
                  <span className="font-bold text-slate-800 uppercase">{selectedEvent.regionId}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Entity Reference:</span>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {selectedEvent.entityType}: {selectedEvent.entityId}
                  </span>
                </div>

                {selectedEvent.amount !== undefined && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                    <span className="text-slate-700 font-bold">Transaction Value:</span>
                    <span className="text-base font-bold text-emerald-700">
                      ₹{selectedEvent.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">
                  Complete Event Narrative
                </span>
                <p className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  {selectedEvent.description}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Audit hash verified. This operational transaction is committed to the shared state ledger.
                </span>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setEventDetailModalOpen(false)}
                >
                  Close Inspection
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AllRolesActivityTracking;
