import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useErpStore } from '../../store/useErpStore';
import { SubscriptionPlan, PLAN_TIERS } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  CreditCard,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Zap,
  ShieldCheck,
  ArrowRight,
  Download,
  RefreshCw,
  Sparkles,
  Building2,
  Receipt,
  QrCode,
  Lock,
  ChevronRight,
  Search,
  Check,
  Copy,
  ExternalLink,
  Info,
  Layers,
  HelpCircle,
  Eye,
  Sliders,
  Warehouse,
  Users,
  MapPin,
  FileText,
  AlertOctagon,
  Percent,
  Tag,
  ArrowUpRight,
  CheckCheck,
} from 'lucide-react';

// Billing Cycle Type
export type BillingCycle = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';

// Plan Specification for Billing
interface PlanBillingSpec {
  tier: SubscriptionPlan;
  name: string;
  badge?: string;
  isRecommended?: boolean;
  tagline: string;
  monthlyBasePrice: number;
  maxEmployees: string;
  maxRegions: string;
  maxWarehouses: string;
  features: string[];
  exclusivePerks: string[];
}

const AVAILABLE_PLANS: PlanBillingSpec[] = [
  {
    tier: 'Standard',
    name: 'Standard Growth',
    tagline: 'Ideal for emerging regional distributors & single-hub depots.',
    monthlyBasePrice: 14999,
    maxEmployees: '5 Team Members',
    maxRegions: '1 Operational Territory',
    maxWarehouses: '1 Central Depot Hub',
    features: [
      'Up to 5 Team Members',
      '1 Operational Territory',
      '1 Central Depot Hub',
      'Standard Sales & Quotations',
      'Basic Inward Receipts & GRN',
      'Customer Directory & Ledger',
      'Email Support (48h SLA)',
    ],
    exclusivePerks: ['Basic Reporting', 'Mobile Field App Access'],
  },
  {
    tier: 'Professional',
    name: 'Professional Multi-Depot',
    tagline: 'Engineered for scaling manufacturers with distributed regional sales teams.',
    monthlyBasePrice: 34999,
    maxEmployees: '20 Team Members',
    maxRegions: '3 Regional Territories',
    maxWarehouses: '5 Distributed Warehouses',
    features: [
      'Up to 20 Team Members',
      '3 Regional Territories',
      '5 Distributed Warehouses',
      'Inter-Depot Cargo Transfers',
      'Sales Performance & Tiered Commissions',
      'Dynamic Discount Authorization Matrix',
      'Field Marketing GPS & Visit Planner',
      'Priority Phone & Desk Support (12h SLA)',
    ],
    exclusivePerks: ['Batch Expiry Risk Alerts', 'Consignment Shortage Audits'],
  },
  {
    tier: 'Enterprise',
    name: 'Enterprise Multi-Tenant',
    badge: 'RECOMMENDED',
    isRecommended: true,
    tagline: 'Unlimited multi-tenant governance with full audit, QC lab releases & custom limits.',
    monthlyBasePrice: 79999,
    maxEmployees: 'Unlimited Team Members',
    maxRegions: 'Unlimited Territories',
    maxWarehouses: 'Unlimited Warehouse Depots',
    features: [
      'Unlimited Team Members',
      'Unlimited Regional Territories',
      'Unlimited Warehouse Depots',
      'QC Quarantine & Lab Releases',
      'Physical Cycle Audits & Shrinkage Write-offs',
      'Customer Credit Risk Freezes & Overlimit Alerts',
      'Multi-Tenant Data Partitioning',
      'Dedicated ERP Technical Account Manager',
      '24/7 Enterprise SLA Support',
    ],
    exclusivePerks: ['Custom ERP API Connectors', 'Cryptographic Audit Trail'],
  },
];

