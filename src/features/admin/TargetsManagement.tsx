import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { SalesTarget, MarketingTarget, UserRole } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  Target,
  TrendingUp,
  Award,
  Users,
  Briefcase,
  Compass,
  Building,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Edit2,
  Search,
  Filter,
  DollarSign,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export const TargetsManagement: React.FC = () => {
  const {
    salesTargets,
    marketingTargets,
    users,
    regions,
    assignSalesTarget,
    assignMarketingTarget,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'all' | 'sales' | 'marketing'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overachieved' | 'on_track' | 'lagging'>('all');

  // Modal: Assign New Target
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetRoleType, setTargetRoleType] = useState<'sales' | 'marketing'>('sales');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetPeriod, setTargetPeriod] = useState('October 2026');

  // Sales Target Form Fields (Per-Unit Structure)
  const [targetCategory, setTargetCategory] = useState('Industrial Solvents & Coatings');
  const [targetUnitType, setTargetUnitType] = useState('Units');
  const [targetUnits, setTargetUnits] = useState('500');
  const [targetAmountPerUnit, setTargetAmountPerUnit] = useState('3000');
  const [targetOrders, setTargetOrders] = useState('10');
  const [targetNewCust, setTargetNewCust] = useState('3');
  const [targetQuotations, setTargetQuotations] = useState('10');
  const [targetCustomersHandled, setTargetCustomersHandled] = useState('7');
  const [targetIncentivePerUnit, setTargetIncentivePerUnit] = useState('150');

  // Marketing Target Form Fields (Per-Visit / Unit Structure)
  const [targetVisits, setTargetVisits] = useState('50');
  const [ratePerVisit, setRatePerVisit] = useState('300');
  const [targetDealers, setTargetDealers] = useState('6');
  const [bountyPerDealer, setBountyPerDealer] = useState('2500');
  const [targetCustomersHandledMkt, setTargetCustomersHandledMkt] = useState('12');
  const [targetQuotationsMkt, setTargetQuotationsMkt] = useState('6');

  // Modal: Quick Adjust Target
  const [adjustSalesModalOpen, setAdjustSalesModalOpen] = useState(false);
  const [selectedSalesTarget, setSelectedSalesTarget] = useState<SalesTarget | null>(null);
  const [adjustUnits, setAdjustUnits] = useState('500');
  const [adjustAmountPerUnit, setAdjustAmountPerUnit] = useState('3000');

  const [adjustMarketingModalOpen, setAdjustMarketingModalOpen] = useState(false);
  const [selectedMarketingTarget, setSelectedMarketingTarget] = useState<MarketingTarget | null>(null);
  const [adjustVisits, setAdjustVisits] = useState('50');
  const [adjustRatePerVisit, setAdjustRatePerVisit] = useState('300');

  // Reps list
  const salesReps = users.filter((u) => u.role === 'sales');
  const marketingOfficers = users.filter((u) => u.role === 'marketing');

  // Aggregated KPIs
  const totalSalesTarget = salesTargets.reduce((sum, t) => sum + (t.targetAmount || 0), 0);
  const totalSalesAchieved = salesTargets.reduce((sum, t) => sum + (t.achievedAmount || 0), 0);
  const overallSalesAttainment = totalSalesTarget > 0 ? (totalSalesAchieved / totalSalesTarget) * 100 : 0;

  const totalMarketingVisitsTarget = marketingTargets.reduce((sum, t) => sum + (t.targetVisits || 0), 0);
  const totalMarketingVisitsCompleted = marketingTargets.reduce((sum, t) => sum + (t.completedVisits || 0), 0);
  const overallMarketingAttainment =
    totalMarketingVisitsTarget > 0 ? (totalMarketingVisitsCompleted / totalMarketingVisitsTarget) * 100 : 0;

  const totalIncentivesEarned = salesTargets.reduce((sum, t) => sum + (t.incentiveEstimate || 0), 0);

  // Filter Sales Targets
  const filteredSalesTargets = salesTargets.filter((t) => {
    const matchesRegion = selectedRegionFilter === 'all' || t.regionId === selectedRegionFilter;
    const matchesSearch = t.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const pct = t.targetAmount > 0 ? (t.achievedAmount / t.targetAmount) * 100 : 0;

    let matchesStatus = true;
    if (statusFilter === 'overachieved') matchesStatus = pct >= 100;
    else if (statusFilter === 'on_track') matchesStatus = pct >= 80 && pct < 100;
    else if (statusFilter === 'lagging') matchesStatus = pct < 80;

    return matchesRegion && matchesSearch && matchesStatus;
  });

  // Filter Marketing Targets
  const filteredMarketingTargets = marketingTargets.filter((t) => {
    const matchesRegion = selectedRegionFilter === 'all' || t.regionId === selectedRegionFilter;
    const matchesSearch = t.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const pct = t.targetVisits > 0 ? (t.completedVisits / t.targetVisits) * 100 : 0;

    let matchesStatus = true;
    if (statusFilter === 'overachieved') matchesStatus = pct >= 100;
    else if (statusFilter === 'on_track') matchesStatus = pct >= 80 && pct < 100;
    else if (statusFilter === 'lagging') matchesStatus = pct < 80;

    return matchesRegion && matchesSearch && matchesStatus;
  });

  // Open Assign Modal Handler
  const handleOpenAssignModal = () => {
    const initialRep = targetRoleType === 'sales' ? salesReps[0] : marketingOfficers[0];
    setTargetUserId(initialRep?.id || '');
    setAssignModalOpen(true);
  };

  const handleRoleTypeChange = (role: 'sales' | 'marketing') => {
    setTargetRoleType(role);
    const rep = role === 'sales' ? salesReps[0] : marketingOfficers[0];
    setTargetUserId(rep?.id || '');
  };

  const handleSaveAssignTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) return;

    const rep = users.find((u) => u.id === targetUserId);
    if (!rep) return;

    if (targetRoleType === 'sales') {
      const units = parseInt(targetUnits, 10) || 500;
      const rate = parseFloat(targetAmountPerUnit) || 3000;
      const totalAmount = units * rate;
      assignSalesTarget({
        userId: rep.id,
        userName: rep.name,
        regionId: rep.assignedRegionId || 'reg-west',
        period: targetPeriod,
        targetUnits: units,
        achievedUnits: 0,
        amountPerUnit: rate,
        unitCategory: targetCategory,
        unitMeasurement: targetUnitType,
        targetAmount: totalAmount,
        achievedAmount: 0,
        ordersCount: parseInt(targetOrders, 10) || 5,
        newCustomersCount: parseInt(targetNewCust, 10) || 2,
        customersHandledCount: parseInt(targetCustomersHandled, 10) || 7,
        quotationsTarget: parseInt(targetQuotations, 10) || 10,
        quotationsAchieved: 0,
        quotationsConverted: 0,
        incentivePerUnit: parseFloat(targetIncentivePerUnit) || 150,
        incentiveEstimate: 0,
      });
    } else {
      const visits = parseInt(targetVisits, 10) || 50;
      const visitRate = parseFloat(ratePerVisit) || 300;
      assignMarketingTarget({
        userId: rep.id,
        userName: rep.name,
        regionId: rep.assignedRegionId || 'reg-north',
        period: targetPeriod,
        targetVisits: visits,
        completedVisits: 0,
        ratePerVisit: visitRate,
        targetNewDealers: parseInt(targetDealers, 10) || 6,
        achievedNewDealers: 0,
        bountyPerDealer: parseFloat(bountyPerDealer) || 2500,
        expenseBudget: visits * visitRate,
        submittedExpenses: 0,
        customersHandledCount: parseInt(targetCustomersHandledMkt, 10) || 12,
        quotationsAssistedCount: parseInt(targetQuotationsMkt, 10) || 6,
      });
    }

    setAssignModalOpen(false);
  };

  // Quick Adjust Handlers (Per-Unit Volume & Rate Structure)
  const handleOpenAdjustSales = (t: SalesTarget) => {
    setSelectedSalesTarget(t);
    const fallbackRate = t.amountPerUnit || 3000;
    const fallbackUnits = t.targetUnits || Math.round(t.targetAmount / fallbackRate);
    setAdjustUnits(fallbackUnits.toString());
    setAdjustAmountPerUnit(fallbackRate.toString());
    setAdjustSalesModalOpen(true);
  };

  const handleSaveAdjustSales = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSalesTarget) {
      const u = parseInt(adjustUnits, 10) || 500;
      const r = parseFloat(adjustAmountPerUnit) || 3000;
      assignSalesTarget({
        ...selectedSalesTarget,
        targetUnits: u,
        amountPerUnit: r,
        targetAmount: u * r,
      });
      setAdjustSalesModalOpen(false);
    }
  };

  const handleOpenAdjustMarketing = (t: MarketingTarget) => {
    setSelectedMarketingTarget(t);
    setAdjustVisits(t.targetVisits.toString());
    setAdjustRatePerVisit((t.ratePerVisit || 300).toString());
    setAdjustMarketingModalOpen(true);
  };

  const handleSaveAdjustMarketing = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMarketingTarget) {
      const v = parseInt(adjustVisits, 10) || 50;
      const r = parseFloat(adjustRatePerVisit) || 300;
      assignMarketingTarget({
        ...selectedMarketingTarget,
        targetVisits: v,
        ratePerVisit: r,
        expenseBudget: v * r,
      });
      setAdjustMarketingModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            Quota & Target Assignment & Tracking
            <Badge variant="purple" size="sm">Admin Oversight</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Establish monthly commercial targets, assign field visit quotas, and monitor live attainment for Sales and Marketing representatives.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAssignModal}
            className="cursor-pointer shadow-sm shadow-indigo-600/25"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            + Assign New Target Quota
          </Button>
        </div>
      </div>

      {/* Top Attainment Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 space-y-1.5 border-indigo-100">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sales Quota Attainment</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {overallSalesAttainment.toFixed(1)}%
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Active
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, overallSalesAttainment)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            ₹{(totalSalesAchieved / 100000).toFixed(1)}L of ₹{(totalSalesTarget / 100000).toFixed(1)}L goal
          </p>
        </div>

        <div className="glass-card p-4 space-y-1.5 border-blue-100">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Marketing Visit Attainment</span>
            <Compass className="w-4 h-4" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {overallMarketingAttainment.toFixed(1)}%
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              On Track
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, overallMarketingAttainment)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {totalMarketingVisitsCompleted} of {totalMarketingVisitsTarget} field visits completed
          </p>
        </div>

        <div className="glass-card p-4 space-y-1.5 border-emerald-100">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Incentive Pool Earned</span>
            <Award className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            ₹{totalIncentivesEarned.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Accrued commissions & performance bonuses</p>
        </div>

        <div className="glass-card p-4 space-y-1.5 border-purple-100">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tracked Personnel</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {salesTargets.length + marketingTargets.length} <span className="text-xs font-bold text-slate-500">Quotas</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {salesTargets.length} sales reps • {marketingTargets.length} marketing officers
          </p>
        </div>
      </div>

      {/* Regional Quota Distribution Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {regions.map((reg) => {
          const regSales = salesTargets.filter((t) => t.regionId === reg.id);
          const regTarget = regSales.reduce((s, t) => s + (t.targetAmount || 0), 0);
          const regAchieved = regSales.reduce((s, t) => s + (t.achievedAmount || 0), 0);
          const pct = regTarget > 0 ? (regAchieved / regTarget) * 100 : 0;

          return (
            <div
              key={reg.id}
              className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 truncate">{reg.name}</span>
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 block font-mono">
                ₹{(regAchieved / 100000).toFixed(1)}L / ₹{(regTarget / 100000).toFixed(1)}L
              </span>
            </div>
          );
        })}
      </div>

      {/* Role Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Targets & Quotas ({salesTargets.length + marketingTargets.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'sales'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Sales Commercial Quotas ({salesTargets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('marketing')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'marketing'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Ground Marketing Targets ({marketingTargets.length})</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search representative name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <select
            value={selectedRegionFilter}
            onChange={(e) => setSelectedRegionFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Territories</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Attainment Levels</option>
            <option value="overachieved">Overachieved (≥100%)</option>
            <option value="on_track">On Track (80% – 99%)</option>
            <option value="lagging">Lagging (&lt;80%)</option>
          </select>
        </div>
      </div>

      {/* SECTION 1: Sales Targets Ledger */}
      {(activeTab === 'all' || activeTab === 'sales') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Field Sales Revenue Quotas ({filteredSalesTargets.length})</CardTitle>
                <CardDescription>
                  Monthly billing quotas, order volumes, new account acquisition, and projected commissions.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="pb-3 px-3">Sales Representative</th>
                  <th className="pb-3 px-3">Territory</th>
                  <th className="pb-3 px-3">Quota Period</th>
                  <th className="pb-3 px-3">Target Quota Structure</th>
                  <th className="pb-3 px-3">Achieved Delivered</th>
                  <th className="pb-3 px-3 w-48">Attainment Progress</th>
                  <th className="pb-3 px-3">Quotations &amp; Accounts</th>
                  <th className="pb-3 px-3">Estimated Incentive</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredSalesTargets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400 italic">
                      No sales quotas matching active criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSalesTargets.map((target) => {
                    const rep = users.find((u) => u.id === target.userId);
                    const pct = target.targetAmount > 0 ? (target.achievedAmount / target.targetAmount) * 100 : 0;
                    const isExceeding = pct >= 100;
                    const isOnTrack = pct >= 80 && pct < 100;

                    return (
                      <tr key={target.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={rep?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                              alt={target.userName}
                              className="w-8 h-8 rounded-xl object-cover border border-slate-200"
                            />
                            <div>
                              <span className="font-bold text-slate-900 block">{target.userName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {rep?.employeeId || 'REP-ACTIVE'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px] uppercase">
                            {target.regionId}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-semibold text-slate-800">{target.period}</td>

                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-900 block font-mono">
                            ₹{target.targetAmount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-indigo-700 font-semibold block bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60 mt-0.5">
                            {target.targetUnits || Math.round(target.targetAmount / (target.amountPerUnit || 3000))} {target.unitMeasurement || 'Units'} @ ₹{(target.amountPerUnit || 3000).toLocaleString('en-IN')}/unit
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-semibold text-indigo-700 block font-mono">
                            ₹{target.achievedAmount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium block">
                            {target.achievedUnits || Math.round(target.achievedAmount / (target.amountPerUnit || 3000))} units delivered
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span
                                className={`font-bold ${
                                  isExceeding
                                    ? 'text-emerald-700'
                                    : isOnTrack
                                    ? 'text-indigo-700'
                                    : 'text-amber-700'
                                }`}
                              >
                                {pct.toFixed(1)}%
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Gap: ₹{Math.max(0, target.targetAmount - target.achievedAmount).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${
                                  isExceeding ? 'bg-emerald-600' : isOnTrack ? 'bg-indigo-600' : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-600">
                          <div>
                            <span className="font-bold text-slate-900">{target.quotationsAchieved || target.ordersCount}</span> quotes created
                            <span className="text-[10px] text-slate-400 block font-medium">
                              ({target.quotationsConverted || Math.min(target.quotationsAchieved || 0, target.ordersCount)} won • {target.ordersCount} orders placed)
                            </span>
                          </div>
                          <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                            {target.customersHandledCount || (target.ordersCount + 2)} Accounts Handled
                          </div>
                        </td>

                        <td className="py-3 px-3 font-semibold text-emerald-700">
                          ₹{target.incentiveEstimate.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAdjustSales(target)}
                            className="h-7 text-xs cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Adjust Quota
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

      {/* SECTION 2: Marketing Targets Ledger */}
      {(activeTab === 'all' || activeTab === 'marketing') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Ground Marketing Field Targets ({filteredMarketingTargets.length})</CardTitle>
                <CardDescription>
                  Dealer visits, sample demonstrations, retailer acquisition targets, and field expense caps.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="pb-3 px-3">Marketing Officer</th>
                  <th className="pb-3 px-3">Territory</th>
                  <th className="pb-3 px-3">Period</th>
                  <th className="pb-3 px-3">Field Visits Target</th>
                  <th className="pb-3 px-3">Completed Visits</th>
                  <th className="pb-3 px-3 w-48">Visit Completion Rate</th>
                  <th className="pb-3 px-3">New Dealers Onboarded</th>
                  <th className="pb-3 px-3">Expense Budget (₹)</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredMarketingTargets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400 italic">
                      No marketing targets matching active criteria.
                    </td>
                  </tr>
                ) : (
                  filteredMarketingTargets.map((target) => {
                    const rep = users.find((u) => u.id === target.userId);
                    const pct = target.targetVisits > 0 ? (target.completedVisits / target.targetVisits) * 100 : 0;
                    const isExceeding = pct >= 100;

                    return (
                      <tr key={target.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={rep?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'}
                              alt={target.userName}
                              className="w-8 h-8 rounded-xl object-cover border border-slate-200"
                            />
                            <div>
                              <span className="font-bold text-slate-900 block">{target.userName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {rep?.employeeId || 'MKT-FIELD'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/80 font-bold text-[11px] uppercase">
                            {target.regionId}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-semibold text-slate-800">{target.period}</td>

                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-900 block">
                            {target.targetVisits} Field Visits
                          </span>
                          <span className="text-[10px] text-amber-800 font-semibold block bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 mt-0.5">
                            @ ₹{target.ratePerVisit || 300}/visit
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-semibold text-blue-700 block">
                            {target.completedVisits} Visits
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium block">
                            ₹{((target.completedVisits || 0) * (target.ratePerVisit || 300)).toLocaleString('en-IN')} allowance utilized
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span
                                className={`font-bold ${
                                  isExceeding ? 'text-emerald-700' : 'text-blue-700'
                                }`}
                              >
                                {pct.toFixed(1)}%
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {Math.max(0, target.targetVisits - target.completedVisits)} visits to go
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${isExceeding ? 'bg-emerald-600' : 'bg-blue-600'}`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-800 font-medium">
                          <div>
                            <span className="font-bold text-slate-900">{target.achievedNewDealers} of {target.targetNewDealers}</span> dealers onboarded
                          </div>
                          <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                            {target.customersHandledCount || 12} Accounts Handled • {target.quotationsAssistedCount || 6} Quotes Assisted
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 block font-mono">
                            ₹{target.expenseBudget.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Incurred: ₹{target.submittedExpenses.toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAdjustMarketing(target)}
                            className="h-7 text-xs cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Adjust Visits
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

      {/* Modal: Assign New Target */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Performance Quota to Field Personnel"
        description="Allocate monthly revenue targets or physical dealer visit quotas."
      >
        <form onSubmit={handleSaveAssignTarget} className="space-y-4 pt-2">
          {/* Role selector tab */}
          <div className="flex rounded-xl p-1 bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => handleRoleTypeChange('sales')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                targetRoleType === 'sales' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Sales Quota (Revenue)
            </button>
            <button
              type="button"
              onClick={() => handleRoleTypeChange('marketing')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                targetRoleType === 'marketing' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Marketing Quota (Visits)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Select Representative
              </label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              >
                {(targetRoleType === 'sales' ? salesReps : marketingOfficers).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.assignedRegionId})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Quota Period / Month"
              placeholder="e.g. October 2026"
              value={targetPeriod}
              onChange={(e) => setTargetPeriod(e.target.value)}
              required
            />
          </div>

          {targetRoleType === 'sales' ? (
            <div className="space-y-3.5 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                  Sales Quota Structure: Per-Unit Volume × Rate
                </span>
                <span className="text-[10px] bg-indigo-200/80 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                  Unit-Pricing Model
                </span>
              </div>

              {/* Product Category and Measurement Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Target Category / Line
                  </label>
                  <select
                    value={targetCategory}
                    onChange={(e) => setTargetCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="Industrial Solvents & Coatings">Industrial Solvents &amp; Coatings</option>
                    <option value="Polymer Resins & Additives">Polymer Resins &amp; Additives</option>
                    <option value="Protective Sealants & PU">Protective Sealants &amp; PU</option>
                    <option value="Specialty Packaging Drums">Specialty Packaging Drums</option>
                    <option value="All Commercial Units">All Commercial Units</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Measurement Unit
                  </label>
                  <select
                    value={targetUnitType}
                    onChange={(e) => setTargetUnitType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="Units">Standard Units</option>
                    <option value="Cartons">Cartons (Boxes)</option>
                    <option value="200L Drums">200L Metal Drums</option>
                    <option value="Liters">Liters</option>
                    <option value="Metric Tons">Metric Tons</option>
                  </select>
                </div>
              </div>

              {/* Target Units and Rate Per Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Target Volume ({targetUnitType})
                  </label>
                  <Input
                    type="number"
                    placeholder="500"
                    value={targetUnits}
                    onChange={(e) => setTargetUnits(e.target.value)}
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Total units to deliver</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Rate / Amount Per Unit (₹)
                  </label>
                  <Input
                    type="number"
                    placeholder="3000"
                    value={targetAmountPerUnit}
                    onChange={(e) => setTargetAmountPerUnit(e.target.value)}
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Price/revenue per unit</span>
                </div>
              </div>

              {/* Live Computed Total Quota */}
              <div className="p-3 rounded-xl bg-indigo-100/70 border border-indigo-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-700 block">
                    Calculated Total Quota Revenue
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {targetUnits || 0} {targetUnitType} × ₹{Number(targetAmountPerUnit || 0).toLocaleString('en-IN')}/unit
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-indigo-900 font-mono">
                    ₹{((parseInt(targetUnits, 10) || 0) * (parseFloat(targetAmountPerUnit) || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Aspect Targets: Quotations, Customers & Incentive */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <Input
                  label="Target Quotations"
                  type="number"
                  placeholder="10"
                  value={targetQuotations}
                  onChange={(e) => setTargetQuotations(e.target.value)}
                />
                <Input
                  label="Accounts to Handle"
                  type="number"
                  placeholder="7"
                  value={targetCustomersHandled}
                  onChange={(e) => setTargetCustomersHandled(e.target.value)}
                />
                <Input
                  label="Incentive / Unit (₹)"
                  type="number"
                  placeholder="150"
                  value={targetIncentivePerUnit}
                  onChange={(e) => setTargetIncentivePerUnit(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3.5 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Marketing Structure: Field Visits × Allowance Rate
                </span>
                <span className="text-[10px] bg-amber-200/80 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                  Per-Visit Model
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Monthly Physical Visits Goal
                  </label>
                  <Input
                    type="number"
                    placeholder="50"
                    value={targetVisits}
                    onChange={(e) => setTargetVisits(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Allowance Rate / Visit (₹)
                  </label>
                  <Input
                    type="number"
                    placeholder="300"
                    value={ratePerVisit}
                    onChange={(e) => setRatePerVisit(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Live Computed Travel Budget */}
              <div className="p-3 rounded-xl bg-amber-100/70 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">
                    Calculated Monthly Travel &amp; Expense Budget
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {targetVisits || 0} Visits × ₹{Number(ratePerVisit || 0).toLocaleString('en-IN')}/visit
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-amber-950 font-mono">
                    ₹{((parseInt(targetVisits, 10) || 0) * (parseFloat(ratePerVisit) || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="New Dealer Onboarding Goal"
                  type="number"
                  placeholder="6"
                  value={targetDealers}
                  onChange={(e) => setTargetDealers(e.target.value)}
                />
                <Input
                  label="Bounty / Dealer (₹)"
                  type="number"
                  placeholder="2500"
                  value={bountyPerDealer}
                  onChange={(e) => setBountyPerDealer(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Dealer Accounts Handled"
                  type="number"
                  placeholder="12"
                  value={targetCustomersHandledMkt}
                  onChange={(e) => setTargetCustomersHandledMkt(e.target.value)}
                />
                <Input
                  label="Quotations Assisted Goal"
                  type="number"
                  placeholder="6"
                  value={targetQuotationsMkt}
                  onChange={(e) => setTargetQuotationsMkt(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Assign & Notify Representative
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Adjust Sales Quota (Per-Unit Structure) */}
      <Modal
        isOpen={adjustSalesModalOpen}
        onClose={() => setAdjustSalesModalOpen(false)}
        title="Adjust Sales Commercial Quota (Per-Unit Structure)"
        description="Update unit delivery target and unit price rate for this representative."
      >
        <form onSubmit={handleSaveAdjustSales} className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="font-bold text-slate-900 block">{selectedSalesTarget?.userName}</span>
            <span className="text-slate-500">
              Period: {selectedSalesTarget?.period} • Territory: {selectedSalesTarget?.regionId}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Target Volume ({selectedSalesTarget?.unitMeasurement || 'Units'})
              </label>
              <Input
                type="number"
                value={adjustUnits}
                onChange={(e) => setAdjustUnits(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Rate / Amount Per Unit (₹)
              </label>
              <Input
                type="number"
                value={adjustAmountPerUnit}
                onChange={(e) => setAdjustAmountPerUnit(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Live computed total */}
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">New Quota Target (Volume × Rate):</span>
            <span className="text-sm font-bold text-indigo-700 font-mono">
              ₹{((parseInt(adjustUnits, 10) || 0) * (parseFloat(adjustAmountPerUnit) || 0)).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdjustSalesModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Update Unit Quota
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Adjust Marketing Visits (Per-Visit Structure) */}
      <Modal
        isOpen={adjustMarketingModalOpen}
        onClose={() => setAdjustMarketingModalOpen(false)}
        title="Adjust Marketing Visits Quota (Per-Visit Structure)"
        description="Update the physical visit target and allowance rate for this field officer."
      >
        <form onSubmit={handleSaveAdjustMarketing} className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="font-bold text-slate-900 block">{selectedMarketingTarget?.userName}</span>
            <span className="text-slate-500">
              Period: {selectedMarketingTarget?.period} • Territory: {selectedMarketingTarget?.regionId}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Target Field Visits
              </label>
              <Input
                type="number"
                value={adjustVisits}
                onChange={(e) => setAdjustVisits(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Allowance Rate / Visit (₹)
              </label>
              <Input
                type="number"
                value={adjustRatePerVisit}
                onChange={(e) => setAdjustRatePerVisit(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Live computed travel budget */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">New Travel Budget (Visits × Rate):</span>
            <span className="text-sm font-bold text-amber-800 font-mono">
              ₹{((parseInt(adjustVisits, 10) || 0) * (parseFloat(adjustRatePerVisit) || 0)).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdjustMarketingModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Update Visit Target
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TargetsManagement;
