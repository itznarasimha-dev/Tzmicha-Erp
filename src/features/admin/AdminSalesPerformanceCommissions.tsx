import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  Award,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Percent,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  Building2,
  ArrowUpRight,
  Briefcase,
  FileText,
  Search,
  Filter,
  Eye,
  Check,
  Sparkles,
  MapPin,
  Clock,
  Layers,
  ChevronRight,
  Receipt,
  AlertTriangle,
} from 'lucide-react';
import { UserRole } from '../../types';

export interface UserPerformanceScorecard {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
    employeeId?: string;
    assignedRegionId?: string;
    maxDiscountPercent?: number;
  };
  roleTitle: string;
  department: string;
  territory: string;

  // 1. Quotations Aspect
  quotationsCreated: number;
  quotationsConverted: number;
  quotationsTotalValue: number;
  quotationConversionRate: number;
  quotationsList: Array<{
    id: string;
    quotationNo: string;
    customerName: string;
    totalAmount: number;
    status: string;
    createdDate: string;
  }>;

  // 2. Customers Handled Aspect
  customersHandledCount: number;
  customerAccounts: Array<{
    id: string;
    name: string;
    city: string;
    isNew: boolean;
    balance: number;
  }>;
  newCustomerAcquisitions: number;

  // 3. Targets Aspect (Per-Unit Volume & Rate Structure)
  unitType: string;
  targetUnits: number;
  achievedUnits: number;
  amountPerUnit: number; // Rate per unit (₹)
  targetTotalAmount: number; // targetUnits * amountPerUnit
  achievedTotalAmount: number; // achievedUnits * amountPerUnit
  achievementPercent: number;

  // 4. Invoicing & Verified Cash Collections (Revenue Governance)
  invoicesCreatedCount: number;
  totalInvoicedValue: number;
  paymentsCollected: number; // Strictly verified collected revenue (never counting unpaid bills!)
  outstandingInvoiceValue: number;
  invoicesList: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    orderNumber?: string;
    invoiceDate: string;
    totalAmount: number;
    paidAmount: number;
    outstandingBalance: number;
    status: string;
    paymentStatus: string;
  }>;

  // 5. Orders & Deliveries Aspect
  ordersCompletedCount: number;
  ordersPendingCount: number;
  ordersList: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    orderDate: string;
  }>;

  // 6. Completed vs Pending Work Breakdown
  completedWorkCount: number;
  pendingWorkCount: number;

  // Operational Aspects
  ordersBookedCount: number;
  avgDiscountGiven: number;
  maxAllowedDiscount: number;

  // Commercial Commission / Incentive
  commissionRate: number;
  commissionPayable: number;
  performanceTier: 'platinum' | 'gold' | 'silver' | 'bronze' | 'needs_attention';
  tierLabel: string;
}

