import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  ShoppingCart,
  Kanban,
  Truck,
  CreditCard,
  RotateCcw,
  BarChart3,
  Receipt,
  CalendarCheck,
  Calendar,
  Clock,
  UserPlus,
} from 'lucide-react';

/**
 * APPROVED SIDEBAR NAVIGATION
 * Customers is organized as an expandable section with two sub-pages:
 * - Sales Customers (all roles)
 * - Marketing Leads (Sales Manager, Sales Coordinator, and Sales Rep only)
 * Attendance & Work Updates is organized as a single expandable section
 * with three sub-navigation pages: Schedule, Attendance, and Work Updates.
 * Returns & Cancellations is restricted to Sales Manager and Sales Coordinator.
 * Sales Performance & Reports provides individual & team reporting across all roles.
 */
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products & Stock', icon: Package },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    isExpandable: true,
    children: [
      {
        id: 'sales-customers',
        label: 'Sales Customers',
        icon: Users,
      },
      {
        id: 'marketing-leads',
        label: 'Marketing Leads',
        icon: UserPlus,
        badgeKey: 'newMarketingLeads',
        allowedRoles: ['sales_manager', 'sales_coordinator', 'sales_rep', 'admin'],
      },
    ],
  },
  { id: 'quotations', label: 'Quotations', icon: FileText, badgeKey: 'pendingQuotes' },
  { id: 'sales-orders', label: 'Sales Orders', icon: ShoppingCart },
  { id: 'sales-pipeline', label: 'Sales Pipeline', icon: Kanban, badgeKey: 'activePipeline' },
  { id: 'dispatch', label: 'Dispatch & Delivery', icon: Truck, badgeKey: 'pendingDispatches' },
  { id: 'invoices-payments', label: 'Invoices & Payments', icon: CreditCard, badgeKey: 'overdueInvoices' },
  {
    id: 'returns',
    label: 'Returns & Cancellations',
    icon: RotateCcw,
    badgeKey: 'pendingReturns',
    allowedRoles: ['sales_manager', 'sales_coordinator', 'admin'],
  },
  { id: 'targets-reports', label: 'Sales Performance & Reports', icon: BarChart3 },
  {
    id: 'attendance-work',
    label: 'Attendance & Action Plan',
    icon: CalendarCheck,
    isExpandable: true,
    children: [
      {
        id: 'schedule',
        getLabel: (role) =>
          ['sales_manager', 'sales_coordinator', 'admin'].includes(role)
            ? 'Team Schedule'
            : 'My Schedule',
        label: 'Action Plan',
        icon: Calendar,
        badgeKey: 'pendingActivities',
      },
      {
        id: 'attendance',
        label: 'Attendance',
        icon: Clock,
        badgeKey: 'pendingLeaves',
      },
      {
        id: 'work-updates',
        label: 'Work Updates',
        icon: FileText,
      },
    ],
  },
  { id: 'expenses', label: 'Expenses', icon: Receipt, badgeKey: 'pendingExpenses' },
];
