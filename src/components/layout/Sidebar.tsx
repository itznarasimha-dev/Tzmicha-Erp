import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import {
  LayoutDashboard,
  Boxes,
  Users,
  ShieldCheck,
  TrendingUp,
  Truck,
  CheckSquare,
  DollarSign,
  Compass,
  History,
  ShoppingBag,
  Warehouse,
  Tag,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
  Sparkles,
  Briefcase,
  MapPin,
  Percent,
  Receipt,
  Target,
  Activity,
  FileText,
  Landmark,
  PackageCheck,
  ArrowRightLeft,
  CreditCard,
  Award,
  Zap,
  Building2,
  Factory,
  Package,
  CalendarCheck,
  MessageSquare,
  FileSpreadsheet,
  RotateCcw,
  UserPlus,
  Calendar,
  UserMinus,
  CalendarDays,
  FileSignature,
  Coins,
  MessageSquareText,
} from 'lucide-react';
import clsx from 'clsx';
import { Badge } from '../ui/Badge';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const {
    currentUser,
    currentRole,
    salesOrders,
    expenseClaims,
    stockAdjustments,
    quotations,
    salesRemittances,
    inwardReceipts,
    customers,
    suppliers,
    leaveRequests,
    roleQueries,
    invoices,
    financeClaims,
    budgetRequests,
  } = useErpStore();

  const location = useLocation();

  let activeRole = currentRole || currentUser.role;
  if (currentUser.role === 'admin') {
    if (location.pathname.startsWith('/manager')) {
      activeRole = 'manager';
    } else if (location.pathname.startsWith('/sales')) {
      activeRole = 'sales';
    } else if (location.pathname.startsWith('/store-manager') || location.pathname.startsWith('/store')) {
      activeRole = 'store_manager';
    } else if (location.pathname.startsWith('/marketing')) {
      activeRole = 'marketing';
    } else if (location.pathname.startsWith('/finance')) {
      activeRole = 'finance';
    } else if (location.pathname.startsWith('/service')) {
      activeRole = 'service';
    } else if (location.pathname.startsWith('/hr')) {
      activeRole = 'hr';
    }
  } else if (currentUser.role === 'manager') {
    activeRole = 'manager';
  }

  const pendingDiscountApprovals = salesOrders.filter((o) => o.status === 'pending_discount_approval').length;
  const pendingExpenses = expenseClaims.filter((e) => e.status === 'submitted').length;
  const pendingAdjustments = stockAdjustments.filter((a) => a.status === 'pending_approval').length;
  const totalPendingApprovals = pendingDiscountApprovals + pendingExpenses + pendingAdjustments;
  const unassignedQuotes = (quotations || []).filter((q) => !q.assignedSalesUserId || q.status === 'Unassigned').length;
  const pendingRemittances = (salesRemittances || []).filter((r) => r.status === 'pending_verification').length;
  const pendingInwards = (inwardReceipts || []).filter((r) => r.status === 'received').length;
  const overLimitCredit = (customers || []).filter((c) => c.creditLimit > 0 && c.currentOutstanding >= c.creditLimit).length;
  const pendingLeaves = (leaveRequests || []).filter((l) => l.status === 'pending').length;
  const openQueriesCount = (roleQueries || []).filter((q) => q.status === 'open').length;
  const unpaidInvoicesCount = (invoices || []).filter((i) => i.outstandingBalance > 0).length;

  type NavEntry =
    | { group: string }
    | {
        name: string;
        path: string;
        icon: React.ReactNode;
        badge?: string | number;
        badgeVariant?: 'primary' | 'warning' | 'purple' | 'neutral' | 'success' | 'danger';
        isComingSoon?: boolean;
      };

  // 1. Sales Role Nav Items (Strict Sub-Role Scoped Navigation)
  const salesSubRole = currentUser?.salesSubRole || 'sales_rep';
  const isManagerOrCoord = salesSubRole === 'sales_manager' || salesSubRole === 'sales_coordinator';
  const canAccessLeads = salesSubRole !== 'junior_sales';
  const canAccessReturns = isManagerOrCoord;
  const scheduleTitle = isManagerOrCoord ? 'Team Schedule' : 'My Schedule';

  const salesNavItems: NavEntry[] = [
    { group: 'Sales Overview' },
    {
      name: isManagerOrCoord ? 'Executive Sales Desk' : 'My Sales Dashboard',
      path: '/sales/dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    { group: 'Catalog & Accounts' },
    {
      name: 'Products & Stock Availability',
      path: '/sales/products',
      icon: <Boxes className="w-4 h-4" />,
    },
    {
      name: 'Sales Customers',
      path: '/sales/customers',
      icon: <Users className="w-4 h-4" />,
    },
    ...(canAccessLeads
      ? [
          {
            name: 'Marketing Inbound Leads',
            path: '/sales/marketing-leads',
            icon: <UserPlus className="w-4 h-4" />,
            badge: 3,
            badgeVariant: 'primary' as const,
          },
        ]
      : []),
    { group: 'Commercial Deals' },
    {
      name: 'Quotations & RFQs',
      path: '/sales/quotations',
      icon: <FileText className="w-4 h-4" />,
      badge: unassignedQuotes > 0 ? unassignedQuotes : undefined,
    },
    {
      name: 'Sales Orders',
      path: '/sales/orders',
      icon: <ShoppingBag className="w-4 h-4" />,
      badge: 9,
    },
    {
      name: 'Sales Pipeline Stages',
      path: '/sales/pipeline',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    { group: 'Fulfillment & Invoices' },
    {
      name: 'Dispatch & Delivery Tracking',
      path: '/sales/dispatch',
      icon: <Truck className="w-4 h-4" />,
      badge: 4,
    },
    {
      name: 'Invoices & Payments',
      path: '/sales/invoices',
      icon: <CreditCard className="w-4 h-4" />,
    },
    ...(canAccessReturns
      ? [
          {
            name: 'Returns & Cancellations',
            path: '/sales/returns',
            icon: <ArrowRightLeft className="w-4 h-4" />,
            badge: 2,
            badgeVariant: 'warning' as const,
          },
        ]
      : []),
    { group: 'Field Activities & HR' },
    {
      name: scheduleTitle,
      path: '/sales/schedule',
      icon: <Calendar className="w-4 h-4" />,
      badge: 3,
    },
    {
      name: 'Attendance & Leaves',
      path: '/sales/attendance',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      name: 'Daily Work Updates',
      path: '/sales/work-updates',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      name: 'Sales Performance & Reports',
      path: '/sales/targets',
      icon: <Target className="w-4 h-4" />,
    },
    {
      name: 'Expenses & Claims',
      path: '/sales/expenses',
      icon: <Receipt className="w-4 h-4" />,
      badge: pendingExpenses > 0 ? pendingExpenses : undefined,
    },
    { group: 'Support & Queries' },
    {
      name: 'Internal Chat & Queries',
      path: '/sales/queries',
      icon: <MessageSquare className="w-4 h-4" />,
      badge: (roleQueries || []).filter((q) => (q.requesterRole === 'sales' || q.requesterId === currentUser?.id) && q.status === 'open').length || undefined,
      badgeVariant: 'warning',
    },
  ];

  // 2. Store Keeper Role Nav Items (8 Workspaces)
  const storeKeeperNavItems: NavEntry[] = [
    { group: 'Store Overview' },
    {
      name: 'Store Manager Overview',
      path: '/store-manager/overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      name: 'Tasks & Dispatch Reports',
      path: '/store-manager/tasks',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: 7,
    },
    { group: 'Inward & Stock Traceability' },
    {
      name: 'Receiving Centre & GRN',
      path: '/store-manager/receiving',
      icon: <PackageCheck className="w-4 h-4" />,
      badge: pendingInwards > 0 ? `${pendingInwards} QC` : 7,
      badgeVariant: 'warning',
    },
    {
      name: 'Inventory & Traceability',
      path: '/store-manager/inventory',
      icon: <Boxes className="w-4 h-4" />,
      badge: 5,
    },
    { group: 'Production & Quality' },
    {
      name: 'Production Materials',
      path: '/store-manager/production-materials',
      icon: <Factory className="w-4 h-4" />,
      badge: 4,
    },
    {
      name: 'Finished Goods & Quality Release',
      path: '/store-manager/finished-goods',
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: 3,
    },
    { group: 'Transfers & Fulfilment' },
    {
      name: 'Transfers & Stock Count',
      path: '/store-manager/transfers',
      icon: <ArrowRightLeft className="w-4 h-4" />,
      badge: 3,
    },
    {
      name: 'Sales Fulfilment & Returns',
      path: '/store-manager/sales-fulfilment',
      icon: <Truck className="w-4 h-4" />,
      badge: 9,
    },
    { group: 'Expenses & Local Claims' },
    {
      name: 'Expenses & Delivery Claims',
      path: '/store-manager/expenses',
      icon: <Receipt className="w-4 h-4" />,
    },
    { group: 'Support & Queries' },
    {
      name: 'Store Queries & Chat',
      path: '/store-manager/queries',
      icon: <MessageSquare className="w-4 h-4" />,
      badge: (roleQueries || []).filter((q) => (q.requesterRole === 'store_manager' || q.requesterId === currentUser?.id) && q.status === 'open').length || undefined,
      badgeVariant: 'warning',
    },
  ];

  // 3. Marketing Role Nav Items (Multi-Tier Hierarchical & Field Workspaces)
  const marketingNavItems: NavEntry[] = [
    { group: 'Marketing Command' },
    {
      name: 'Role Workspace',
      path: '/marketing/workspace',
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: '3 Tiers',
      badgeVariant: 'success',
    },
    {
      name: 'Overview Dashboard',
      path: '/marketing/dashboard',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    { group: 'Planning & Assignment' },
    {
      name: 'Marketing Planning',
      path: '/marketing/workspace/planning',
      icon: <Compass className="w-4 h-4" />,
    },
    {
      name: 'Work Assignment',
      path: '/marketing/workspace/assignment',
      icon: <CheckSquare className="w-4 h-4" />,
    },
    { group: 'Pipeline & Campaigns' },
    {
      name: 'Lead Pipeline',
      path: '/marketing/workspace/pipeline',
      icon: <Target className="w-4 h-4" />,
    },
    {
      name: 'Campaign Activities',
      path: '/marketing/workspace/campaigns',
      icon: <Sparkles className="w-4 h-4" />,
    },
    { group: 'Team & Operations' },
    {
      name: 'Team Performance',
      path: '/marketing/workspace/performance',
      icon: <Users className="w-4 h-4" />,
    },
    {
      name: 'Expense Approvals',
      path: '/marketing/workspace/expenses',
      icon: <Receipt className="w-4 h-4" />,
    },
    { group: 'Field Activities' },
    {
      name: 'Dealer Visit Planner',
      path: '/marketing/visits',
      icon: <MapPin className="w-4 h-4" />,
    },
    {
      name: 'Market Price Surveys',
      path: '/marketing/surveys',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      name: 'Dealer Directory',
      path: '/marketing/dealers',
      icon: <Building2 className="w-4 h-4" />,
    },
    { group: 'Support & Queries' },
    {
      name: 'Helpdesk & Queries Chat',
      path: '/marketing/queries',
      icon: <MessageSquare className="w-4 h-4" />,
      badge: (roleQueries || []).filter((q) => (q.requesterRole === 'marketing' || q.requesterId === currentUser?.id) && q.status === 'open').length || undefined,
      badgeVariant: 'warning',
    },
  ];

  // 4. Admin Role Nav Items
  const adminNavItems: NavEntry[] = [
    { group: 'Overview' },
    {
      name: 'Executive Dashboard',
      path: '/admin/dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    { group: 'Store & Inventory Operations' },
    {
      name: 'Regional Stock & Batches',
      path: '/admin/stock',
      icon: <Warehouse className="w-4 h-4" />,
    },
    {
      name: 'Inward Consignments & GRN',
      path: '/admin/inward-receipts',
      icon: <PackageCheck className="w-4 h-4" />,
      badge: pendingInwards > 0 ? `${pendingInwards} QC` : undefined,
      badgeVariant: 'warning',
    },
    {
      name: 'Inter-Depot Transfers & Audits',
      path: '/admin/transfers-audits',
      icon: <ArrowRightLeft className="w-4 h-4" />,
      badge: pendingAdjustments > 0 ? `${pendingAdjustments} Audits` : undefined,
      badgeVariant: 'purple',
    },
    { group: 'Sales & Customer Governance' },
    {
      name: 'Customers & Dealers',
      path: '/admin/customers',
      icon: <Users className="w-4 h-4" />,
      badge: customers.length,
      badgeVariant: 'neutral',
    },
    {
      name: 'Orders & Dispatches (SO & PO)',
      path: '/admin/orders',
      icon: <Truck className="w-4 h-4" />,
    },
    {
      name: 'Quotations & RFQs',
      path: '/admin/quotations',
      icon: <FileText className="w-4 h-4" />,
      badge: unassignedQuotes > 0 ? `${unassignedQuotes} Assign` : undefined,
      badgeVariant: 'warning',
    },
    {
      name: 'Sales Collections & Remittances',
      path: '/admin/sales-ledger',
      icon: <Landmark className="w-4 h-4" />,
      badge: pendingRemittances > 0 ? `${pendingRemittances} Proofs` : undefined,
      badgeVariant: 'purple',
    },
    {
      name: 'Customer Credit & A/R Ledger',
      path: '/admin/customer-credit',
      icon: <CreditCard className="w-4 h-4" />,
      badge: overLimitCredit > 0 ? `${overLimitCredit} Over` : undefined,
      badgeVariant: 'danger',
    },
    {
      name: 'Invoices & Billing Register',
      path: '/admin/invoices',
      icon: <Receipt className="w-4 h-4" />,
      badge: unpaidInvoicesCount > 0 ? `${unpaidInvoicesCount} Due` : undefined,
      badgeVariant: 'warning',
    },
    {
      name: 'Team Performance & Commissions',
      path: '/admin/sales-performance',
      icon: <Award className="w-4 h-4" />,
      badge: 'Payouts',
      badgeVariant: 'success',
    },
    {
      name: 'Discounts',
      path: '/admin/discounts',
      icon: <Percent className="w-4 h-4" />,
    },
    {
      name: 'Approvals & Requests',
      path: '/admin/approvals',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: totalPendingApprovals > 0 ? totalPendingApprovals : undefined,
      badgeVariant: 'warning',
    },
    {
      name: 'Expenses & Claims Management',
      path: '/admin/expenses',
      icon: <Receipt className="w-4 h-4" />,
      badge: pendingExpenses > 0 ? pendingExpenses : undefined,
      badgeVariant: 'warning',
    },
    {
      name: 'Field Marketing Intelligence',
      path: '/admin/field-marketing',
      icon: <Compass className="w-4 h-4" />,
    },
    { group: 'Governance & Masters' },
    {
      name: 'Product Master & Catalog',
      path: '/admin/products',
      icon: <Boxes className="w-4 h-4" />,
    },
    {
      name: 'Suppliers & Vendors',
      path: '/admin/suppliers',
      icon: <Building2 className="w-4 h-4" />,
      badge: suppliers.length,
      badgeVariant: 'neutral',
    },
    {
      name: 'Territories & Depots',
      path: '/admin/regions',
      icon: <MapPin className="w-4 h-4" />,
    },
    {
      name: 'Users & Permissions',
      path: '/admin/users',
      icon: <Users className="w-4 h-4" />,
    },
    {
      name: 'Attendance & Leaves',
      path: '/admin/attendance',
      icon: <CalendarCheck className="w-4 h-4" />,
      badge: pendingLeaves > 0 ? `${pendingLeaves} Pending` : undefined,
      badgeVariant: 'warning',
    },
    {
      name: 'Organization Profile',
      path: '/admin/organizations',
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      name: 'Quota & Targets',
      path: '/admin/targets',
      icon: <Target className="w-4 h-4" />,
    },
    {
      name: 'All Roles Activity',
      path: '/admin/activity',
      icon: <Activity className="w-4 h-4" />,
      badge: 'Live',
      badgeVariant: 'success',
    },
    {
      name: 'Role Queries & Chat Desk',
      path: '/admin/queries',
      icon: <MessageSquare className="w-4 h-4" />,
      badge: openQueriesCount > 0 ? `${openQueriesCount} Open` : undefined,
      badgeVariant: 'warning',
    },
    {
      name: 'System Audit Logs',
      path: '/admin/audit-logs',
      icon: <History className="w-4 h-4" />,
    },
    { group: 'Settings & Administration' },
    {
      name: 'Subscription Plans',
      path: '/admin/subscription',
      icon: <CreditCard className="w-4 h-4" />,
      badge: 'Active',
      badgeVariant: 'purple',
    },
  ];

  // 5. Finance Role Nav Items (Central Financial Control Department)
  const pendingRefundsCount = (financeClaims || []).filter((c) => c.refundStatus === 'pending').length;
  const pendingRemittancesCount = (salesRemittances || []).filter((r) => r.status === 'pending_verification').length;
  const pendingBudgetRequestsCount = (budgetRequests || []).filter((b) => b.status === 'pending').length;

  const financeNavItems: NavEntry[] = [
    { group: 'Executive Treasury' },
    {
      name: 'Finance Dashboard',
      path: '/finance',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    { group: 'Revenue & Receivables' },
    {
      name: 'Customer Receivables & Payments',
      path: '/finance/receivables',
      icon: <DollarSign className="w-4 h-4" />,
      badge: pendingRemittancesCount > 0 ? pendingRemittancesCount : undefined,
      badgeVariant: 'warning',
    },
    {
      name: 'Invoices Register',
      path: '/finance/invoices',
      icon: <Receipt className="w-4 h-4" />,
    },
    {
      name: 'Sales Quotations',
      path: '/finance/quotations',
      icon: <FileText className="w-4 h-4" />,
    },
    { group: 'Procurement & Payables' },
    {
      name: 'Suppliers & Accounts Payable',
      path: '/finance/payables',
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      name: 'Refunds & Damage Claims',
      path: '/finance/refunds',
      icon: <RotateCcw className="w-4 h-4" />,
      badge: pendingRefundsCount > 0 ? pendingRefundsCount : undefined,
      badgeVariant: 'purple',
    },
    { group: 'Compensations & Budgets' },
    {
      name: 'Payroll & Attendance Review',
      path: '/finance/payroll',
      icon: <Users className="w-4 h-4" />,
    },
    {
      name: 'Incentives & Settlements',
      path: '/finance/incentives',
      icon: <Award className="w-4 h-4" />,
    },
    {
      name: 'Normal Expenses & Claims',
      path: '/finance/expenses',
      icon: <Receipt className="w-4 h-4" />,
      badge: pendingExpenses > 0 ? pendingExpenses : undefined,
      badgeVariant: 'warning',
    },
    {
      name: 'Store Delivery Costs',
      path: '/finance/delivery-costs',
      icon: <Truck className="w-4 h-4" />,
    },
    {
      name: 'Marketing Budget Requests',
      path: '/finance/budget-requests',
      icon: <Sparkles className="w-4 h-4" />,
      badge: pendingBudgetRequestsCount > 0 ? pendingBudgetRequestsCount : undefined,
      badgeVariant: 'primary',
    },
    { group: 'Financial Accounting' },
    {
      name: 'General Ledger & P&L',
      path: '/finance/general-ledger',
      icon: <Landmark className="w-4 h-4" />,
    },
    {
      name: 'Financial Reports',
      path: '/finance/reports',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      name: 'Financial Audit Trail',
      path: '/finance/audit-trail',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    { group: 'Support & Queries' },
    {
      name: 'Finance Queries & Chat',
      path: '/finance/queries',
      icon: <MessageSquare className="w-4 h-4" />,
      badge: (roleQueries || []).filter((q) => (q.requesterRole === 'finance' || q.requesterId === currentUser?.id) && q.status === 'open').length || undefined,
      badgeVariant: 'warning',
    },
  ];

  // 6. Service Role Nav Items (Dedicated Coming Soon Portal Experience)
  const serviceNavItems: NavEntry[] = [
    { group: 'Support Operations' },
    {
      name: 'Service Desk Overview',
      path: '/service',
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: 'Coming Soon',
      badgeVariant: 'purple',
    },
    { group: 'RMA & Quality (Roadmap)' },
    {
      name: 'RMA Customer Claims (v2.5)',
      path: '/service',
      icon: <ArrowRightLeft className="w-4 h-4" />,
      badge: 'v2.5',
      badgeVariant: 'neutral',
    },
    {
      name: 'Technical Inspection (v2.5)',
      path: '/service',
      icon: <PackageCheck className="w-4 h-4" />,
      badge: 'v2.5',
      badgeVariant: 'neutral',
    },
    {
      name: 'Field Engineer Dispatch (v2.6)',
      path: '/service',
      icon: <Truck className="w-4 h-4" />,
      badge: 'v2.6',
      badgeVariant: 'neutral',
    },
    { group: 'Role Portals Quick Access' },
    {
      name: 'Executive Dashboard',
      path: '/admin/dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      name: 'Field Sales Desk',
      path: '/sales',
      icon: <Briefcase className="w-4 h-4" />,
    },
    {
      name: 'Store Keeper Hub',
      path: '/store-manager/overview',
      icon: <Warehouse className="w-4 h-4" />,
    },
    { group: 'Support & Queries' },
    {
      name: 'Customer & Internal Queries',
      path: '/service/queries',
      icon: <MessageSquare className="w-4 h-4" />,
      badge: (roleQueries || []).filter((q) => (q.requesterRole === 'service' || q.requesterId === currentUser?.id) && q.status === 'open').length || undefined,
      badgeVariant: 'warning',
    },
  ];

  // 7. Manager Role Nav Items (Full Operational Access, Excluding Audit Logs & Subscriptions)
  const managerNavItems: NavEntry[] = [
    { group: 'Operations Overview' },
    {
      name: 'Manager Operations Desk',
      path: '/manager/dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: totalPendingApprovals > 0 ? totalPendingApprovals : undefined,
      badgeVariant: 'warning',
    },
    {
      name: 'Organization Profile',
      path: '/admin/organizations',
      icon: <Building2 className="w-4 h-4" />,
    },
    { group: 'Sales & Field Commerce' },
    {
      name: 'Customers & Dealers',
      path: '/admin/customers',
      icon: <Users className="w-4 h-4" />,
      badge: customers.length,
      badgeVariant: 'neutral',
    },
    {
      name: 'Orders & Dispatches (SO & PO)',
      path: '/admin/orders',
      icon: <Truck className="w-4 h-4" />,
      badge: pendingDiscountApprovals > 0 ? `${pendingDiscountApprovals} Review` : undefined,
      badgeVariant: 'warning',
    },
    {
      name: 'Quotations & Approvals',
      path: '/admin/quotations',
      icon: <FileText className="w-4 h-4" />,
      badge: unassignedQuotes > 0 ? `${unassignedQuotes} Assign` : undefined,
      badgeVariant: 'warning',
    },
    {
      name: 'Customer Credit & A/R',
      path: '/admin/customer-credit',
      icon: <CreditCard className="w-4 h-4" />,
      badge: overLimitCredit > 0 ? `${overLimitCredit} Over` : undefined,
      badgeVariant: 'danger',
    },
    {
      name: 'Invoices & Billing Register',
      path: '/admin/invoices',
      icon: <Receipt className="w-4 h-4" />,
      badge: unpaidInvoicesCount > 0 ? `${unpaidInvoicesCount} Due` : undefined,
      badgeVariant: 'warning',
    },
    {
      name: 'Sales Performance & Payouts',
      path: '/admin/sales-performance',
      icon: <Award className="w-4 h-4" />,
      badge: 'Payouts',
      badgeVariant: 'success',
    },
    {
      name: 'Approvals & Requests',
      path: '/admin/approvals',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: totalPendingApprovals > 0 ? totalPendingApprovals : undefined,
      badgeVariant: 'warning',
    },
    {
      name: 'Expenses & Field Claims',
      path: '/admin/expenses',
      icon: <Receipt className="w-4 h-4" />,
      badge: pendingExpenses > 0 ? pendingExpenses : undefined,
      badgeVariant: 'warning',
    },
    {
      name: 'Field Marketing Intelligence',
      path: '/admin/field-marketing',
      icon: <Compass className="w-4 h-4" />,
    },
    { group: 'Depot & Inventory Operations' },
    {
      name: 'Product Master & Costing',
      path: '/admin/products',
      icon: <Boxes className="w-4 h-4" />,
    },
    {
      name: 'Inward Receiving & GRN',
      path: '/store/inward',
      icon: <Truck className="w-4 h-4" />,
      badge: pendingInwards > 0 ? pendingInwards : undefined,
      badgeVariant: 'warning',
    },
    {
      name: 'Inventory & Batch Ledger',
      path: '/store/batches',
      icon: <Warehouse className="w-4 h-4" />,
    },
    {
      name: 'Damage & QC Discard',
      path: '/store/damage',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      name: 'Suppliers & Vendors',
      path: '/admin/suppliers',
      icon: <Building2 className="w-4 h-4" />,
      badge: suppliers.length,
      badgeVariant: 'neutral',
    },
    {
      name: 'Territories & Depots',
      path: '/admin/regions',
      icon: <MapPin className="w-4 h-4" />,
    },
    { group: 'Workforce & Activity' },
    {
      name: 'Employee Directory',
      path: '/admin/users',
      icon: <Users className="w-4 h-4" />,
    },
    {
      name: 'Attendance & Leaves',
      path: '/admin/attendance',
      icon: <CalendarCheck className="w-4 h-4" />,
      badge: pendingLeaves > 0 ? `${pendingLeaves} Pending` : undefined,
      badgeVariant: 'warning',
    },
    {
      name: 'Targets & Quotas',
      path: '/admin/targets',
      icon: <Target className="w-4 h-4" />,
    },
    {
      name: 'All Roles Activity',
      path: '/admin/activity',
      icon: <Activity className="w-4 h-4" />,
      badge: 'Live',
      badgeVariant: 'success',
    },
    {
      name: 'Role Queries & Chat Desk',
      path: '/manager/queries',
      icon: <MessageSquare className="w-4 h-4" />,
      badge: openQueriesCount > 0 ? `${openQueriesCount} Open` : undefined,
      badgeVariant: 'warning',
    },
  ];

  const hrNavItems: NavEntry[] = [
    { group: 'HR Workspace' },
    {
      name: 'HR Dashboard',
      path: '/hr',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      name: 'Employee Directory',
      path: '/hr/employees',
      icon: <Users className="w-4 h-4" />,
    },
    {
      name: 'Attendance Register',
      path: '/hr/attendance',
      icon: <CalendarCheck className="w-4 h-4" />,
    },
    {
      name: 'Leave Management',
      path: '/hr/leave',
      icon: <CalendarDays className="w-4 h-4" />,
      badge: pendingLeaves > 0 ? pendingLeaves : undefined,
      badgeVariant: 'warning',
    },
    { group: 'Talent & Hiring' },
    {
      name: 'Recruitment & Candidates',
      path: '/hr/recruitment',
      icon: <Briefcase className="w-4 h-4" />,
    },
    {
      name: 'Onboarding Checklists',
      path: '/hr/onboarding',
      icon: <UserPlus className="w-4 h-4" />,
    },
    {
      name: 'Performance Appraisals',
      path: '/hr/performance',
      icon: <Target className="w-4 h-4" />,
    },
    { group: 'Payroll & Statutory' },
    {
      name: 'Payroll Processing',
      path: '/hr/payroll',
      icon: <Receipt className="w-4 h-4" />,
    },
    {
      name: 'Contracts & Agreements',
      path: '/hr/contracts',
      icon: <FileSignature className="w-4 h-4" />,
    },
    {
      name: 'Daily Payments',
      path: '/hr/payments',
      icon: <Coins className="w-4 h-4" />,
    },
    { group: 'People Operations' },
    {
      name: 'Employee Requests',
      path: '/hr/requests',
      icon: <MessageSquareText className="w-4 h-4" />,
    },
    {
      name: 'Offboarding & Clearance',
      path: '/hr/offboarding',
      icon: <UserMinus className="w-4 h-4" />,
    },
    { group: 'Analytics & Policies' },
    {
      name: 'HR Reports & Analytics',
      path: '/hr/reports',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      name: 'HR Settings',
      path: '/hr/settings',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
  ];

  const currentNavItems =
    activeRole === 'manager'
      ? managerNavItems
      : activeRole === 'sales'
      ? salesNavItems
      : activeRole === 'store_manager'
      ? storeKeeperNavItems
      : activeRole === 'marketing'
      ? marketingNavItems
      : activeRole === 'finance'
      ? financeNavItems
      : activeRole === 'service'
      ? serviceNavItems
      : activeRole === 'hr'
      ? hrNavItems
      : adminNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={clsx(
          'glass-sidebar sticky top-0 h-screen inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-2xs',
          collapsed ? 'w-20' : 'w-64',
          mobileOpen ? 'translate-x-0 fixed' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="h-[72px] shrink-0 px-4 flex items-center">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
                <Boxes className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-[15px] tracking-tight text-slate-900 leading-tight block">
                    TZMICHA
                  </span>
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                    ERP
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 font-medium uppercase tracking-[0.08em] block">
                  {activeRole === 'sales'
                    ? 'Sales Portal'
                    : activeRole === 'store_manager'
                    ? 'Store Keeper'
                    : activeRole === 'marketing'
                    ? 'Field Marketing'
                    : activeRole === 'finance'
                    ? 'Finance Hub'
                    : activeRole === 'service'
                    ? 'Service Desk'
                    : activeRole === 'hr'
                    ? 'Human Resources'
                    : 'Enterprise Admin'}
                </span>
              </div>
            </div>
          )}

          {collapsed && (
            <div className="mx-auto w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20" title="Tzmicha ERP">
              <Boxes className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-2 space-y-0.5 scrollbar-thin">
          {currentUser.role === 'admin' && activeRole !== 'admin' && (
            <Link
              to="/admin/dashboard"
              className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 text-lime-400 hover:bg-slate-800 text-xs font-medium transition-all shadow-2xs"
              title="Return to Administrator Dashboard"
            >
              <Shield className="w-3.5 h-3.5 text-lime-400 shrink-0" />
              {!collapsed && <span className="truncate">← Admin Console</span>}
            </Link>
          )}
          {currentNavItems.map((item, idx) => {
            if ('group' in item) {
              if (collapsed) return <div key={idx} className="my-2 border-t border-slate-100" />;
              return (
                <div
                  key={idx}
                  className="px-3 pt-3.5 pb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400"
                >
                  {item.group}
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                title={collapsed ? item.name : undefined}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-normal transition-all duration-150 group relative',
                    isActive
                      ? 'bg-slate-100 text-slate-950 font-medium shadow-2xs'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50',
                    item.isComingSoon && 'opacity-85'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={clsx(
                        'shrink-0 transition-transform group-hover:scale-105 duration-150',
                        isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-slate-700'
                      )}
                    >
                      {item.icon}
                    </span>

                    {!collapsed && (
                      <span className="truncate flex-1 tracking-tight text-xs">{item.name}</span>
                    )}

                    {!collapsed && item.badge !== undefined && (
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-white text-[10px] font-mono font-medium tracking-tight">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Compact Bottom Footer with Direct Subscription Link & Collapse Toggle */}
        {!collapsed ? (
          <div className="p-3 border-t border-slate-100 shrink-0 space-y-2 bg-white">
            <Link
              to="/admin/subscription"
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors text-xs group"
              title="Manage Subscription Plans"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium text-slate-800 text-xs">Enterprise Active</span>
              </div>
              <span className="text-[10px] font-medium text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                Plans →
              </span>
            </Link>

            {/* Collapse sidebar toggle button */}
            <button
              onClick={onToggleCollapse}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-normal text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Collapse sidebar</span>
            </button>
          </div>
        ) : (
          <div className="p-3 border-t border-slate-100 shrink-0 flex flex-col items-center gap-2 bg-white">
            <Link
              to="/admin/subscription"
              className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors"
              title="Subscription Plans"
            >
              <Zap className="w-4 h-4" />
            </Link>
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-900 cursor-pointer"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