export const AdminSalesPerformanceCommissions: React.FC = () => {
  const {
    users,
    salesOrders,
    quotations,
    customers,
    salesTargets,
    marketingTargets,
    regions,
    invoices,
    selectedRegionId,
    setSelectedRegionId,
    addNotification,
  } = useErpStore();

  const [selectedPeriod, setSelectedPeriod] = useState('October 2026');
  const [activeRoleTab, setActiveRoleTab] = useState<'all' | 'sales' | 'marketing' | 'store' | 'finance'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'exceeded' | 'on_track' | 'lagging'>('all');

  // Selected User for Scorecard & Payout Modal
  const [selectedScorecard, setSelectedScorecard] = useState<UserPerformanceScorecard | null>(null);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutSuccessMessage, setPayoutSuccessMessage] = useState<string | null>(null);

  const getRegionName = (regId?: string) => {
    if (!regId || regId === 'all') return 'All Territories (National)';
    return regions.find((r) => r.id === regId)?.name || regId;
  };

  // Compile Comprehensive All-Roles User Performance
  const allUserScorecards = useMemo<UserPerformanceScorecard[]>(() => {
    return users.map((user) => {
      const territory = getRegionName(user.assignedRegionId);

      // 1. Role Title & Department Mapping
      let roleTitle = 'Operational Specialist';
      let department = 'Operations';
      if (user.role === 'sales') {
        roleTitle = user.id === 'usr-sales-01' ? 'Field Sales Lead (North)' : 'Regional Sales Specialist (West)';
        department = 'Commercial Sales';
      } else if (user.role === 'marketing') {
        roleTitle = 'Field Marketing Lead';
        department = 'Brand & Dealer Expansion';
      } else if (user.role === 'store_manager') {
        roleTitle = 'Store Keeper & Depot Hub Manager';
        department = 'Logistics & Warehousing';
      } else if (user.role === 'finance') {
        roleTitle = 'Finance & Treasury Controller';
        department = 'Finance & Accounts';
      } else if (user.role === 'service') {
        roleTitle = 'Customer Care & RMA Specialist';
        department = 'Client Support';
      } else if (user.role === 'admin') {
        roleTitle = 'Executive Administrator';
        department = 'Executive Management';
      }

      // 2. Quotations Created by this User
      const userQuotations = (quotations || []).filter(
        (q) => q.assignedSalesUserId === user.id || (user.role === 'admin' && q.customerId)
      );

      let quotationsCreated = userQuotations.length;
      let quotationsConverted = userQuotations.filter((q) => q.status === 'Accepted' || q.status === 'Converted').length;
      let quotationsTotalValue = userQuotations.reduce(
        (sum, q) => sum + (q.items?.reduce((s, it) => s + (it.unitPrice * it.qty), 0) || 0),
        0
      );

      // Fallback realistic metrics for roles that facilitate or assist quotes
      if (user.role === 'sales') {
        if (quotationsCreated === 0) {
          quotationsCreated = user.id === 'usr-sales-01' ? 8 : 5;
          quotationsConverted = user.id === 'usr-sales-01' ? 6 : 4;
          quotationsTotalValue = user.id === 'usr-sales-01' ? 1420000 : 1180000;
        }
      } else if (user.role === 'marketing') {
        quotationsCreated = 6;
        quotationsConverted = 4;
        quotationsTotalValue = 890000;
      } else if (user.role === 'store_manager') {
        quotationsCreated = 12; // Dispatch proformas & delivery challans
        quotationsConverted = 12;
        quotationsTotalValue = 1840000;
      } else if (user.role === 'finance') {
        quotationsCreated = 15; // Invoices & commercial quotes cleared
        quotationsConverted = 14;
        quotationsTotalValue = 2450000;
      } else if (user.role === 'admin') {
        quotationsCreated = 10;
        quotationsConverted = 9;
        quotationsTotalValue = 3500000;
      }

      const quotationConversionRate =
        quotationsCreated > 0 ? Math.round((quotationsConverted / quotationsCreated) * 100) : 0;

      const quotationsList = userQuotations.map((q) => ({
        id: q.id,
        quotationNo: q.quotationNo,
        customerName: q.customerName || 'Direct Industrial Client',
        totalAmount: q.items?.reduce((s, it) => s + (it.unitPrice * it.qty), 0) || 85000,
        status: q.status,
        createdDate: q.createdDate,
      }));

      // 3. Customers Handled by this User
      const userCustomers = (customers || []).filter(
        (c) =>
          c.assignedSalesUserId === user.id ||
          c.assignedMarketingUserId === user.id ||
          (user.role === 'admin') ||
          (user.role === 'finance')
      );

      let customersHandledCount = userCustomers.length;
      let newCustomerAcquisitions = userCustomers.filter(
        (c) => c.customerTypeClassification === 'new' || (c.totalCompletedOrders || 0) <= 1
      ).length;

      if (user.role === 'sales') {
        customersHandledCount = Math.max(user.id === 'usr-sales-01' ? 7 : 5, customersHandledCount);
        newCustomerAcquisitions = user.id === 'usr-sales-01' ? 2 : 1;
      } else if (user.role === 'marketing') {
        customersHandledCount = 12;
        newCustomerAcquisitions = 4;
      } else if (user.role === 'store_manager') {
        customersHandledCount = 10;
        newCustomerAcquisitions = 2;
      } else if (user.role === 'finance') {
        customersHandledCount = 14;
        newCustomerAcquisitions = 3;
      } else if (user.role === 'admin') {
        customersHandledCount = customers.length || 15;
        newCustomerAcquisitions = 5;
      }

      const customerAccounts = userCustomers.slice(0, 5).map((c) => ({
        id: c.code || c.id,
        name: c.name,
        city: c.address ? c.address.split(',')[1]?.trim() || 'NCR Region' : 'NCR Region',
        isNew: c.customerTypeClassification === 'new',
        balance: c.currentOutstanding || 0,
      }));

      // 4. Targets with Per-Unit Structure
      let unitType = 'Units';
      let targetUnits = 500;
      let achievedUnits = 412;
      let amountPerUnit = 3000;
      let targetTotalAmount = 1500000;
      let achievedTotalAmount = 1236000;

      if (user.role === 'sales') {
        const sTarget = salesTargets.find((t) => t.userId === user.id);
        unitType = sTarget?.unitMeasurement || 'Units';
        amountPerUnit = sTarget?.amountPerUnit || 3000;
        targetUnits = sTarget?.targetUnits || Math.round((sTarget?.targetAmount || 1500000) / amountPerUnit);
        achievedUnits = sTarget?.achievedUnits || Math.round((sTarget?.achievedAmount || 1236000) / amountPerUnit);
        targetTotalAmount = sTarget?.targetAmount || targetUnits * amountPerUnit;
        achievedTotalAmount = sTarget?.achievedAmount || achievedUnits * amountPerUnit;
      } else if (user.role === 'marketing') {
        const mTarget = marketingTargets.find((t) => t.userId === user.id);
        unitType = 'Field Visits';
        amountPerUnit = mTarget?.ratePerVisit || 300;
        targetUnits = mTarget?.targetVisits || 50;
        achievedUnits = mTarget?.completedVisits || 38;
        targetTotalAmount = mTarget?.expenseBudget || targetUnits * amountPerUnit;
        achievedTotalAmount = achievedUnits * amountPerUnit;
      } else if (user.role === 'store_manager') {
        unitType = 'Dispatches';
        amountPerUnit = 500;
        targetUnits = 120;
        achievedUnits = 112;
        targetTotalAmount = targetUnits * amountPerUnit;
        achievedTotalAmount = achievedUnits * amountPerUnit;
      } else if (user.role === 'finance') {
        unitType = 'Reconciliations';
        amountPerUnit = 150;
        targetUnits = 200;
        achievedUnits = 194;
        targetTotalAmount = targetUnits * amountPerUnit;
        achievedTotalAmount = achievedUnits * amountPerUnit;
      } else if (user.role === 'service') {
        unitType = 'Tickets';
        amountPerUnit = 400;
        targetUnits = 40;
        achievedUnits = 38;
        targetTotalAmount = targetUnits * amountPerUnit;
        achievedTotalAmount = achievedUnits * amountPerUnit;
      } else if (user.role === 'admin') {
        unitType = 'Audits';
        amountPerUnit = 1000;
        targetUnits = 100;
        achievedUnits = 100;
        targetTotalAmount = targetUnits * amountPerUnit;
        achievedTotalAmount = achievedUnits * amountPerUnit;
      }

      const achievementPercent =
        targetTotalAmount > 0 ? (achievedTotalAmount / targetTotalAmount) * 100 : 0;

      // 4. Invoicing & Verified Cash Collections (Revenue Governance)
      const userInvoices = (invoices || []).filter(
        (inv) =>
          inv.createdByUserId === user.id ||
          inv.createdByUserId === (user as any).employeeId ||
          (user.role === 'admin' && inv.source === 'admin_manual')
      );

      let invoicesCreatedCount = userInvoices.length;
      let totalInvoicedValue = userInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      let paymentsCollected = userInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      let outstandingInvoiceValue = userInvoices.reduce((sum, inv) => sum + (inv.outstandingBalance || 0), 0);

      // Realistic baselines for demonstration roles if no user invoices exist yet
      if (user.role === 'sales') {
        if (invoicesCreatedCount === 0) {
          invoicesCreatedCount = user.id === 'usr-sales-01' ? 3 : 2;
          totalInvoicedValue = user.id === 'usr-sales-01' ? 1319166 : 750000;
          paymentsCollected = user.id === 'usr-sales-01' ? 895396 : 450000;
          outstandingInvoiceValue = totalInvoicedValue - paymentsCollected;
        }
      } else if (user.role === 'admin') {
        if (invoicesCreatedCount === 0) {
          invoicesCreatedCount = 2;
          totalInvoicedValue = 296227;
          paymentsCollected = 201780;
          outstandingInvoiceValue = 94447;
        }
      } else if (user.role === 'marketing') {
        invoicesCreatedCount = 4;
        totalInvoicedValue = 480000;
        paymentsCollected = 480000;
        outstandingInvoiceValue = 0;
      } else if (user.role === 'store_manager') {
        invoicesCreatedCount = 8;
        totalInvoicedValue = 890000;
        paymentsCollected = 750000;
        outstandingInvoiceValue = 140000;
      } else if (user.role === 'finance') {
        invoicesCreatedCount = 12;
        totalInvoicedValue = 1850000;
        paymentsCollected = 1620000;
        outstandingInvoiceValue = 230000;
      }

      const invoicesList =
        userInvoices.length > 0
          ? userInvoices.map((i) => ({
              id: i.id,
              invoiceNumber: i.invoiceNumber,
              customerName: i.customerName,
              orderNumber: i.orderNumber,
              invoiceDate: i.invoiceDate,
              totalAmount: i.totalAmount,
              paidAmount: i.paidAmount || 0,
              outstandingBalance: i.outstandingBalance || 0,
              status: i.status,
              paymentStatus: i.paymentStatus,
            }))
          : [
              {
                id: `inv-${user.id}-1`,
                invoiceNumber: `INV-2026-0${user.id.slice(-2)}1`,
                customerName: userCustomers[0]?.name || 'Standard Client Account',
                orderNumber: 'SO-2026-089',
                invoiceDate: '2026-10-19',
                totalAmount: totalInvoicedValue,
                paidAmount: paymentsCollected,
                outstandingBalance: outstandingInvoiceValue,
                status: outstandingInvoiceValue === 0 ? 'paid' : 'partially_paid',
                paymentStatus: outstandingInvoiceValue === 0 ? 'paid' : 'partially_paid',
              },
            ];

      // 5. Orders and Discounts
      const userOrders = (salesOrders || []).filter(
        (o) => o.salesUserId === user.id && o.status !== 'cancelled'
      );
      const ordersBookedCount = userOrders.length || (user.role === 'sales' ? (user.id === 'usr-sales-01' ? 8 : 5) : 4);
      const ordersCompletedCount = userOrders.filter((o) => o.status === 'completed' || o.status === 'dispatched').length || (user.role === 'sales' ? 6 : 4);
      const ordersPendingCount = Math.max(0, ordersBookedCount - ordersCompletedCount);

      const ordersList = (userOrders.length > 0 ? userOrders : salesOrders || []).slice(0, 5).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        totalAmount: o.totalAmount,
        status: o.status,
        paymentStatus: o.paymentStatus,
        orderDate: o.createdAt?.split('T')[0] || '2026-10-18',
      }));

      // 6. Completed vs Pending Work Breakdown
      const completedWorkCount = ordersCompletedCount + quotationsConverted + (invoicesList.filter((i) => i.paymentStatus === 'paid').length || 1);
      const pendingWorkCount = ordersPendingCount + Math.max(0, quotationsCreated - quotationsConverted) + (invoicesList.filter((i) => i.paymentStatus !== 'paid').length || 1);

      const avgDiscountGiven =
        userOrders.length > 0
          ? userOrders.reduce((sum, o) => {
              const orderAvg =
                (o.items?.reduce((s, it) => s + (it.discountPercent || 0), 0) || 0) /
                (o.items?.length || 1);
              return sum + orderAvg;
            }, 0) / userOrders.length
          : user.role === 'sales'
          ? user.id === 'usr-sales-01'
            ? 4.2
            : 3.8
          : 0;

      const maxAllowedDiscount = user.maxDiscountPercent || 10;

      // 6. Incentive & Tier
      let commissionRate = 0;
      let tierLabel = 'Bronze Developing';
      let performanceTier: UserPerformanceScorecard['performanceTier'] = 'bronze';

      if (achievementPercent >= 110) {
        commissionRate = 0.05;
        tierLabel = 'Platinum Achiever (5.0%)';
        performanceTier = 'platinum';
      } else if (achievementPercent >= 95) {
        commissionRate = 0.035;
        tierLabel = 'Gold Target Met (3.5%)';
        performanceTier = 'gold';
      } else if (achievementPercent >= 80) {
        commissionRate = 0.02;
        tierLabel = 'Silver On Track (2.0%)';
        performanceTier = 'silver';
      } else {
        commissionRate = 0.01;
        tierLabel = 'Bronze Developing (1.0%)';
        performanceTier = 'bronze';
      }

      const commissionPayable = Math.round(
        user.role === 'sales'
          ? achievedTotalAmount * commissionRate
          : user.role === 'marketing'
          ? (achievedUnits * 50) + (newCustomerAcquisitions * 2500)
          : Math.round(achievedTotalAmount * 0.08)
      );

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          employeeId: (user as any).employeeId || `TZM-EMP-${user.id.slice(-3).toUpperCase()}`,
          assignedRegionId: user.assignedRegionId,
          maxDiscountPercent: user.maxDiscountPercent,
        },
        roleTitle,
        department,
        territory,
        quotationsCreated,
        quotationsConverted,
        quotationsTotalValue,
        quotationConversionRate,
        quotationsList,
        customersHandledCount,
        customerAccounts,
        newCustomerAcquisitions,
        unitType,
        targetUnits,
        achievedUnits,
        amountPerUnit,
        targetTotalAmount,
        achievedTotalAmount,
        achievementPercent,
        invoicesCreatedCount,
        totalInvoicedValue,
        paymentsCollected,
        outstandingInvoiceValue,
        invoicesList,
        ordersCompletedCount,
        ordersPendingCount,
        ordersList,
        completedWorkCount,
        pendingWorkCount,
        ordersBookedCount,
        avgDiscountGiven,
        maxAllowedDiscount,
        commissionRate,
        commissionPayable,
        performanceTier,
        tierLabel,
      };
    });
  }, [users, salesOrders, quotations, customers, salesTargets, marketingTargets, regions]);

  // Filter Scorecards
  const filteredScorecards = useMemo(() => {
    return allUserScorecards.filter((sc) => {
      // Role filter
      if (activeRoleTab !== 'all') {
        if (activeRoleTab === 'sales' && sc.user.role !== 'sales') return false;
        if (activeRoleTab === 'marketing' && sc.user.role !== 'marketing') return false;
        if (activeRoleTab === 'store' && sc.user.role !== 'store_manager') return false;
        if (activeRoleTab === 'finance' && sc.user.role !== 'finance') return false;
      }

      // Territory filter
      if (selectedRegionId !== 'all') {
        if (sc.user.assignedRegionId !== selectedRegionId && sc.user.assignedRegionId !== 'all') {
          return false;
        }
      }

      // Status / Attainment filter
      if (statusFilter === 'exceeded' && sc.achievementPercent < 100) return false;
      if (statusFilter === 'on_track' && (sc.achievementPercent < 80 || sc.achievementPercent >= 100)) return false;
      if (statusFilter === 'lagging' && sc.achievementPercent >= 80) return false;

      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          sc.user.name.toLowerCase().includes(q) ||
          sc.roleTitle.toLowerCase().includes(q) ||
          sc.department.toLowerCase().includes(q) ||
          sc.territory.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [allUserScorecards, activeRoleTab, selectedRegionId, statusFilter, searchTerm]);

  // Aggregates for Summary
  const totalQuotationsCount = allUserScorecards.reduce((sum, s) => sum + s.quotationsCreated, 0);
  const totalQuotationsValue = allUserScorecards.reduce((sum, s) => sum + s.quotationsTotalValue, 0);
  const totalCustomersManaged = allUserScorecards.reduce((sum, s) => sum + s.customersHandledCount, 0);
  const totalTargetQuotaRevenue = allUserScorecards
    .filter((s) => s.user.role === 'sales')
    .reduce((sum, s) => sum + s.targetTotalAmount, 0);
  const totalDeliveredRevenue = allUserScorecards
    .filter((s) => s.user.role === 'sales')
    .reduce((sum, s) => sum + s.achievedTotalAmount, 0);
  const totalIncentivePool = allUserScorecards.reduce((sum, s) => sum + s.commissionPayable, 0);

  // Handle Authorize Payout
  const handleOpenPayoutModal = (sc: UserPerformanceScorecard) => {
    setSelectedScorecard(sc);
    setPayoutModalOpen(true);
  };

  const handleConfirmPayout = () => {
    if (selectedScorecard) {
      setPayoutSuccessMessage(
        `Performance incentive of ₹${selectedScorecard.commissionPayable.toLocaleString('en-IN')} successfully authorized for ${selectedScorecard.user.name} (${selectedScorecard.roleTitle})!`
      );
      addNotification({
        title: 'Commission Payout Authorized',
        message: `Incentive payout of ₹${selectedScorecard.commissionPayable.toLocaleString('en-IN')} authorized for ${selectedScorecard.user.name} for period ${selectedPeriod}.`,
        userId: selectedScorecard.user.id,
        type: 'success',
      });
      setTimeout(() => setPayoutSuccessMessage(null), 4000);
      setPayoutModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              All-Roles Team Performance &amp; Commission Matrix
            </h1>
            <Badge variant="purple" size="sm">
              Cross-Role Governance
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track user performance in every aspect: quotations created, customer accounts handled, unit-rate quota delivery, and authorized performance incentives across all departments.
          </p>
        </div>

        {/* Territory & Period Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-xs">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <select
              value={selectedRegionId}
              onChange={(e) => setSelectedRegionId(e.target.value)}
              className="bg-transparent text-indigo-700 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All Territories</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-xs font-bold text-slate-700">
            {selectedPeriod}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {payoutSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{payoutSuccessMessage}</span>
          </div>
          <Badge variant="success" size="sm">
            Dispatched to Payroll
          </Badge>
        </div>
      )}

      {/* SECTION: PERFORMANCE KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Commercial Target Quotas */}
        <div className="glass-card p-5 border border-indigo-200 bg-indigo-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
              Sales Quota Delivery
            </p>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
              ₹{totalDeliveredRevenue.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Target: ₹{totalTargetQuotaRevenue.toLocaleString('en-IN')} (
              {totalTargetQuotaRevenue > 0
                ? ((totalDeliveredRevenue / totalTargetQuotaRevenue) * 100).toFixed(1)
                : 0}
              %)
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Quotations Created Aspect */}
        <div className="glass-card p-5 border border-emerald-200 bg-emerald-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
              Quotations Created
            </p>
            <div className="text-2xl font-black text-emerald-950 mt-0.5 font-mono">
              {totalQuotationsCount} Quotes
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Pipeline: ₹{totalQuotationsValue.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Customer Accounts Handled */}
        <div className="glass-card p-5 border border-amber-200 bg-amber-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
              Accounts Handled
            </p>
            <div className="text-2xl font-black text-amber-950 mt-0.5 font-mono">
              {totalCustomersManaged} Accounts
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Active client portfolios handled
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Performance Incentive Pool */}
        <div className="glass-card p-5 border border-purple-200 bg-purple-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">
              Total Incentive Pool
            </p>
            <div className="text-2xl font-black text-purple-950 mt-0.5 font-mono">
              ₹{totalIncentivePool.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Across all role scorecards
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS & TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Role Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveRoleTab('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeRoleTab === 'all'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Roles ({allUserScorecards.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveRoleTab('sales')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeRoleTab === 'sales'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sales Team ({allUserScorecards.filter((s) => s.user.role === 'sales').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveRoleTab('marketing')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeRoleTab === 'marketing'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Field Marketing ({allUserScorecards.filter((s) => s.user.role === 'marketing').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveRoleTab('store')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeRoleTab === 'store'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Store &amp; Logistics ({allUserScorecards.filter((s) => s.user.role === 'store_manager').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveRoleTab('finance')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeRoleTab === 'finance'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Finance &amp; Treasury ({allUserScorecards.filter((s) => s.user.role === 'finance').length})
          </button>
        </div>

        {/* Search & Attainment Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user, role, territory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-52 sm:w-60"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Attainment Levels</option>
            <option value="exceeded">Exceeded Target (≥100%)</option>
            <option value="on_track">On Track (80% – 99%)</option>
            <option value="lagging">Needs Attention (&lt;80%)</option>
          </select>
        </div>
      </div>

      {/* ALL-ROLES PERFORMANCE TABLE */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>User Performance Matrix &amp; Multi-Aspect Scorecards</CardTitle>
              <CardDescription>
                Live monitoring of quotations created, client accounts handled, unit-rate quotas, and authorized incentive payouts.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 mr-1.5" />
                Export Payroll Ledger
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                <th className="py-3 px-4">User &amp; Department</th>
                <th className="py-3 px-4">Invoicing &amp; Collections</th>
                <th className="py-3 px-4">Quotations Created</th>
                <th className="py-3 px-4">Accounts Handled</th>
                <th className="py-3 px-4">Target Quota (Structure)</th>
                <th className="py-3 px-4">Delivered Volume</th>
                <th className="py-3 px-4" style={{ minWidth: '150px' }}>Attainment Rate</th>
                <th className="py-3 px-4 text-center">Performance Tier</th>
                <th className="py-3 px-4 text-right">Incentive Payable</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredScorecards.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                    No users matching the active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredScorecards.map((sc) => {
                  const isExceeded = sc.achievementPercent >= 100;
                  const isOnTrack = sc.achievementPercent >= 80 && sc.achievementPercent < 100;

                  return (
                    <tr key={sc.user.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              sc.user.avatar ||
                              'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'
                            }
                            alt={sc.user.name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">
                              {sc.user.name}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {sc.roleTitle}
                            </span>
                            <span className="text-[10px] text-indigo-600 font-medium font-mono">
                              {sc.territory}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Invoicing & Collections */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 block font-mono">
                              {sc.invoicesCreatedCount} Invoices
                            </span>
                            <span className="text-[10px] text-slate-400">
                              (₹{sc.totalInvoicedValue.toLocaleString('en-IN')})
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-700 font-semibold block">
                            Collected: ₹{sc.paymentsCollected.toLocaleString('en-IN')}
                          </span>
                          {sc.outstandingInvoiceValue > 0 ? (
                            <span className="text-[10px] text-rose-600 font-mono block">
                              Due: ₹{sc.outstandingInvoiceValue.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono block">
                              No dues outstanding
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Quotations Created Aspect */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-extrabold text-slate-900 block">
                            {sc.quotationsCreated} Quotations
                          </span>
                          <span className="text-[10px] text-emerald-700 font-semibold block">
                            {sc.quotationsConverted} converted ({sc.quotationConversionRate}%)
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Value: ₹{sc.quotationsTotalValue.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </td>

                      {/* Customers Handled Aspect */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-extrabold text-slate-900 block font-mono">
                            {sc.customersHandledCount} Accounts
                          </span>
                          <span className="text-[10px] text-indigo-600 font-medium block">
                            +{sc.newCustomerAcquisitions} new acquired
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Active portfolio
                          </span>
                        </div>
                      </td>

                      {/* Targets Quota (Per-Unit Structure) */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-slate-900 block font-mono">
                            ₹{sc.targetTotalAmount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-indigo-700 font-semibold block bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60 mt-0.5">
                            {sc.targetUnits} {sc.unitType} @ ₹{sc.amountPerUnit.toLocaleString('en-IN')}/{sc.unitType.toLowerCase().slice(0, 4)}
                          </span>
                        </div>
                      </td>

                      {/* Delivered Volume & Amount */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-extrabold text-indigo-900 block font-mono">
                            ₹{sc.achievedTotalAmount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium block">
                            {sc.achievedUnits} of {sc.targetUnits} {sc.unitType}
                          </span>
                        </div>
                      </td>

                      {/* Attainment Progress */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-semibold">
                            <span
                              className={`font-black ${
                                isExceeded
                                  ? 'text-emerald-700'
                                  : isOnTrack
                                  ? 'text-indigo-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {sc.achievementPercent.toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {isExceeded ? 'Achieved' : `${Math.max(0, sc.targetUnits - sc.achievedUnits)} to go`}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isExceeded ? 'bg-emerald-500' : isOnTrack ? 'bg-indigo-600' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, sc.achievementPercent)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Performance Tier */}
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          size="sm"
                          variant={
                            sc.performanceTier === 'platinum'
                              ? 'purple'
                              : sc.performanceTier === 'gold'
                              ? 'success'
                              : sc.performanceTier === 'silver'
                              ? 'primary'
                              : 'warning'
                          }
                        >
                          {sc.tierLabel.split(' ')[0]}
                        </Badge>
                      </td>

                      {/* Incentive Payable */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-emerald-800">
                        ₹{sc.commissionPayable.toLocaleString('en-IN')}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSelectedScorecard(sc);
                              setPayoutModalOpen(true);
                            }}
                            className="h-7 text-xs px-2"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Scorecard
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleOpenPayoutModal(sc)}
                            disabled={sc.commissionPayable === 0}
                            className="h-7 text-xs px-2"
                          >
                            Authorize
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

      {/* USER PERFORMANCE SCORECARD & PAYOUT MODAL */}
      {payoutModalOpen && selectedScorecard && (
        <Modal
          isOpen={payoutModalOpen}
          onClose={() => setPayoutModalOpen(false)}
          title={`Performance Scorecard: ${selectedScorecard.user.name}`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs text-slate-800">
            {/* Header Roster Details */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={
                    selectedScorecard.user.avatar ||
                    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'
                  }
                  alt={selectedScorecard.user.name}
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-sm"
                />
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {selectedScorecard.user.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedScorecard.roleTitle} • {selectedScorecard.department}
                  </p>
                  <p className="text-[10px] text-indigo-600 font-mono mt-0.5">
                    Employee ID: {selectedScorecard.user.employeeId} | Territory: {selectedScorecard.territory}
                  </p>
                </div>
              </div>

              <Badge variant="purple" size="md">
                {selectedScorecard.tierLabel}
              </Badge>
            </div>

            {/* Aspect 1: Invoicing & Collections Ledger */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  1. Invoicing &amp; Revenue Collections Ledger
                </span>
                <span className="text-xs font-extrabold text-emerald-800">
                  {selectedScorecard.invoicesCreatedCount} Invoices Issued
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
                <div className="p-2 rounded-xl bg-white border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block">Total Invoiced</span>
                  <span className="text-sm font-black text-slate-900 font-mono">
                    ₹{selectedScorecard.totalInvoicedValue.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block">Payments Collected</span>
                  <span className="text-sm font-black text-emerald-700 font-mono">
                    ₹{selectedScorecard.paymentsCollected.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block">Outstanding Balance</span>
                  <span className="text-sm font-black text-rose-600 font-mono">
                    ₹{selectedScorecard.outstandingInvoiceValue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {selectedScorecard.invoicesList.length > 0 && (
                <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedScorecard.invoicesList.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-white border border-emerald-100 text-[11px]"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block font-mono">{inv.invoiceNumber}</span>
                        <span className="text-[10px] text-slate-400">
                          {inv.customerName} • {inv.invoiceDate}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 block font-mono">
                          ₹{inv.totalAmount.toLocaleString('en-IN')}
                        </span>
                        <span className={`text-[10px] font-semibold ${
                          inv.paymentStatus === 'paid'
                            ? 'text-emerald-700'
                            : inv.paymentStatus === 'partially_paid'
                            ? 'text-amber-700'
                            : 'text-rose-600'
                        }`}>
                          {inv.paymentStatus.toUpperCase()} (Paid: ₹{inv.paidAmount.toLocaleString('en-IN')})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Aspect 2: Orders & Completed Work Breakdown */}
            <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-950 uppercase tracking-wide flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-sky-600" />
                  2. Orders &amp; Execution Work Breakdown
                </span>
                <span className="text-xs font-extrabold text-sky-800">
                  {selectedScorecard.ordersCompletedCount} Completed / {selectedScorecard.ordersPendingCount} Pending
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1 text-center">
                <div className="p-2 rounded-xl bg-white border border-sky-100">
                  <span className="text-[10px] text-slate-400 block">Orders Completed &amp; Dispatched</span>
                  <span className="text-base font-black text-emerald-700 font-mono">
                    {selectedScorecard.ordersCompletedCount} Orders
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-sky-100">
                  <span className="text-[10px] text-slate-400 block">Orders Pending / In Progress</span>
                  <span className="text-base font-black text-amber-600 font-mono">
                    {selectedScorecard.ordersPendingCount} Orders
                  </span>
                </div>
              </div>
            </div>

            {/* Aspect 3: Quotations Created Breakdown */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  3. Quotations Aspect Breakdown
                </span>
                <span className="text-xs font-extrabold text-indigo-700">
                  {selectedScorecard.quotationConversionRate}% Conversion Rate
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
                <div className="p-2 rounded-xl bg-white border border-indigo-100">
                  <span className="text-[10px] text-slate-400 block">Total Created</span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    {selectedScorecard.quotationsCreated} Quotes
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-indigo-100">
                  <span className="text-[10px] text-slate-400 block">Converted into Orders</span>
                  <span className="text-base font-black text-emerald-700 font-mono">
                    {selectedScorecard.quotationsConverted} Won
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-indigo-100">
                  <span className="text-[10px] text-slate-400 block">Gross Quote Value</span>
                  <span className="text-base font-black text-indigo-900 font-mono">
                    ₹{selectedScorecard.quotationsTotalValue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Aspect 4: Customers Handled Portfolio */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-600" />
                  4. Customer Accounts Handled ({selectedScorecard.customersHandledCount} Total)
                </span>
                <span className="text-xs font-semibold text-amber-800">
                  +{selectedScorecard.newCustomerAcquisitions} New Customers Acquired
                </span>
              </div>

              <div className="space-y-1.5">
                {selectedScorecard.customerAccounts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-amber-100 text-[11px]"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{c.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {c.id} • {c.city}
                      </span>
                    </div>
                    <div className="text-right">
                      <Badge variant={c.isNew ? 'primary' : 'success'} size="sm">
                        {c.isNew ? 'New Customer' : 'Existing Customer'}
                      </Badge>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                        Balance: ₹{c.balance.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aspect 5: Target Quota (Per-Unit Structure Math) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <Target className="w-4 h-4 text-indigo-600" />
                5. Commercial Target Math (Per-Unit Structure)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Unit Type</span>
                  <span className="font-bold text-slate-900 text-xs block mt-0.5">
                    {selectedScorecard.unitType}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Rate / Unit</span>
                  <span className="font-bold text-indigo-700 text-xs font-mono block mt-0.5">
                    ₹{selectedScorecard.amountPerUnit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Target Units</span>
                  <span className="font-bold text-slate-900 text-xs font-mono block mt-0.5">
                    {selectedScorecard.targetUnits} {selectedScorecard.unitType}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Total Quota</span>
                  <span className="font-black text-slate-900 text-xs font-mono block mt-0.5">
                    ₹{selectedScorecard.targetTotalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                <span className="text-[11px] text-indigo-900 font-semibold">
                  Achieved: {selectedScorecard.achievedUnits} {selectedScorecard.unitType} × ₹{selectedScorecard.amountPerUnit}/unit = ₹{selectedScorecard.achievedTotalAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-black text-indigo-700 font-mono">
                  {selectedScorecard.achievementPercent.toFixed(1)}% Attainment
                </span>
              </div>
            </div>

            {/* Approved Incentive Payout Box */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Authorized Performance Commission
              </span>
              <div className="text-3xl font-black font-mono text-emerald-950">
                ₹{selectedScorecard.commissionPayable.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-emerald-700">
                Performance tier incentive calculated across delivered quota and customer handling metrics for {selectedPeriod}.
              </p>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="md"
                onClick={() => setPayoutModalOpen(false)}
              >
                Close Scorecard
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirmPayout}
                disabled={selectedScorecard.commissionPayable === 0}
              >
                <Check className="w-4 h-4 mr-1.5" />
                Authorize &amp; Release Incentive
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
