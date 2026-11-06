import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { InwardReceipt, ReceivingDiscrepancy, TransitDamageIncident, TransitResponsibility } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select, SearchInput } from '../../components/ui/Input';
import {
  Truck,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Warehouse,
  ShieldCheck,
  Calendar,
  Layers,
  Filter,
  Plus,
  RefreshCw,
  FileText,
  DollarSign,
  PackageCheck,
  AlertCircle,
  HelpCircle,
  Camera,
  XCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  MapPin,
  Check,
  RotateCcw,
} from 'lucide-react';

export const AdminInwardReceivingView: React.FC = () => {
  const {
    inwardReceipts,
    warehouses,
    regions,
    suppliers,
    purchaseOrders,
    products,
    receivingDiscrepancies,
    transitDamageIncidents,
    selectedRegionId,
    setSelectedRegionId,
    currentUser,
    planIncomingGoods,
    resolveDiscrepancy,
    postGoodsReceiptToInventory,
    updateTransitIncident,
    recordAdminInspectionDecision,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'grn' | 'damage_review' | 'discrepancies' | 'transit_incidents'>('grn');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<InwardReceipt | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Admin Damage Review Drawer / Modal State
  const [damageReviewReceipt, setDamageReviewReceipt] = useState<InwardReceipt | null>(null);
  const [damageDecisionNotes, setDamageDecisionNotes] = useState('');

  // Plan Incoming Consignment Modal state
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planSupplierId, setPlanSupplierId] = useState(suppliers[0]?.id || 'sup-001');
  const [planPoId, setPlanPoId] = useState(purchaseOrders[0]?.id || '');
  const [planProductId, setPlanProductId] = useState(products[0]?.id || 'prod-001');
  const [planRegionId, setPlanRegionId] = useState('reg-north');
  const [planWarehouseId, setPlanWarehouseId] = useState('wh-north-01');
  const [planExpectedQty, setPlanExpectedQty] = useState('100');
  const [planTransportExpense, setPlanTransportExpense] = useState('3500');
  const [planExpectedDate, setPlanExpectedDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );
  const [planNotes, setPlanNotes] = useState('');

  // Discrepancy Resolution Modal state
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<ReceivingDiscrepancy | null>(null);
  const [resolutionAction, setResolutionAction] = useState<'supplier_credit_note' | 'replacement_shipment' | 'company_writeoff'>('supplier_credit_note');
  const [creditNoteNum, setCreditNoteNum] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Region and search filtering
  const filteredReceipts = inwardReceipts.filter((r) => {
    const matchesRegion = selectedRegionId === 'all' || r.regionId === selectedRegionId;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch =
      r.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.supplierInvoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRegion && matchesStatus && matchesSearch;
  });

  const pendingDamageReviews = inwardReceipts.filter((r) => {
    const matchesRegion = selectedRegionId === 'all' || r.regionId === selectedRegionId;
    const hasDamage = (r.damagedQuantity || 0) > 0 || r.status === 'pending_admin_approval' || r.status === 'partially_accepted' || r.status === 'rejected';
    return matchesRegion && hasDamage;
  });

  const filteredDiscrepancies = receivingDiscrepancies.filter((d) => {
    return (
      (d.discrepancyNumber || d.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const filteredTransitIncidents = (transitDamageIncidents || []).filter((t) => {
    return (
      t.incidentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.transporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.consignmentNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // KPI Calculations
  const totalInwardValue = inwardReceipts
    .filter((r) => selectedRegionId === 'all' || r.regionId === selectedRegionId)
    .reduce((sum, r) => sum + r.totalCost, 0);

  const availableStockCount = inwardReceipts.filter(
    (r) => (selectedRegionId === 'all' || r.regionId === selectedRegionId) && r.status === 'stock_available'
  ).length;

  const awaitingInspectionCount = inwardReceipts.filter(
    (r) => (selectedRegionId === 'all' || r.regionId === selectedRegionId) && (r.status === 'received' || r.status === 'awaiting_inspection')
  ).length;

  const openDiscrepanciesCount = receivingDiscrepancies.filter((d) => d.status !== 'resolved').length;
  const openDamageApprovalsCount = inwardReceipts.filter((r) => r.status === 'pending_admin_approval' || ((r.damagedQuantity || 0) > 0 && !r.adminDecision)).length;

  const handlePostToStock = (receiptId: string) => {
    const res = postGoodsReceiptToInventory(receiptId);
    if (res.success) {
      setActionSuccessMessage('Eligible stock successfully verified and posted to active inventory!');
      setTimeout(() => setActionSuccessMessage(null), 4000);
      if (selectedReceipt && selectedReceipt.id === receiptId) {
        setSelectedReceipt({
          ...selectedReceipt,
          status: 'stock_available',
          stockPostedAt: new Date().toISOString(),
          stockPostedByUserId: currentUser?.id,
        });
      }
    } else {
      alert(res.message);
    }
  };

  const handleCreatePlannedConsignment = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === planSupplierId);
    const prod = products.find((p) => p.id === planProductId);
    const po = purchaseOrders.find((p) => p.id === planPoId);

    const newReceipt = planIncomingGoods({
      poId: planPoId || undefined,
      poNumber: po?.poNumber,
      supplierId: planSupplierId,
      supplierName: sup?.name || 'Authorized Supplier',
      productId: planProductId,
      expectedQuantity: parseFloat(planExpectedQty) || 100,
      actualUnitCost: prod?.actualCost || 5000,
      regionId: planRegionId,
      warehouseId: planWarehouseId,
      expectedDate: planExpectedDate,
      transportExpense: parseFloat(planTransportExpense) || 0,
      notes: planNotes,
    });

    setActionSuccessMessage(`Consignment ${newReceipt.receiptNumber} scheduled for Store Keeper dock inspection.`);
    setTimeout(() => setActionSuccessMessage(null), 4000);
    setPlanModalOpen(false);
  };

  const handleAdminDamageDecision = (decision: 'partial_acceptance' | 'full_rejection' | 'hold_for_clarification') => {
    if (!damageReviewReceipt) return;

    const res = recordAdminInspectionDecision(
      damageReviewReceipt.id,
      decision,
      damageDecisionNotes || `Admin authorized decision '${decision.replace(/_/g, ' ')}' on dock inspection.`
    );

    if (res.success) {
      setActionSuccessMessage(res.message);
      setTimeout(() => setActionSuccessMessage(null), 5000);
      setDamageReviewReceipt(null);
      setDamageDecisionNotes('');
    }
  };

  const handleResolveDiscrepancy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiscrepancy) return;

    resolveDiscrepancy(selectedDiscrepancy.id, {
      status: 'resolved',
      resolutionType: resolutionAction === 'supplier_credit_note' ? 'supplier_credit_note' : resolutionAction === 'replacement_shipment' ? 'supplier_replacement' : 'inventory_writeoff',
      resolutionNotes: resolutionNotes || `Resolved via ${resolutionAction.replace(/_/g, ' ')}`,
      creditNoteNumber: creditNoteNum || undefined,
    });

    setActionSuccessMessage(`Discrepancy ${selectedDiscrepancy.discrepancyNumber || selectedDiscrepancy.id} resolved successfully!`);
    setTimeout(() => setActionSuccessMessage(null), 4000);
    setSelectedDiscrepancy(null);
  };

  const handleUpdateTransitResponsibility = (incidentId: string, responsibility: TransitResponsibility) => {
    updateTransitIncident(incidentId, {
      responsibilityStatus: responsibility,
      responsibilityNotes: `Responsibility designated as '${responsibility.replace(/_/g, ' ')}' by Admin on ${new Date().toLocaleDateString('en-IN')}`,
    });
    setActionSuccessMessage(`Transit responsibility updated to ${responsibility.replace(/_/g, ' ').toUpperCase()}`);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const handleUpdateTransitResolution = (
    incidentId: string,
    resolution: TransitDamageIncident['resolutionStatus']
  ) => {
    updateTransitIncident(incidentId, {
      resolutionStatus: resolution,
      resolutionNotes: `Carrier action taken: ${resolution.replace(/_/g, ' ').toUpperCase()} on ${new Date().toLocaleDateString('en-IN')}`,
    });
    setActionSuccessMessage(`Incident resolution filed: ${resolution.replace(/_/g, ' ').toUpperCase()}`);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const getWarehouseName = (whId: string) => {
    return warehouses.find((w) => w.id === whId)?.name || whId;
  };

  const getRegionName = (regId: string) => {
    return regions.find((r) => r.id === regId)?.name || regId;
  };

  const renderStatusBadge = (status: InwardReceipt['status']) => {
    switch (status) {
      case 'stock_available':
        return <Badge variant="success" size="sm">Stock Available</Badge>;
      case 'pending_admin_approval':
        return <Badge variant="danger" size="sm">Pending Damage Approval</Badge>;
      case 'partially_accepted':
        return <Badge variant="warning" size="sm">Partially Accepted (RGP Issued)</Badge>;
      case 'rejected':
        return <Badge variant="danger" size="sm">Full Rejection (Zero Stock)</Badge>;
      case 'awaiting_inspection':
      case 'received':
        return <Badge variant="warning" size="sm">Awaiting Dock Inspection</Badge>;
      case 'returned':
        return <Badge variant="neutral" size="sm">Returned to Vendor</Badge>;
      case 'draft':
      case 'expected':
      default:
        return <Badge variant="neutral" size="sm">Expected Inward</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="purple" size="sm">Inventory Lifecycle</Badge>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">Inbound Supply Chain</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            Inward Consignments, GRN &amp; Damage Approval
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative audit of supplier deliveries, dock inspection reconciliation, supplier damage approval choices, and freight transit liability claims.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Depot Scope Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-xs">
            <Warehouse className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold text-slate-700">Depot:</span>
            <select
              value={selectedRegionId}
              onChange={(e) => setSelectedRegionId(e.target.value)}
              className="bg-transparent text-indigo-700 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All Regional Depots</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Plan Incoming Consignment Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setPlanModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Plan Incoming Consignment
          </Button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 border border-indigo-200 bg-indigo-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Total Inward Value</p>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
              ₹{Math.round(totalInwardValue).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Authoritative landed procurement cost</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 border border-emerald-200 bg-emerald-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Stock In Active Inventory</p>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">{availableStockCount} Lots</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Posted and ready for order dispatch</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 border border-rose-200 bg-rose-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Damage Approval Desk</p>
            <div className="text-2xl font-black text-rose-900 mt-0.5 font-mono">
              {openDamageApprovalsCount} Action Required
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Partial accept, full reject, or hold</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 border border-amber-200 bg-amber-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Transit Freight Incidents</p>
            <div className="text-2xl font-black text-amber-900 mt-0.5 font-mono">
              {(transitDamageIncidents || []).length} Incidents
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Carrier liability &amp; insurance claims</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs Switcher: 4 Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('grn')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'grn'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Goods Receipt Notes (GRN Master)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {filteredReceipts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('damage_review')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'damage_review'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <span>Supplier Damage Approval Desk</span>
          {pendingDamageReviews.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
              {pendingDamageReviews.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('discrepancies')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'discrepancies'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Shortage &amp; Discrepancy Log</span>
          {openDiscrepanciesCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
              {openDiscrepanciesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('transit_incidents')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'transit_incidents'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4 text-blue-600" />
          <span>Freight Transit Incidents</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
            {(transitDamageIncidents || []).length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:w-80">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by ID, supplier, product, carrier, or batch..."
            />
          </div>

          {activeTab === 'grn' && (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="glass-input rounded-xl px-3 py-1.5 text-xs text-slate-800 bg-white cursor-pointer"
              >
                <option value="all">All Receipt Statuses</option>
                <option value="stock_available">Stock Available (Posted)</option>
                <option value="pending_admin_approval">Pending Damage Approval</option>
                <option value="partially_accepted">Partially Accepted</option>
                <option value="rejected">Rejected (Full Return)</option>
                <option value="received">Awaiting QC</option>
                <option value="expected">Expected Consignments</option>
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* TAB 1: GRN Master Table */}
      {activeTab === 'grn' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Inward Goods Receipt Notes (GRN Master)</CardTitle>
              <CardDescription>
                Physical deliveries logged at depot dock gates with single-point inventory posting protection.
              </CardDescription>
            </div>
            <Badge variant="neutral" size="sm">
              {filteredReceipts.length} Consignments Found
            </Badge>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">GRN Number</th>
                  <th className="py-3 px-4">Date &amp; Supplier</th>
                  <th className="py-3 px-4">Product &amp; Sourcing</th>
                  <th className="py-3 px-4">Depot &amp; Location</th>
                  <th className="py-3 px-4 text-right">Physical Count</th>
                  <th className="py-3 px-4 text-right">Damage &amp; Shortage</th>
                  <th className="py-3 px-4 text-right">Actual Landed Cost</th>
                  <th className="py-3 px-4 text-center">Consignment Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <Boxes className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No inward consignment receipts found matching the filters.
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((r) => {
                    const prodObj = products.find((p) => p.id === r.productId);
                    const isSupplier = prodObj?.productSource === 'supplier_sourced' || (!prodObj?.productSource && prodObj?.supplierId);
                    const hasDamage = (r.damagedQuantity || 0) > 0 || r.status === 'pending_admin_approval';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                          {r.receiptNumber}
                          <span className="block text-[10px] font-normal text-slate-400 font-sans">
                            Ref: {r.supplierInvoiceNumber}
                          </span>
                          {r.purchaseOrderNumber && (
                            <span className="block text-[10px] font-mono text-indigo-500">
                              PO: {r.purchaseOrderNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{r.supplierName}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(r.date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{r.productName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono text-slate-500">
                              Batch: <strong className="text-indigo-600">{r.batchNumber}</strong>
                            </span>
                            {isSupplier ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Supplier
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Self-Mfg
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900">{getWarehouseName(r.warehouseId)}</div>
                          <div className="text-[11px] text-slate-500">
                            Bay: {r.storageLocationId} • {getRegionName(r.regionId)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          {r.receivedQuantity.toLocaleString('en-IN')}{' '}
                          <span className="text-[10px] font-normal text-slate-500">{r.unit}</span>
                          {r.expectedQuantity && r.expectedQuantity !== r.receivedQuantity && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              Exp: {r.expectedQuantity}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          {(r.damagedQuantity || 0) > 0 ? (
                            <span className="text-rose-700 font-bold block">
                              Dmg: {r.damagedQuantity} {r.unit}
                            </span>
                          ) : null}
                          {(r.shortageQuantity || 0) > 0 ? (
                            <span className="text-amber-700 font-bold block">
                              Short: -{r.shortageQuantity} {r.unit}
                            </span>
                          ) : null}
                          {!(r.damagedQuantity || 0) && !(r.shortageQuantity || 0) && (
                            <span className="text-emerald-700 font-semibold">100% OK</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-indigo-950">
                          ₹{Math.round(r.totalCost).toLocaleString('en-IN')}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            @ ₹{r.actualUnitCost.toLocaleString('en-IN')}/{r.unit}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {renderStatusBadge(r.status)}
                          {r.returnGatePassNumber && (
                            <span className="block font-mono text-[9px] text-rose-700 font-bold mt-1">
                              Pass: {r.returnGatePassNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedReceipt(r)}
                          >
                            Details
                          </Button>
                          {hasDamage && !r.adminDecision && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setDamageReviewReceipt(r);
                                setDamageDecisionNotes('');
                              }}
                              icon={<AlertTriangle className="w-3.5 h-3.5" />}
                            >
                              Review Damage
                            </Button>
                          )}
                          {!r.stockPostedAt && r.status !== 'expected' && r.status !== 'rejected' && r.status !== 'returned' && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handlePostToStock(r.id)}
                            >
                              Post Stock
                            </Button>
                          )}
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

      {/* TAB 2: Supplier Damage Approval Desk */}
      {activeTab === 'damage_review' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Supplier Damage &amp; Rejection Approval Desk</CardTitle>
              <CardDescription>
                Authorized Admin review of consignments with damaged cargo. Select Partial Acceptance (accept good units only), Full Rejection, or Hold for Clarification.
              </CardDescription>
            </div>
            <Badge variant={pendingDamageReviews.length > 0 ? 'danger' : 'success'} size="sm">
              {pendingDamageReviews.length} Consignments Under Review
            </Badge>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">Consignment / GRN</th>
                  <th className="py-3 px-4">Supplier &amp; Carrier</th>
                  <th className="py-3 px-4">Product Inspected</th>
                  <th className="py-3 px-4 text-center">Good Condition</th>
                  <th className="py-3 px-4 text-center">Damaged Quantity</th>
                  <th className="py-3 px-4 text-center">Current Status</th>
                  <th className="py-3 px-4">Admin Decision</th>
                  <th className="py-3 px-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pendingDamageReviews.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                      All damaged consignments have been reviewed and reconciled.
                    </td>
                  </tr>
                ) : (
                  pendingDamageReviews.map((r) => {
                    const goodUnits = r.goodQuantity ?? (r.receivedQuantity - (r.damagedQuantity || 0));
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                          {r.receiptNumber}
                          <span className="block text-[10px] text-slate-500 font-sans">
                            PO: {r.purchaseOrderNumber || 'Direct Inward'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{r.supplierName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Depot: {getWarehouseName(r.warehouseId)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{r.productName}</div>
                          <div className="text-[10px] font-mono text-slate-500">
                            Batch: {r.batchNumber} ({r.productSku})
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-700">
                          {goodUnits} {r.unit}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-700 bg-rose-50/40">
                          {r.damagedQuantity || 0} {r.unit}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {renderStatusBadge(r.status)}
                        </td>
                        <td className="py-3.5 px-4">
                          {r.adminDecision ? (
                            <span className="font-bold text-indigo-900 block capitalize">
                              {r.adminDecision.replace(/_/g, ' ')}
                              {r.returnGatePassNumber && (
                                <span className="block font-mono text-[9px] text-rose-700">
                                  Pass: {r.returnGatePassNumber}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-rose-700 font-bold text-[10px]">Awaiting Admin Action</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setDamageReviewReceipt(r);
                              setDamageDecisionNotes('');
                            }}
                            icon={<ShieldAlert className="w-3.5 h-3.5" />}
                          >
                            Execute Review
                          </Button>
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

      {/* TAB 3: Shortages & Discrepancies Table */}
      {activeTab === 'discrepancies' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Supplier Shortage &amp; Goods-Receipt Discrepancies</CardTitle>
              <CardDescription>
                Auditable physical count variances, shortages, damaged cargo, and supplier credit note / replacement tracking.
              </CardDescription>
            </div>
            <Badge variant={openDiscrepanciesCount > 0 ? 'danger' : 'success'} size="sm">
              {openDiscrepanciesCount} Open Action Items
            </Badge>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">Discrepancy #</th>
                  <th className="py-3 px-4">Receipt Ref &amp; Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-right">Expected</th>
                  <th className="py-3 px-4 text-right">Counted</th>
                  <th className="py-3 px-4 text-right">Shortage / Damage</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredDiscrepancies.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      No receiving discrepancies found.
                    </td>
                  </tr>
                ) : (
                  filteredDiscrepancies.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-700">
                        {d.discrepancyNumber || d.id}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {d.receiptNumber}
                        <span className="block text-[10px] text-slate-400">
                          {new Date(d.reportedAt).toLocaleDateString('en-IN')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{d.supplierName}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{d.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{d.productSku}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">{d.expectedQuantity}</td>
                      <td className="py-3.5 px-4 text-right font-mono">{d.actualCountedQuantity}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-700">
                        {d.shortageQuantity > 0 && `Short: -${d.shortageQuantity}`}
                        {d.damagedQuantity > 0 && `Dmg: ${d.damagedQuantity}`}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          size="sm"
                          variant={
                            d.status === 'resolved'
                              ? 'success'
                              : d.status === 'credit_note_requested'
                              ? 'purple'
                              : 'danger'
                          }
                        >
                          {d.status.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {d.status !== 'resolved' ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setSelectedDiscrepancy(d)}
                          >
                            Reconcile
                          </Button>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-bold">Reconciled</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: Freight Transit Damage Incidents */}
      {activeTab === 'transit_incidents' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Freight Transit Damage Incidents &amp; Carrier Claims</CardTitle>
              <CardDescription>
                Cargo damaged during line-haul transport. Review carrier vehicle #, LR Consignment Note, photographic damage evidence, and designate responsibility.
              </CardDescription>
            </div>
            <Badge variant="purple" size="sm">
              {filteredTransitIncidents.length} Registered Carrier Incidents
            </Badge>
          </CardHeader>

          <div className="space-y-4 p-4">
            {filteredTransitIncidents.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700">No transit damage incidents on file</p>
                <p className="text-xs text-slate-400">All inbound shipments have arrived without freight transit incident reports.</p>
              </div>
            ) : (
              filteredTransitIncidents.map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4 transition-all hover:border-indigo-300"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-black text-xs flex items-center justify-center">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-900 text-sm">{t.incidentNumber}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-bold text-slate-700">{t.transporterName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono">Vehicle: <strong>{t.vehicleNumber}</strong></span>
                          <span>•</span>
                          <span className="font-mono">LR / Waybill: <strong>{t.consignmentNoteNumber}</strong></span>
                          <span>•</span>
                          <span>Route: {t.route}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          t.responsibilityStatus === 'transporter_responsibility'
                            ? 'danger'
                            : t.responsibilityStatus === 'supplier_responsibility'
                            ? 'purple'
                            : t.responsibilityStatus === 'company_responsibility'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {t.responsibilityStatus.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                      <Badge
                        variant={
                          t.resolutionStatus === 'unresolved'
                            ? 'danger'
                            : 'success'
                        }
                      >
                        {t.resolutionStatus.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Middle Content: Product Damaged & Valuation */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Cargo &amp; Damaged Quantities
                      </span>
                      <p className="font-bold text-slate-900 text-xs">{t.productName}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Batch: {t.batchNumber || 'N/A'} • SKU: {t.productSku}
                      </p>
                      <p className="font-mono font-black text-rose-700 text-sm pt-1">
                        {t.damagedQuantity} {t.unit} Damaged
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-200/80 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                        Financial Impact &amp; Claim Value
                      </span>
                      <p className="text-xl font-black font-mono text-rose-800">
                        ₹{t.totalDamageValue.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Unit Sourcing Cost: ₹{t.unitCost.toLocaleString('en-IN')} / {t.unit}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Damage Location / Incident Description
                      </span>
                      <p className="text-[11px] text-slate-700 italic">
                        "{t.damageLocationDescription}"
                      </p>
                      {t.responsibilityNotes && (
                        <p className="text-[10px] text-indigo-700 font-semibold pt-1">
                          Auditor: {t.responsibilityNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Photographic Evidence Mockup */}
                  {t.evidenceAttachments && t.evidenceAttachments.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5 text-slate-500" /> Dock Photographic Inspection Evidence
                      </span>
                      <div className="flex items-center gap-3 overflow-x-auto py-1">
                        {t.evidenceAttachments.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            className="relative group w-24 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 shadow-2xs"
                          >
                            <img
                              src={imgUrl}
                              alt={`Evidence ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                              Photo #{idx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Operational Controls: Responsibility Selection & Claim Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600">Designate Responsibility:</span>
                      <select
                        value={t.responsibilityStatus}
                        onChange={(e) => handleUpdateTransitResponsibility(t.id, e.target.value as any)}
                        className="glass-input rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 bg-white cursor-pointer"
                      >
                        <option value="under_review">Under Review / Surveyor Pending</option>
                        <option value="transporter_responsibility">Transporter Responsibility (Bad Stacking / Leak)</option>
                        <option value="supplier_responsibility">Supplier Responsibility (Weak Packaging)</option>
                        <option value="company_responsibility">Company Responsibility (Depot Unload Issue)</option>
                        <option value="undetermined">Undetermined Force Majeure</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleUpdateTransitResolution(t.id, 'transporter_claim_filed')}
                      >
                        File Carrier Claim
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateTransitResolution(t.id, 'supplier_credit_requested')}
                      >
                        Request Vendor Debit Note
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateTransitResolution(t.id, 'insurance_claim_filed')}
                      >
                        File Cargo Insurance Claim
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* ADMIN SUPPLIER DAMAGE REVIEW MODAL / DRAWER */}
      {damageReviewReceipt && (
        <Modal
          isOpen={true}
          onClose={() => setDamageReviewReceipt(null)}
          title={`Supplier Damage & Rejection Approval: ${damageReviewReceipt.receiptNumber}`}
          description={`PO: ${damageReviewReceipt.purchaseOrderNumber || 'N/A'} | Supplier: ${damageReviewReceipt.supplierName} | Destination: ${getWarehouseName(damageReviewReceipt.warehouseId)}`}
        >
          <div className="space-y-4 text-xs">
            {/* Critical Alert Banner */}
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold flex items-center gap-2 text-rose-800 text-sm">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  Receiving Dock Inspection Reported Damage
                </span>
                <Badge variant="danger">Awaiting Admin Ruling</Badge>
              </div>
              <p className="text-[11px] text-rose-900 leading-relaxed">
                Under ApexFlow stock safety protocols, damaged and unapproved units are quarantined and strictly prevented from entering active inventory until an executive ruling is authorized.
              </p>
            </div>

            {/* Consignment & Physical Count Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Expected PO Qty</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {damageReviewReceipt.expectedQuantity || damageReviewReceipt.receivedQuantity} {damageReviewReceipt.unit}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Counted at Gate</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {damageReviewReceipt.receivedQuantity} {damageReviewReceipt.unit}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-700 uppercase font-bold block">Eligible Good Units</span>
                <span className="font-mono font-black text-emerald-800 text-sm">
                  {(damageReviewReceipt.receivedQuantity - (damageReviewReceipt.damagedQuantity || 0))} {damageReviewReceipt.unit}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-rose-700 uppercase font-bold block">Damaged / Rejected</span>
                <span className="font-mono font-black text-rose-800 text-sm">
                  {damageReviewReceipt.damagedQuantity || 0} {damageReviewReceipt.unit}
                </span>
              </div>
            </div>

            {/* Store Keeper Notes & Evidence Mockup */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Store Keeper Dock Inspection Notes
              </span>
              <p className="text-slate-800 italic text-[11px]">
                "{damageReviewReceipt.notes || 'Damage discovered during pallet unloading. Leaking container rims observed.'}"
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                <Camera className="w-3.5 h-3.5 text-indigo-600" />
                <span>3 Photo attachments uploaded by store keeper during physical dock inspection</span>
              </div>
            </div>

            {/* Admin Ruling Decision Notes */}
            <div>
              <Input
                label="Admin Disposition Authorization Notes *"
                placeholder="e.g. Approved partial intake of 92 intact drums. Return Gate Pass issued for 8 damaged drums; supplier Kaveri Polymers debited."
                value={damageDecisionNotes}
                onChange={(e) => setDamageDecisionNotes(e.target.value)}
              />
            </div>

            {/* 3 DISTINCT ADMIN REVIEW CHOICES */}
            <div className="space-y-3 pt-2">
              <span className="font-extrabold text-slate-900 block text-xs">
                Select Executive Disposition Ruling:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Choice 1: Partial Acceptance */}
                <div
                  onClick={() => handleAdminDamageDecision('partial_acceptance')}
                  className="p-3.5 rounded-2xl border-2 border-emerald-400/80 bg-emerald-50/50 hover:bg-emerald-100/60 cursor-pointer transition-all space-y-1.5 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-black text-emerald-900 text-xs">
                      <Check className="w-4 h-4 text-emerald-700" />
                      <span>1. Partial Acceptance</span>
                    </div>
                    <p className="text-[10px] text-emerald-800 mt-1 leading-snug">
                      Accept good units ({(damageReviewReceipt.receivedQuantity - (damageReviewReceipt.damagedQuantity || 0))} {damageReviewReceipt.unit}) into stock. Issue Return Gate Pass for damaged units only.
                    </p>
                  </div>
                  <span className="inline-block text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 w-fit">
                    Issue Return Gate Pass
                  </span>
                </div>

                {/* Choice 2: Full Rejection */}
                <div
                  onClick={() => handleAdminDamageDecision('full_rejection')}
                  className="p-3.5 rounded-2xl border-2 border-rose-400/80 bg-rose-50/50 hover:bg-rose-100/60 cursor-pointer transition-all space-y-1.5 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-black text-rose-900 text-xs">
                      <XCircle className="w-4 h-4 text-rose-700" />
                      <span>2. Full Rejection</span>
                    </div>
                    <p className="text-[10px] text-rose-800 mt-1 leading-snug">
                      Reject entire consignment. Return 100% of units to supplier. Zero inventory posted to active stock.
                    </p>
                  </div>
                  <span className="inline-block text-[10px] font-bold text-rose-800 bg-white px-2 py-0.5 rounded-lg border border-rose-200 w-fit">
                    Full Rejection Gate Pass
                  </span>
                </div>

                {/* Choice 3: Hold for Clarification */}
                <div
                  onClick={() => handleAdminDamageDecision('hold_for_clarification')}
                  className="p-3.5 rounded-2xl border-2 border-amber-400/80 bg-amber-50/50 hover:bg-amber-100/60 cursor-pointer transition-all space-y-1.5 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-black text-amber-900 text-xs">
                      <Clock className="w-4 h-4 text-amber-700" />
                      <span>3. Hold for Clarification</span>
                    </div>
                    <p className="text-[10px] text-amber-800 mt-1 leading-snug">
                      Retain consignment in physical quarantine hold pending vendor technical surveyor inspection.
                    </p>
                  </div>
                  <span className="inline-block text-[10px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded-lg border border-amber-200 w-fit">
                    Quarantine Hold
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setDamageReviewReceipt(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Plan Consignment Modal */}
      <Modal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title="Schedule Planned Inward Consignment"
        description="Pre-alert Store Keepers about incoming trucks, purchase orders, expected delivery date, and transport charges."
      >
        <form onSubmit={handleCreatePlannedConsignment} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Select Supplier / Vendor *"
              value={planSupplierId}
              onChange={(e) => setPlanSupplierId(e.target.value)}
              options={suppliers.map((s) => ({ label: `${s.name} (${s.code})`, value: s.id }))}
            />
            <Select
              label="Purchase Order Ref (Optional)"
              value={planPoId}
              onChange={(e) => setPlanPoId(e.target.value)}
              options={[
                { label: 'None (Direct Spot Purchase)', value: '' },
                ...purchaseOrders.map((po) => ({ label: `${po.poNumber} (${po.supplierName})`, value: po.id })),
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Product Sourced *"
              value={planProductId}
              onChange={(e) => setPlanProductId(e.target.value)}
              options={products.map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))}
            />
            <Input
              label="Expected Inbound Quantity *"
              type="number"
              value={planExpectedQty}
              onChange={(e) => setPlanExpectedQty(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Destination Territory"
              value={planRegionId}
              onChange={(e) => setPlanRegionId(e.target.value)}
              options={regions.map((r) => ({ label: r.name, value: r.id }))}
            />
            <Select
              label="Receiving Warehouse / Depot"
              value={planWarehouseId}
              onChange={(e) => setPlanWarehouseId(e.target.value)}
              options={warehouses.map((w) => ({ label: w.name, value: w.id }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Expected Delivery Date"
              type="date"
              value={planExpectedDate}
              onChange={(e) => setPlanExpectedDate(e.target.value)}
              required
            />
            <Input
              label="Inward Freight Expense (Paid by Company ₹)"
              type="number"
              value={planTransportExpense}
              onChange={(e) => setPlanTransportExpense(e.target.value)}
            />
          </div>

          <Input
            label="Logistics & Dispatch Notes"
            placeholder="e.g. Carrier: V-Trans Logistics, Truck # DL-01-AB-1234, LR # 98214"
            value={planNotes}
            onChange={(e) => setPlanNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setPlanModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" icon={<Truck className="w-4 h-4" />}>
              Create Scheduled Consignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Discrepancy Resolution Modal */}
      {selectedDiscrepancy && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDiscrepancy(null)}
          title={`Resolve Receiving Discrepancy: ${selectedDiscrepancy.discrepancyNumber || selectedDiscrepancy.id}`}
          description={`Supplier: ${selectedDiscrepancy.supplierName} | Shortage: ${selectedDiscrepancy.shortageQuantity} | Impact: ₹${Math.round(selectedDiscrepancy.financialValueAffected || ((selectedDiscrepancy.shortageQuantity || 0) * (selectedDiscrepancy.unitCost || 100))).toLocaleString('en-IN')}`}
        >
          <form onSubmit={handleResolveDiscrepancy} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-rose-800">
                <AlertTriangle className="w-4 h-4" /> Physical Audit Variance Detected
              </span>
              <p className="text-[11px] text-slate-700">
                Expected: <strong>{selectedDiscrepancy.expectedQuantity}</strong> | Counted at Dock: <strong>{selectedDiscrepancy.actualCountedQuantity}</strong> | Shortage: <strong>{selectedDiscrepancy.shortageQuantity}</strong>
              </p>
            </div>

            <Select
              label="Select Settlement Method"
              value={resolutionAction}
              onChange={(e) => setResolutionAction(e.target.value as any)}
              options={[
                { label: 'Request Supplier Credit Note (Deduct from Accounts Payable)', value: 'supplier_credit_note' },
                { label: 'Confirm Replacement Shipment (Supplier to ship balance)', value: 'replacement_shipment' },
                { label: 'Company Operating Write-off (In-transit loss absorbed)', value: 'company_writeoff' },
              ]}
            />

            {resolutionAction === 'supplier_credit_note' && (
              <Input
                label="Supplier Credit Note Number"
                placeholder="e.g. SCN-2026-9041"
                value={creditNoteNum}
                onChange={(e) => setCreditNoteNum(e.target.value)}
                required
              />
            )}

            <Input
              label="Reconciliation Audit Notes"
              placeholder="e.g. Commercial dispute acknowledged by supplier via email."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setSelectedDiscrepancy(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" type="submit" icon={<CheckCircle2 className="w-4 h-4" />}>
                Confirm Reconciliation Settlement
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Consignment Details Modal with Single-Point Inventory Posting Guard */}
      {selectedReceipt && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReceipt(null)}
          title={`GRN Details: ${selectedReceipt.receiptNumber}`}
        >
          <div className="space-y-4 text-xs">
            {/* Header Summary */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplier</span>
                  <p className="text-sm font-extrabold text-slate-900">{selectedReceipt.supplierName}</p>
                </div>
                {renderStatusBadge(selectedReceipt.status)}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Invoice / DN Ref:</span>
                  <span className="font-semibold text-slate-900">{selectedReceipt.supplierInvoiceNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Receipt Date:</span>
                  <span className="font-semibold text-slate-900">
                    {new Date(selectedReceipt.date).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Received By:</span>
                  <span className="font-semibold text-slate-900">{selectedReceipt.receivedByUserName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Depot / Warehouse:</span>
                  <span className="font-semibold text-slate-900">{getWarehouseName(selectedReceipt.warehouseId)}</span>
                </div>
              </div>

              {selectedReceipt.returnGatePassNumber && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 font-mono text-[11px] font-bold">
                  Return Gate Pass Issued: {selectedReceipt.returnGatePassNumber}
                </div>
              )}
            </div>

            {/* Physical Count & Shortage Breakdown */}
            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-2">
              <h4 className="font-bold text-indigo-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" /> Physical Goods Inspection &amp; QC Count
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <span className="text-slate-500 block text-[11px]">Expected Quantity:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {selectedReceipt.expectedQuantity || selectedReceipt.receivedQuantity} {selectedReceipt.unit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Actual Counted:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {selectedReceipt.receivedQuantity} {selectedReceipt.unit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Good Accepted:</span>
                  <span className="font-bold font-mono text-emerald-800">
                    {(selectedReceipt.receivedQuantity - (selectedReceipt.damagedQuantity || 0))} {selectedReceipt.unit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Damaged:</span>
                  <span className={`font-bold font-mono ${(selectedReceipt.damagedQuantity || 0) > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                    {selectedReceipt.damagedQuantity || 0} {selectedReceipt.unit}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Landed Cost Reconciliation */}
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-2">
              <h4 className="font-bold text-emerald-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Financial &amp; Freight Accounting
              </h4>
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="text-slate-500 block text-[11px]">Actual Unit Cost:</span>
                  <span className="font-bold font-mono text-slate-900 text-sm">
                    ₹{selectedReceipt.actualUnitCost.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Inward Freight Paid:</span>
                  <span className="font-bold font-mono text-rose-800 text-sm">
                    ₹{(selectedReceipt.transportExpensePaidByCompany || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Total Consignment Value:</span>
                  <span className="font-extrabold font-mono text-emerald-800 text-base">
                    ₹{Math.round(selectedReceipt.totalCost).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Single Point Inventory Posting Status Guard */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Single-Point Inventory Posting Governance
              </span>
              {selectedReceipt.stockPostedAt ? (
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Stock posted to active warehouse inventory at{' '}
                    {new Date(selectedReceipt.stockPostedAt).toLocaleString('en-IN')}.
                  </span>
                </div>
              ) : selectedReceipt.status === 'rejected' ? (
                <div className="flex items-center gap-2 text-rose-800 font-bold">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    Consignment fully rejected. Zero stock posted to inventory.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-800 font-medium">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Consignment not yet posted to active warehouse stock.
                  </span>
                </div>
              )}
            </div>

            {/* Notes */}
            {selectedReceipt.notes && (
              <div className="p-3 rounded-lg bg-slate-100 text-slate-600 text-[11px]">
                <span className="font-bold text-slate-700">Store Keeper Notes: </span>
                {selectedReceipt.notes}
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedReceipt(null)}>
                Close
              </Button>

              {!selectedReceipt.stockPostedAt && selectedReceipt.status !== 'expected' && selectedReceipt.status !== 'rejected' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handlePostToStock(selectedReceipt.id)}
                  icon={<PackageCheck className="w-4 h-4" />}
                >
                  Post Accepted Stock to Inventory
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