export const SubscriptionBillingView: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentOrganization,
    upgradePlan,
    users,
    warehouses,
    regions,
    products,
    customers,
    suppliers,
    salesOrders,
    purchaseOrders,
    batches,
    addNotification,
  } = useErpStore();

  // Active Organization Info
  const org = currentOrganization || {
    id: 'org-apex',
    teamId: 'APEX-2026',
    name: 'Tzmicha ERP & Manufacturing Ltd',
    legalName: 'Tzmicha Speciality Industrial Solutions India Pvt Ltd',
    taxGstNumber: '07AAACA1234F1Z5',
    plan: 'Enterprise' as SubscriptionPlan,
  };

  // State Management
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('yearly');
  const [autoRenew, setAutoRenew] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [licenseKey] = useState<string>('TZM-ENT-2026-9481-AX99-7712');

  // Simulation mode for reviewers to easily check UI states
  const [simulatedExpiryState, setSimulatedExpiryState] = useState<'normal' | 'expiring_soon' | 'expired'>('normal');

  // Dynamic dates based on simulated state
  const { startDate, expiryDate, daysRemaining, statusBadge } = useMemo(() => {
    const today = new Date();
    if (simulatedExpiryState === 'expired') {
      const exp = new Date(today);
      exp.setDate(today.getDate() - 2);
      const start = new Date(today);
      start.setDate(today.getDate() - 367);
      return {
        startDate: start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        expiryDate: exp.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        daysRemaining: 0,
        statusBadge: { label: 'Expired', variant: 'danger' as const },
      };
    }

    if (simulatedExpiryState === 'expiring_soon') {
      const exp = new Date(today);
      exp.setDate(today.getDate() + 4);
      const start = new Date(today);
      start.setDate(today.getDate() - 361);
      return {
        startDate: start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        expiryDate: exp.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        daysRemaining: 4,
        statusBadge: { label: 'Expiring Soon (4 Days)', variant: 'warning' as const },
      };
    }

    // Normal active state
    return {
      startDate: '15 Nov 2025',
      expiryDate: '14 Nov 2026',
      daysRemaining: 33,
      statusBadge: { label: 'Active Subscription', variant: 'success' as const },
    };
  }, [simulatedExpiryState]);

  // Recharge Modal States
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState<PlanBillingSpec>(AVAILABLE_PLANS[2]); // default Enterprise
  const [targetCycle, setTargetCycle] = useState<BillingCycle>('yearly');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'netbanking' | 'card' | 'wire'>('upi');
  const [selectedBank, setSelectedBank] = useState<string>('HDFC Bank');
  const [cardDetails, setCardDetails] = useState({
    number: '4111 8829 3910 8821',
    name: 'Rajesh Verma',
    expiry: '09/28',
    cvv: '882',
  });
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Recharge Processing States
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    id: string;
    transactionId: string;
    planName: string;
    totalAmount: number;
    validityRange: string;
  } | null>(null);

  // Grace Period Request Modal
  const [gracePeriodModalOpen, setGracePeriodModalOpen] = useState(false);
  const [gracePeriodRequested, setGracePeriodRequested] = useState(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handle Copy License Key
  const handleCopyKey = () => {
    navigator.clipboard.writeText(licenseKey);
    setCopiedKey(true);
    showToast('License Key copied to clipboard!');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Cycle Multipliers & Discounts
  const getCycleDetails = (cycle: BillingCycle) => {
    switch (cycle) {
      case 'monthly':
        return { months: 1, discountPct: 0, label: 'Monthly Plan', saveTag: 'Standard Price' };
      case 'quarterly':
        return { months: 3, discountPct: 5, label: 'Quarterly Plan (3 Months)', saveTag: 'Save 5%' };
      case 'half_yearly':
        return { months: 6, discountPct: 10, label: 'Half-Yearly Plan (6 Months)', saveTag: 'Save 10%' };
      case 'yearly':
      default:
        return { months: 12, discountPct: 20, label: 'Yearly Plan (12 Months)', saveTag: 'Save 20% + 2 Months Free' };
    }
  };

  // Calculate pricing for a plan and cycle
  const calculatePlanCost = (baseMonthlyPrice: number, cycle: BillingCycle, discountPctOverride = 0) => {
    const { months, discountPct } = getCycleDetails(cycle);
    const gross = baseMonthlyPrice * months;
    const cycleDiscount = Math.round((gross * discountPct) / 100);
    const afterCycleDiscount = gross - cycleDiscount;
    const extraPromoDiscount = Math.round((afterCycleDiscount * discountPctOverride) / 100);
    const taxableBase = afterCycleDiscount - extraPromoDiscount;
    const gst18 = Math.round(taxableBase * 0.18);
    const netTotal = taxableBase + gst18;

    return {
      gross,
      cycleDiscount,
      extraPromoDiscount,
      taxableBase,
      gst18,
      netTotal,
      monthlyEffective: Math.round(taxableBase / months),
    };
  };

  // Open Recharge Dialog for a specific plan
  const handleOpenRechargeModal = (planSpec: PlanBillingSpec) => {
    setTargetPlan(planSpec);
    setTargetCycle(selectedCycle);
    setPaymentSuccessData(null);
    setCouponCode('');
    setAppliedDiscount(0);
    setCouponMessage(null);
    setRechargeModalOpen(true);
  };

  // Apply Coupon
  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === 'GROWTH20' || code === 'ANNUAL20') {
      setAppliedDiscount(20);
      setCouponMessage({ text: 'Coupon Applied! Extra 20% Enterprise Discount deducted.', success: true });
      showToast('Special promotion discount applied: 20% OFF');
    } else if (code === 'TZMICHA10') {
      setAppliedDiscount(10);
      setCouponMessage({ text: 'Coupon Applied! Extra 10% Festive Discount deducted.', success: true });
      showToast('Promotion discount applied: 10% OFF');
    } else if (code === '') {
      setAppliedDiscount(0);
      setCouponMessage(null);
    } else {
      setAppliedDiscount(0);
      setCouponMessage({ text: 'Invalid promotional code. Please check and try again.', success: false });
    }
  };

  // Execute Simulated Payment
  const handleExecutePayment = () => {
    setIsProcessingPayment(true);

    setTimeout(() => {
      setIsProcessingPayment(false);

      const pricing = calculatePlanCost(targetPlan.monthlyBasePrice, targetCycle, appliedDiscount);
      const randInv = Math.floor(1000 + Math.random() * 9000);
      const randTxn = Math.floor(10000000 + Math.random() * 90000000);

      const today = new Date();
      const todayStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const { months } = getCycleDetails(targetCycle);

      const futureDate = new Date(today);
      futureDate.setMonth(futureDate.getMonth() + months);
      const futureDateStr = futureDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      let paymentMethodName = 'UPI Instant QR (PhonePe/GPay)';
      if (paymentMethod === 'netbanking') paymentMethodName = `${selectedBank} Corporate Net Banking`;
      if (paymentMethod === 'card') paymentMethodName = 'Commercial VISA Corporate Card';
      if (paymentMethod === 'wire') paymentMethodName = 'Direct NEFT / RTGS Bank Transfer';

      const newRecord = {
        id: `INV-TZM-2026-${randInv}`,
        transactionId: `UTR-RZP-${randTxn}`,
        planName: targetPlan.name,
        totalAmount: pricing.netTotal,
        validityRange: `${todayStr} – ${futureDateStr}`,
      };

      setPaymentSuccessData(newRecord);
      setSimulatedExpiryState('normal');

      // Update store organization plan
      upgradePlan(org.teamId, targetPlan.tier);

      // Trigger Confetti Celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // fallback if canvas not mounted
      }

      showToast(`Subscription Successfully Recharged for ${targetPlan.name}!`);
    }, 1400);
  };

  // Entity Counts for summary navigation to Master Billing Registry
  const customerCount = customers?.length || 0;
  const supplierCount = suppliers?.length || 0;
  const orderCount = (salesOrders?.length || 0) + (purchaseOrders?.length || 0);
  const batchCount = batches?.length || 0;

  // Request Grace Period Submission
  const handleRequestGracePeriod = () => {
    setGracePeriodRequested(true);
    setGracePeriodModalOpen(false);
    showToast('Corporate 7-Day Grace Period approved! License extended through next week.');
    addNotification({
      title: 'Grace Period Extension Granted',
      message: '7-day emergency operating license approved for tenant APEX-2026. Please complete procurement settlement.',
      userId: 'all',
      type: 'warning',
    });
  };

  // Resource Quotas Utilization
  const currentPlanTier = org.plan || 'Enterprise';
  const limits = PLAN_TIERS[currentPlanTier] || PLAN_TIERS.Enterprise;
  const currentUsersCount = users.length;
  const currentDepotsCount = warehouses.length;
  const currentRegionsCount = regions.length;
  const currentProductsCount = products.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          <CheckCheck className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Subscription &amp; Billing
            </h1>
            <Badge variant="purple" size="sm">
              Tenant ID: {org.teamId}
            </Badge>
            <Badge variant={statusBadge.variant} size="sm">
              <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse inline-block" />
              {statusBadge.label}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your enterprise license tier, plan renewals, tax invoices, and regional multi-depot operational capacity.
          </p>
        </div>

        {/* Top Action Buttons & Reviewer State Simulator */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Reviewer State Simulator Dropdown */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <Sliders className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">UI State:</span>
            <select
              value={simulatedExpiryState}
              onChange={(e) => setSimulatedExpiryState(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer py-1 pr-1"
              title="Switch UI state to preview warning banners"
            >
              <option value="normal" className="dark:bg-slate-900">Active (33 Days Left)</option>
              <option value="expiring_soon" className="dark:bg-slate-900">Expiring Soon (4 Days Warning)</option>
              <option value="expired" className="dark:bg-slate-900">Expired (0 Days Critical)</option>
            </select>
          </div>

          <Button
            onClick={() => handleOpenRechargeModal(AVAILABLE_PLANS[2])}
            variant="primary"
            size="md"
            className="shadow-sm"
          >
            <Zap className="w-4 h-4 mr-1.5" />
            Quick Recharge / Renew
          </Button>
        </div>
      </div>

      {/* Prominent Expiry Warning Banner (Conditioned on Days Remaining) */}
      {simulatedExpiryState === 'expiring_soon' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                  Urgent: Subscription Expiring in {daysRemaining} Days
                </h3>
                <Badge variant="warning" size="sm">Action Required</Badge>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                Your license for <strong>{org.plan} Multi-Tenant</strong> expires on <strong>{expiryDate}</strong>.
                Renew now to maintain uninterrupted access to multi-depot stock allocation, inward GRN validation, and sales order processing.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            <Button
              onClick={() => setGracePeriodModalOpen(true)}
              variant="secondary"
              size="sm"
              className="text-xs flex-1 sm:flex-none border-amber-300 text-amber-900 dark:text-amber-200"
            >
              Request 7-Day Extension
            </Button>
            <Button
              onClick={() => handleOpenRechargeModal(AVAILABLE_PLANS[2])}
              variant="primary"
              size="sm"
              className="text-xs flex-1 sm:flex-none bg-amber-600 hover:bg-amber-700 text-white border-transparent"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Recharge Now
            </Button>
          </div>
        </div>
      )}

      {/* Critical Expired Alert Banner */}
      {simulatedExpiryState === 'expired' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-800/80 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wide">
                  Critical Alert: License Expired on {expiryDate}
                </h3>
                <Badge variant="danger" size="sm">Read-Only Mode Active</Badge>
              </div>
              <p className="text-xs text-rose-800 dark:text-rose-300 mt-1 leading-relaxed">
                Your ERP subscription is past due. Field Sales order generation and Store Keeper inward GRN creation have been locked in compliance with corporate safety rules. Recharge your license immediately to re-enable operational access.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            <Button
              onClick={() => handleOpenRechargeModal(AVAILABLE_PLANS[2])}
              variant="primary"
              size="sm"
              className="text-xs flex-1 sm:flex-none bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Zap className="w-3.5 h-3.5 mr-1" />
              Reactivate License
            </Button>
          </div>
        </div>
      )}

      {/* SECTION 1 & 2: CURRENT PLAN & EXPIRY DETAILS HERO CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main Plan Card (8 Cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col justify-between border border-indigo-800/50">
          {/* Subtle Background Glows */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

          <div>
            {/* Top Row: Plan Badge & Status */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Current Active License
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {simulatedExpiryState === 'expired' ? 'Grace / Expired' : 'Active & Verified'}
                </span>
              </div>

              {/* Auto Renew Switch */}
              <button
                type="button"
                onClick={() => {
                  setAutoRenew(!autoRenew);
                  showToast(!autoRenew ? 'Auto-Renewal Enabled for next billing cycle' : 'Auto-Renewal Disabled');
                }}
                className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-slate-300 border border-white/10 transition-colors cursor-pointer"
              >
                <span>Auto-Renew:</span>
                <span className={`font-bold ${autoRenew ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {autoRenew ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {/* Plan Title & Pricing */}
            <div className="mt-5 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {org.plan === 'Enterprise' ? 'Enterprise Multi-Tenant' : org.plan === 'Professional' ? 'Professional Multi-Depot' : 'Standard Growth'}
                </h2>
                <p className="text-xs sm:text-sm text-indigo-200/80 mt-1 max-w-xl">
                  {limits.description}
                </p>
              </div>

              <div className="text-right sm:text-right mt-2 sm:mt-0">
                <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  {limits.price}
                </div>
                <div className="text-[11px] text-indigo-300 uppercase tracking-wider font-semibold">
                  Billed Annually • 18% GST Applicable
                </div>
              </div>
            </div>

            {/* Expiry Details & Progress Bar */}
            <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Start Date
                </div>
                <div className="text-sm font-bold text-white mt-1">{startDate}</div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Renewal / Expiry Date
                </div>
                <div className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
                  <span>{expiryDate}</span>
                  {daysRemaining <= 7 && (
                    <Badge variant={daysRemaining === 0 ? 'danger' : 'warning'} size="sm">
                      {daysRemaining === 0 ? 'Expired' : `${daysRemaining}d left`}
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Validity Window
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {daysRemaining > 0 ? (
                    <span className="text-emerald-400 font-bold">{daysRemaining} Days Remaining</span>
                  ) : (
                    <span className="text-rose-400 font-bold">0 Days (Overdue)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Visual Cycle Progress Meter */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-indigo-200/80">
                <span>Annual License Cycle Utilization</span>
                <span>{daysRemaining > 0 ? `${Math.round(((365 - daysRemaining) / 365) * 100)}% Elapsed` : '100% Expired'}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    daysRemaining <= 7 ? 'bg-amber-400' : daysRemaining === 0 ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, ((365 - daysRemaining) / 365) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-7 pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Cryptographically signed license key:</span>
              <button
                type="button"
                onClick={handleCopyKey}
                className="font-mono text-indigo-200 hover:text-white flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-lg text-[11px]"
                title="Copy Key"
              >
                {licenseKey}
                {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleOpenRechargeModal(AVAILABLE_PLANS[2])}
                variant="primary"
                size="md"
                className="bg-white text-slate-950 hover:bg-slate-100 font-bold border-transparent shadow-lg text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                Renew Plan
              </Button>
            </div>
          </div>
        </div>

        {/* Enterprise Billing & Legal Entity Info Card (4 Cols) */}
        <div className="lg:col-span-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Billed Entity Details
                  </h3>
                  <span className="text-[11px] text-slate-400">Registered Tax Profile</span>
                </div>
              </div>
              <Badge variant="neutral" size="sm">Verified</Badge>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Corporate Entity Name:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{org.legalName || org.name}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">GST Identification No. (GSTIN):</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md inline-block mt-0.5">
                  {org.taxGstNumber || '07AAACA1234F1Z5'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Billing Admin / Contact:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {org.adminName || 'Rajesh Verma'} ({org.adminEmail || 'rajesh.verma@apexflow-erp.com'})
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Place of Supply / State:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">07 - Delhi NCR (IGST/CGST Applicable)</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => navigate('/admin/customers')}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-left"
              >
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  Customers ({customerCount})
                </span>
                <ChevronRight className="w-3 h-3 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/orders')}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-left"
              >
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  Orders Hub ({orderCount})
                </span>
                <ChevronRight className="w-3 h-3 text-slate-400" />
              </button>
            </div>
            <div className="text-[11px] text-slate-400 text-center">
              Master IDs, customer accounts &amp; orders are managed in their respective dedicated directories.
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: RESOURCE CONSUMPTION & QUOTA METERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* User Seats Quota */}
        <div className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              Active Team Members
            </span>
            <Badge variant="purple" size="sm">
              {limits.maxEmployees > 50 ? 'Unlimited' : `${currentUsersCount}/${limits.maxEmployees}`}
            </Badge>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {currentUsersCount} <span className="text-xs font-normal text-slate-400">Personnel Registered</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${limits.maxEmployees > 50 ? 25 : Math.min(100, (currentUsersCount / limits.maxEmployees) * 100)}%` }}
            />
          </div>
        </div>

        {/* Operational Depots Quota */}
        <div className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Warehouse className="w-3.5 h-3.5 text-emerald-500" />
              Active Depots &amp; Hubs
            </span>
            <Badge variant="success" size="sm">
              {limits.maxWarehouses > 50 ? 'Unlimited' : `${currentDepotsCount}/${limits.maxWarehouses}`}
            </Badge>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {currentDepotsCount} <span className="text-xs font-normal text-slate-400">Warehouses Active</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${limits.maxWarehouses > 50 ? 30 : Math.min(100, (currentDepotsCount / limits.maxWarehouses) * 100)}%` }}
            />
          </div>
        </div>

        {/* Regional Territories Quota */}
        <div className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              Regional Territories
            </span>
            <Badge variant="warning" size="sm">
              {limits.maxRegions > 50 ? 'Unlimited' : `${currentRegionsCount}/${limits.maxRegions}`}
            </Badge>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {currentRegionsCount} <span className="text-xs font-normal text-slate-400">Territories Configured</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500"
              style={{ width: `${limits.maxRegions > 50 ? 40 : Math.min(100, (currentRegionsCount / limits.maxRegions) * 100)}%` }}
            />
          </div>
        </div>

        {/* Master Product Catalog SKUs */}
        <div className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-500" />
              Master Product SKUs
            </span>
            <Badge variant="purple" size="sm">24% Utilized</Badge>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {currentProductsCount || 34} <span className="text-xs font-normal text-slate-400">/ 10,000 Catalog SKUs</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-purple-500" style={{ width: '24%' }} />
          </div>
        </div>
      </div>

      {/* SECTION 4 & 5: AVAILABLE PLANS & RECHARGE GRID */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Available Plans &amp; Recharge Tiers
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select your preferred operational tier or renew the current package with instant license provisioning.
            </p>
          </div>

          {/* Billing Duration Switcher Pills */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setSelectedCycle('monthly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedCycle === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setSelectedCycle('quarterly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                selectedCycle === 'quarterly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Quarterly <span className="text-[10px] text-emerald-600 font-semibold">-5%</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCycle('half_yearly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                selectedCycle === 'half_yearly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Half-Yearly <span className="text-[10px] text-emerald-600 font-semibold">-10%</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCycle('yearly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                selectedCycle === 'yearly'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'
              }`}
            >
              Yearly
              <span className="px-1.5 py-0.2 rounded-md bg-white text-indigo-700 text-[10px] font-bold uppercase">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* 3 Tiered Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {AVAILABLE_PLANS.map((plan) => {
            const isCurrent = org.plan === plan.tier;
            const pricing = calculatePlanCost(plan.monthlyBasePrice, selectedCycle);
            const cycleInfo = getCycleDetails(selectedCycle);

            return (
              <div
                key={plan.tier}
                className={`rounded-3xl p-6 transition-all relative flex flex-col justify-between ${
                  plan.isRecommended
                    ? 'bg-gradient-to-b from-indigo-50/60 via-white to-white dark:from-slate-800 dark:to-slate-900 border-2 border-indigo-500 shadow-xl'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Badges */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-indigo-600 text-white shadow-md">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {plan.name}
                    </h3>
                    {isCurrent && (
                      <Badge variant="purple" size="sm">Current Plan</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[36px]">
                    {plan.tagline}
                  </p>

                  {/* Price Block */}
                  <div className="mt-5 pb-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                        ₹{pricing.monthlyEffective.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/ month</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                      <span>Billed ₹{pricing.taxableBase.toLocaleString('en-IN')} per {cycleInfo.label}</span>
                      {cycleInfo.discountPct > 0 && (
                        <span className="text-emerald-600 font-bold">({cycleInfo.saveTag})</span>
                      )}
                    </div>
                  </div>

                  {/* Quota Highlights */}
                  <div className="py-4 border-b border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                      <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>{plan.maxEmployees}</span>
                    </div>
                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                      <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{plan.maxRegions}</span>
                    </div>
                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                      <Warehouse className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{plan.maxWarehouses}</span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="pt-4 space-y-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Included Capabilities
                    </span>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Action CTA */}
                <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    onClick={() => handleOpenRechargeModal(plan)}
                    variant={plan.isRecommended ? 'primary' : 'secondary'}
                    size="md"
                    className="w-full text-xs font-bold"
                  >
                    {isCurrent ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Renew Current Plan
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 mr-1.5" />
                        Select {plan.name}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 6: NAVIGATION TO DEDICATED BILLING LEDGER & MASTER TRACEABILITY PAGE */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-50 via-purple-50 to-slate-50 dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 border-2 border-indigo-200/80 dark:border-indigo-800/80 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
              <Layers className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Dedicated Billing Registry Module
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Billing Ledger &amp; Master Traceability Matrix
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Customer IDs, Supplier IDs, Sales/Purchase Order IDs, and Product Batches allocated under this tenant quota have been organized into a dedicated Master Traceability and Billing page.
          </p>

          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
              <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{customerCount}</strong> Customers
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{supplierCount}</strong> Suppliers
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
              <strong className="text-amber-600 dark:text-amber-400 font-mono">{orderCount}</strong> Orders &amp; POs
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
              <strong className="text-purple-600 dark:text-purple-400 font-mono">{batchCount}</strong> Batches Tracked
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => navigate('/admin/customers')}
            variant="secondary"
            size="md"
            className="font-bold text-xs"
          >
            <Users className="w-4 h-4 mr-1.5" />
            Customers Directory →
          </Button>
          <Button
            onClick={() => navigate('/admin/orders')}
            variant="primary"
            size="md"
            className="font-bold text-xs"
          >
            <Layers className="w-4 h-4 mr-1.5" />
            Orders &amp; Dispatches →
          </Button>
        </div>
      </div>


      {/* MODAL 1: INTERACTIVE RECHARGE & CHECKOUT CONFIRMATION DIALOG */}
      {rechargeModalOpen && (
        <Modal
          isOpen={rechargeModalOpen}
          onClose={() => {
            if (!isProcessingPayment) setRechargeModalOpen(false);
          }}
          title={paymentSuccessData ? 'License Activated Successfully' : 'Subscription Checkout & Recharge'}
          maxWidth="2xl"
        >
          {paymentSuccessData ? (
            /* SUCCESS STATE */
            <div className="text-center py-6 px-2 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <Check className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Payment Confirmed &amp; License Provisioned!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Your subscription to <strong>{paymentSuccessData.planName}</strong> has been successfully renewed and applied to team <strong>{org.teamId}</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Number:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{paymentSuccessData.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction UTR:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{paymentSuccessData.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Paid:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    ₹{paymentSuccessData.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">New Validity Period:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{paymentSuccessData.validityRange}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-3">
                <Button
                  onClick={() => {
                    setRechargeModalOpen(false);
                    const el = document.getElementById('master-entities-registry');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  variant="secondary"
                  size="md"
                >
                  <Layers className="w-4 h-4 mr-1.5" />
                  View Master Entities
                </Button>
                <Button
                  onClick={() => setRechargeModalOpen(false)}
                  variant="primary"
                  size="md"
                >
                  Return to Dashboard
                </Button>
              </div>
            </div>
          ) : (
            /* CHECKOUT / CONFIRMATION STATE */
            <div className="space-y-6">
              {/* Step 1: Selected Plan & Cycle Overview */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-800/80 border border-indigo-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                      Selected Plan
                    </span>
                    <Badge variant="purple" size="sm">{targetPlan.tier}</Badge>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {targetPlan.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {targetPlan.maxEmployees} • {targetPlan.maxRegions} • {targetPlan.maxWarehouses}
                  </p>
                </div>

                {/* Change Cycle inside modal */}
                <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 px-1.5">Cycle:</span>
                  {(['monthly', 'quarterly', 'half_yearly', 'yearly'] as BillingCycle[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTargetCycle(c)}
                      className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                        targetCycle === c
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {c.replace('_', '-')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Payment Method Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
                  Select Corporate Payment Gateway
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethod === 'upi'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-indigo-600 mb-2" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">UPI / QR Code</div>
                      <div className="text-[10px] text-slate-400">GPay, PhonePe, Paytm</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('netbanking')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethod === 'netbanking'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-indigo-600 mb-2" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Net Banking</div>
                      <div className="text-[10px] text-slate-400">HDFC, ICICI, SBI, Axis</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethod === 'card'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-indigo-600 mb-2" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Corporate Card</div>
                      <div className="text-[10px] text-slate-400">Visa, MasterCard, Amex</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wire')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethod === 'wire'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <FileText className="w-5 h-5 text-indigo-600 mb-2" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">NEFT / RTGS</div>
                      <div className="text-[10px] text-slate-400">Virtual Bank Account</div>
                    </div>
                  </button>
                </div>

                {/* Sub-form based on selected payment method */}
                {paymentMethod === 'upi' && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="w-20 h-20 bg-white p-1 rounded-xl border border-slate-200 shadow-sm shrink-0 flex items-center justify-center">
                      <QrCode className="w-16 h-16 text-slate-900" />
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        Scan with any UPI App or enter VPA
                      </div>
                      <div className="text-slate-500">
                        Virtual Payment Address: <span className="font-mono font-bold text-indigo-600">tzmicha.erp@icici</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Zero transaction surcharge • Instant automatic authorization
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'netbanking' && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Select Bank:</label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold"
                    >
                      <option>HDFC Bank Corporate</option>
                      <option>ICICI Corporate Banking</option>
                      <option>State Bank of India (INB)</option>
                      <option>Axis Bank Commercial</option>
                      <option>Kotak Mahindra Bank</option>
                    </select>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="col-span-2">
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">Card Number</label>
                        <input
                          type="text"
                          value={cardDetails.number}
                          onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">Name on Card</label>
                        <input
                          type="text"
                          value={cardDetails.name}
                          onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500 block mb-1">Expiry</label>
                          <input
                            type="text"
                            value={cardDetails.expiry}
                            onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500 block mb-1">CVV</label>
                          <input
                            type="password"
                            value={cardDetails.cvv}
                            maxLength={4}
                            onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-center"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'wire' && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Virtual Beneficiary:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Tzmicha Technologies Pvt Ltd</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Virtual Account No:</span>
                      <span className="font-mono font-bold text-indigo-600">TZM9920194012</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">IFSC Code:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">ICIC0000104</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Coupon Code Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
                  Promotional or Enterprise Voucher Code
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Try GROWTH20 or ANNUAL20..."
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 uppercase font-mono font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                  <Button
                    onClick={handleApplyCoupon}
                    variant="secondary"
                    size="sm"
                    className="h-9 px-3 text-xs"
                  >
                    Apply Code
                  </Button>
                </div>
                {couponMessage && (
                  <div className={`text-[11px] font-semibold mt-1 flex items-center gap-1.5 ${
                    couponMessage.success ? 'text-emerald-600' : 'text-rose-500'
                  }`}>
                    {couponMessage.success ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>{couponMessage.text}</span>
                  </div>
                )}
              </div>

              {/* Step 4: Cost Breakdown */}
              {(() => {
                const costs = calculatePlanCost(targetPlan.monthlyBasePrice, targetCycle, appliedDiscount);
                const { months } = getCycleDetails(targetCycle);

                return (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Base Plan Price ({months} months @ ₹{targetPlan.monthlyBasePrice.toLocaleString('en-IN')}/mo):</span>
                      <span className="font-mono">₹{costs.gross.toLocaleString('en-IN')}</span>
                    </div>

                    {costs.cycleDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Billing Cycle Savings ({getCycleDetails(targetCycle).saveTag}):</span>
                        <span className="font-mono font-semibold">-₹{costs.cycleDiscount.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {costs.extraPromoDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Voucher Discount ({couponCode.toUpperCase()} - {appliedDiscount}%):</span>
                        <span className="font-mono font-semibold">-₹{costs.extraPromoDiscount.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>GST @ 18% (CGST 9% + SGST 9%):</span>
                      <span className="font-mono">₹{costs.gst18.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline text-slate-900 dark:text-slate-100 font-bold">
                      <span className="text-sm">Net Total Payable:</span>
                      <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                        ₹{costs.netTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  onClick={() => setRechargeModalOpen(false)}
                  variant="secondary"
                  size="md"
                  disabled={isProcessingPayment}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExecutePayment}
                  variant="primary"
                  size="md"
                  disabled={isProcessingPayment}
                  className="min-w-[180px]"
                >
                  {isProcessingPayment ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Authorizing Gateway...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Confirm &amp; Recharge License
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* MODAL 3: EMERGENCY GRACE PERIOD REQUEST */}
      {gracePeriodModalOpen && (
        <Modal
          isOpen={gracePeriodModalOpen}
          onClose={() => setGracePeriodModalOpen(false)}
          title="Request 7-Day Corporate Operating Extension"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 leading-relaxed">
              <strong>Enterprise Procurement Grace Policy:</strong> We understand that corporate Purchase Order sign-offs and treasury releases can occasionally take a few days. You may activate a one-time 7-day operational extension without service interruption.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reason for Delay / Purchase Order Reference:
              </label>
              <textarea
                rows={3}
                defaultValue="Corporate PO #TZM-PO-2026-992 is under executive signature with finance department."
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                onClick={() => setGracePeriodModalOpen(false)}
                variant="secondary"
                size="md"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestGracePeriod}
                variant="primary"
                size="md"
                className="bg-amber-600 hover:bg-amber-700 text-white border-transparent"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Grant 7-Day Extension
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
