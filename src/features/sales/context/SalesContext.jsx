/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_QUOTATIONS,
  INITIAL_OPPORTUNITIES,
  INITIAL_ORDERS,
  INITIAL_DISPATCHES,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_RETURNS,
  INITIAL_EXPENSES,
  INITIAL_FOLLOWUPS,
  INITIAL_NOTIFICATIONS,
  COMPANY_ATTENDANCE_POLICY,
  TEAM_ROSTER,
  INITIAL_ATTENDANCE,
  INITIAL_WORK_UPDATES,
  INITIAL_LEAVES,
  INITIAL_TARGETS,
  INITIAL_REGIONS,
  INITIAL_ACTIVITIES,
  DEFAULT_COMPANY_CONFIG,
  INITIAL_EMPLOYEE_BUDGETS,
  INITIAL_MARKETING_LEADS,
} from '../data/mockData';
import { generateReference } from '../utils/formatters';
import { downloadQuotationDocument } from '../utils/documentGenerator';

const SalesContext = createContext(null);

const STORAGE_KEY = 'apex_erp_sales_state_v11';
const PREV_STORAGE_KEY = 'apex_erp_sales_state_v10';

const PRODUCT_MIGRATION_MAP = {
  'PRD-M-101': '2026-10-HV25-0101',
  'PRD-M-102': '2026-10-FP40-0102',
  'PRD-R-201': '2026-10-DM60-0201',
  'PRD-R-202': '2026-10-FG20-0202',
  'PRD-B-301': '2026-10-HT12-0301',
  'PRD-M-103': '2026-10-CH50-0103',
  'PRD-R-203': '2026-10-CT05-0203',
};

const DEFAULT_PROFILE = {
  fullName: 'Vikram Mehta',
  employeeId: 'APX-EMP-4091',
  email: 'vikram.mehta@apexerpsolutions.demo',
  phone: '+91 98200 45678',
  jobTitle: 'Senior Sales Representative',
  department: 'Field Sales & Customer Accounts',
  reportingManager: 'Ananya Roy (Sales Manager) / Sneha Patil (Sales Coordinator)',
  officeLocation: 'Hyderabad Regional Hub (Hitec City)',
  role: 'Sales Representative',
  level: 3,
  regionId: 'REG-HYD',
  territoryId: 'TERR-HYD-A',
  territoryName: 'Distributor Territory A (Kukatpally, Jubilee Hills, Banjara Hills)',
  avatarUrl: '',
  bio: 'Managing regional industrial OEM and dealer networks for precision manufacturing products.',
};

export function SalesProvider({ children }) {
  // Products
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_products`) || localStorage.getItem(`${PREV_STORAGE_KEY}_products`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((p) => p.id?.startsWith('PRD-') || p.code?.startsWith('PRD-'))) {
          return INITIAL_PRODUCTS;
        }
        return parsed;
      }
      return INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  // Customers
  const [customers, setCustomers] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_customers`) || localStorage.getItem(`${PREV_STORAGE_KEY}_customers`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((c, idx) => {
            let cusId = c.customerId;
            if (!cusId || !cusId.startsWith('CUS-')) {
              const m = (c.id || '').match(/\d+/);
              const num = m ? parseInt(m[0], 10) : idx + 1;
              cusId = `CUS-${String(num).padStart(6, '0')}`;
            }
            return {
              ...c,
              customerId: cusId,
              code: c.code || cusId,
            };
          });
        }
      }
      return INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  });

  // Quotations
  const [quotations, setQuotations] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_quotations`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((q) => {
          let convertedOrderNo = q.convertedOrderNo;
          if (q.id === 'QT-2026-084' || q.id === 'QT-2026-079') {
            convertedOrderNo = null;
          }
          const roleLabel =
            q.createdByRole === 'sales_coordinator'
              ? 'Sales Coordinator'
              : q.createdByRole === 'sales_manager'
              ? 'Sales Manager'
              : 'Sales Rep';
          const fallbackRaisedBy =
            q.raisedBy ||
            q.salesOwner ||
            (q.createdByName ? `${q.createdByName} (${roleLabel})` : 'Vikram Mehta (Sales Rep)');
          const fallbackRole =
            q.createdByRole ||
            (fallbackRaisedBy.includes('Coordinator')
              ? 'sales_coordinator'
              : fallbackRaisedBy.includes('Manager')
              ? 'sales_manager'
              : 'sales_rep');

          return {
            ...q,
            raisedBy: fallbackRaisedBy,
            salesOwner: fallbackRaisedBy,
            createdByRole: fallbackRole,
            createdByName:
              q.createdByName ||
              (fallbackRole === 'sales_coordinator'
                ? 'Sneha Patil'
                : fallbackRole === 'sales_manager'
                ? 'Ananya Roy'
                : 'Vikram Mehta'),
            convertedOrderNo,
            items: (q.items || []).map((it) => ({
              ...it,
              productId: PRODUCT_MIGRATION_MAP[it.productId] || it.productId,
            })),
          };
        });
      }
      return INITIAL_QUOTATIONS;
    } catch {
      return INITIAL_QUOTATIONS;
    }
  });

  // Orders
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_orders`) || localStorage.getItem(`${PREV_STORAGE_KEY}_orders`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedOrderNos = new Set(parsed.map((o) => o.orderNo));
        const missingInitial = INITIAL_ORDERS.filter((init) => !savedOrderNos.has(init.orderNo));
        const combined = [...parsed, ...missingInitial];

        // Ensure the initial demonstration orders are preserved at the top
        combined.sort((a, b) => {
          const indexA = INITIAL_ORDERS.findIndex((init) => init.orderNo === a.orderNo);
          const indexB = INITIAL_ORDERS.findIndex((init) => init.orderNo === b.orderNo);
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return 0;
        });

        return combined.map((o) => {
          const items = (o.items || []).map((it) => ({
            ...it,
            productId: PRODUCT_MIGRATION_MAP[it.productId] || it.productId,
          }));
          const initialOrder = INITIAL_ORDERS.find((init) => init.orderNo === o.orderNo);
          const paid = o.amountPaid !== undefined ? Number(o.amountPaid) : (initialOrder?.amountPaid || 0);
          const bal = o.pendingBalance !== undefined ? Number(o.pendingBalance) : Math.max(0, Number(o.totalAmount || 0) - paid);
          return {
            ...o,
            quotationNo: o.quotationNo || initialOrder?.quotationNo || null,
            invoiceNo: o.invoiceNo || initialOrder?.invoiceNo || null,
            amountPaid: paid,
            pendingBalance: bal,
            items,
          };
        });
      }
      return INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  // Opportunities / Sales Pipeline (7 stages: New Lead, Quotation Sent, Negotiation, Quotation Finalized, Active Order, Closed Won, Closed Lost)
  const [opportunities, setOpportunities] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_opportunities`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_OPPORTUNITIES;
    } catch {
      return INITIAL_OPPORTUNITIES;
    }
  });

  // Commission Policy (Configurable for future admin rules)
  // Current Policy: Calculate commission ONLY on eligible sales above assigned target
  const [commissionPolicy, setCommissionPolicy] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_commission_policy`);
      return saved
        ? JSON.parse(saved)
        : {
            rule: 'above_target_only', // 'above_target_only' | 'all_sales' | 'tiered'
            rateAboveTarget: 0.05, // 5%
            baseRate: 0.0,
            adminConfigurable: true,
          };
    } catch {
      return {
        rule: 'above_target_only',
        rateAboveTarget: 0.05,
        baseRate: 0.0,
        adminConfigurable: true,
      };
    }
  });

  const updateCommissionPolicy = (newPolicy) => {
    setCommissionPolicy((prev) => {
      const updated = { ...prev, ...newPolicy };
      try {
        localStorage.setItem(`${STORAGE_KEY}_commission_policy`, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  };

  // Dispatches
  const [dispatches, setDispatches] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_dispatches`);
      return saved ? JSON.parse(saved) : INITIAL_DISPATCHES;
    } catch {
      return INITIAL_DISPATCHES;
    }
  });

  // Invoices
  const [invoices, setInvoices] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_invoices`) || localStorage.getItem(`${PREV_STORAGE_KEY}_invoices`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((i) => {
          const initialInv = INITIAL_INVOICES.find((init) => init.invoiceNo === i.invoiceNo);
          return {
            ...i,
            quotationNo: i.quotationNo || initialInv?.quotationNo || null,
            approvalStatus: i.approvalStatus || 'Approved',
            approvedBy: i.approvedBy || 'Rajesh Singhania',
            approvedRole: i.approvedRole || 'Accountant',
            approvedAt: i.approvedAt || i.invoiceDate,
          };
        });
      }
      return INITIAL_INVOICES.map((i) => ({
        ...i,
        approvalStatus: i.approvalStatus || 'Approved',
        approvedBy: i.approvedBy || 'Rajesh Singhania',
        approvedRole: i.approvedRole || 'Accountant',
        approvedAt: i.approvedAt || i.invoiceDate,
      }));
    } catch {
      return INITIAL_INVOICES.map((i) => ({
        ...i,
        approvalStatus: i.approvalStatus || 'Approved',
        approvedBy: i.approvedBy || 'Rajesh Singhania',
        approvedRole: i.approvedRole || 'Accountant',
        approvedAt: i.approvedAt || i.invoiceDate,
      }));
    }
  });

  // Payment Reminders (Collect Action Tracking)
  const [paymentReminders, setPaymentReminders] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_payment_reminders`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Payments
  const [payments, setPayments] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_payments`);
      return saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
    } catch {
      return INITIAL_PAYMENTS;
    }
  });

  // Returns & Cancellations
  const [returns, setReturns] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_returns`);
      return saved ? JSON.parse(saved) : INITIAL_RETURNS;
    } catch {
      return INITIAL_RETURNS;
    }
  });

  // Expenses
  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_expenses`);
      return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
    } catch {
      return INITIAL_EXPENSES;
    }
  });

  // Pre-Assigned Employee Budgets
  const [employeeBudgets, setEmployeeBudgets] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_employee_budgets`);
      return saved ? JSON.parse(saved) : INITIAL_EMPLOYEE_BUDGETS;
    } catch {
      return INITIAL_EMPLOYEE_BUDGETS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_employee_budgets`, JSON.stringify(employeeBudgets));
    } catch (e) {
      console.warn('Storage failed for employee budgets', e);
    }
  }, [employeeBudgets]);

  // Follow-ups
  const [followups, setFollowups] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_followups`);
      return saved ? JSON.parse(saved) : INITIAL_FOLLOWUPS;
    } catch {
      return INITIAL_FOLLOWUPS;
    }
  });

  // Notifications
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_notifications`);
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  // Marketing Leads State
  const [marketingLeads, setMarketingLeads] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_marketing_leads`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_MARKETING_LEADS;
    } catch {
      return INITIAL_MARKETING_LEADS;
    }
  });

  // Attendance & Work Updates States
  const [attendanceRecords, setAttendanceRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_attendance`);
      return saved ? JSON.parse(saved) : INITIAL_ATTENDANCE;
    } catch {
      return INITIAL_ATTENDANCE;
    }
  });

  const [attendancePolicy, setAttendancePolicy] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_attendance_policy`);
      return saved ? JSON.parse(saved) : COMPANY_ATTENDANCE_POLICY;
    } catch {
      return COMPANY_ATTENDANCE_POLICY;
    }
  });

  const [teamRoster, setTeamRoster] = useState(() => {
    return TEAM_ROSTER;
  });

  const [workUpdates, setWorkUpdates] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_work_updates`);
      return saved ? JSON.parse(saved) : INITIAL_WORK_UPDATES;
    } catch {
      return INITIAL_WORK_UPDATES;
    }
  });

  const [leaveRequests, setLeaveRequests] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_leave_requests`);
      return saved ? JSON.parse(saved) : INITIAL_LEAVES;
    } catch {
      return INITIAL_LEAVES;
    }
  });

  const [targets, setTargets] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_targets`);
      return saved ? JSON.parse(saved) : INITIAL_TARGETS;
    } catch {
      return INITIAL_TARGETS;
    }
  });

  // Regional and Distributor Organization (Section 2)
  const [regions, setRegions] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_regions`);
      return saved ? JSON.parse(saved) : INITIAL_REGIONS;
    } catch {
      return INITIAL_REGIONS;
    }
  });

  // Regional Task Scheduling & Customer Visits (Section 3)
  const [activities, setActivities] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_activities`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= INITIAL_ACTIVITIES.length) {
          return parsed;
        }
      }
      return INITIAL_ACTIVITIES;
    } catch {
      return INITIAL_ACTIVITIES;
    }
  });

  // Centralized Company Configuration & Terms (Sections 6 & 7)
  const [companyConfig, setCompanyConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_company_config`);
      return saved ? JSON.parse(saved) : DEFAULT_COMPANY_CONFIG;
    } catch {
      return DEFAULT_COMPANY_CONFIG;
    }
  });

  // Profile and Session State
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_profile`);
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_auth`);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Enterprise Audit Logs (Tracks customer downloads, quote actions, permission changes)
  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_audit_logs`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Configured Company Email Sender Account & Integration Status
  const [emailConfig, setEmailConfig] = useState(() => ({
    fromName: 'ApexERP Commercial Sales',
    fromEmail: 'quotations@apexerpsolutions.demo',
    replyTo: 'sales.operations@apexerpsolutions.demo',
    smtpHost: import.meta.env?.VITE_SMTP_HOST || '',
    smtpPort: import.meta.env?.VITE_SMTP_PORT || '587',
    apiEndpoint: import.meta.env?.VITE_EMAIL_API_ENDPOINT || '',
    isConfigured: Boolean(import.meta.env?.VITE_EMAIL_API_ENDPOINT || import.meta.env?.VITE_SMTP_HOST),
  }));

  // Navigation state (Sync with URL hash and browser history for Back/Forward navigation)
  const getInitialPage = () => {
    try {
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.replace(/^#\/?/, '').trim();
        return hash || 'dashboard';
      }
      return 'dashboard';
    } catch {
      return 'dashboard';
    }
  };

  const [activePage, setActivePage] = useState(getInitialPage);
  const [pageFilter, setPageFilter] = useState(null);

  // Synchronize browser history and handle Back / Forward navigation
  useEffect(() => {
    const handlePopState = (e) => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      const targetPage = e.state?.page || hash || 'dashboard';
      const targetFilter = e.state?.filter || null;
      setActivePage(targetPage);
      setPageFilter(targetFilter);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Ensure initial history state is set
    const currentHash = window.location.hash.replace(/^#\/?/, '').trim();
    if (!currentHash) {
      window.history.replaceState({ page: 'dashboard', filter: null }, '', '#/dashboard');
    } else if (!window.history.state) {
      window.history.replaceState({ page: currentHash, filter: null }, '', `#/` + currentHash);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Four-Level Sales Organizational Hierarchy:
  // 1. Sales Manager (Highest Sales Authority)
  // 2. Sales Coordinator (Regional Sales Operations Authority)
  // 3. Sales Representative (Regular field sales employee)
  // 4. Junior Sales Employee (Entry-level field sales employee)
  const [userRole, setUserRoleState] = useState('sales_rep');

  const setUserRole = (role) => {
    setUserRoleState(role);
    if (role === 'finance') {
      setUserProfile((prev) => ({
        ...prev,
        fullName: 'Rajesh Singhania',
        employeeId: 'APX-EMP-1008',
        email: 'rajesh.singhania@apexerpsolutions.demo',
        phone: '+91 98220 33445',
        jobTitle: 'Head of Finance & Accounts',
        role: 'Finance Officer',
        level: 1,
        department: 'Finance & Treasury',
      }));
    } else if (role === 'sales_manager' || role === 'admin') {
      setUserProfile((prev) => ({
        ...prev,
        fullName: 'Ananya Roy',
        employeeId: 'APX-EMP-1002',
        email: 'ananya.roy@apexerpsolutions.demo',
        phone: '+91 98190 11223',
        jobTitle: 'Head of Commercial Sales / Sales Manager',
        role: 'Sales Manager',
        level: 1,
        department: 'Commercial Sales & Distribution',
        reportingManager: 'Managing Director / Board',
        officeLocation: 'Apex Corporate HQ (Pune & Multi-Region)',
        regionId: 'ALL',
      }));
    } else if (role === 'sales_coordinator') {
      setUserProfile((prev) => ({
        ...prev,
        fullName: 'Sneha Patil',
        employeeId: 'APX-EMP-3044',
        email: 'sneha.patil@apexerpsolutions.demo',
        phone: '+91 98211 55677',
        jobTitle: 'Regional Sales Coordinator (Hyderabad & Deccan)',
        role: 'Sales Coordinator',
        level: 2,
        department: 'Regional Sales Operations',
        reportingManager: 'Ananya Roy (Sales Manager)',
        officeLocation: 'Hyderabad Regional Hub (Hitec City)',
        regionId: 'REG-HYD',
      }));
    } else if (role === 'junior_sales') {
      setUserProfile((prev) => ({
        ...prev,
        fullName: 'Aditya Joshi',
        employeeId: 'APX-EMP-5011',
        email: 'aditya.joshi@apexerpsolutions.demo',
        phone: '+91 98760 12345',
        jobTitle: 'Junior Sales Associate',
        role: 'Junior Sales Employee',
        level: 4,
        department: 'Field Sales & Lead Generation',
        reportingManager: 'Sneha Patil (Sales Coordinator)',
        officeLocation: 'Hyderabad Regional Hub',
        regionId: 'REG-HYD',
        territoryId: 'TERR-HYD-C',
        territoryName: 'Distributor Territory C (ECIL, Kapra, Sainikpuri, Neredmet)',
      }));
    } else {
      // Default: sales_rep
      setUserProfile((prev) => ({
        ...prev,
        fullName: 'Vikram Mehta',
        employeeId: 'APX-EMP-4091',
        email: 'vikram.mehta@apexerpsolutions.demo',
        phone: '+91 98200 45678',
        jobTitle: 'Senior Sales Representative',
        role: 'Sales Representative',
        level: 3,
        department: 'Field Sales & Customer Accounts',
        reportingManager: 'Ananya Roy (Sales Manager) / Sneha Patil (Sales Coordinator)',
        officeLocation: 'Hyderabad Regional Hub (Hitec City)',
        regionId: 'REG-HYD',
        territoryId: 'TERR-HYD-A',
        territoryName: 'Distributor Territory A (Kukatpally, Jubilee Hills, Banjara Hills)',
      }));
    }
  };

  const permissions = useMemo(() => {
    const isJuniorSales = userRole === 'junior_sales';
    const isSalesRep = userRole === 'sales_rep';
    const isSalesCoordinator = userRole === 'sales_coordinator';
    const isSalesManager = userRole === 'sales_manager';
    const isAdmin = userRole === 'admin' || userRole === 'sales_manager';
    const isFinance = userRole === 'finance';
    const isManager = isSalesManager || isAdmin;

    const canDownloadCustomerData = isSalesManager || isSalesCoordinator || userRole === 'admin';
    const canDownloadQuotationPDF = true; // All 4 sales roles can view and download quotation documents within their scope
    const canAccessAllTeamData = isSalesManager || userRole === 'admin';
    const canAccessRegionalData = isSalesManager || isSalesCoordinator || userRole === 'admin';
    const canAssignActivities = isSalesManager || isSalesCoordinator || userRole === 'admin';
    const canApproveQuotesFromRepsAndJuniors = isSalesManager || isSalesCoordinator || userRole === 'admin';
    const canApproveQuotesFromCoordinators = isSalesManager || userRole === 'admin';
    const canApproveQuotes = canApproveQuotesFromRepsAndJuniors;

    return {
      isJuniorSales,
      isSalesRep,
      isSalesCoordinator,
      isSalesManager,
      isAdmin,
      isFinance,
      isManager,
      canDownloadCustomerData,
      canDownloadQuotationPDF,
      canAccessAllTeamData,
      canAccessRegionalData,
      canAssignActivities,
      canApproveQuotes,
      canApproveQuotesFromRepsAndJuniors,
      canApproveQuotesFromCoordinators,
      canViewCosts: isSalesManager || isSalesCoordinator || isAdmin || isFinance,
      maxDiscountPercent: isAdmin ? 25 : isSalesCoordinator ? 20 : isFinance ? 20 : isSalesRep ? 12 : 8,
      canApproveDownload: canDownloadQuotationPDF,
      canDispatch: true,
      canRecordPayments: true,
      canApproveExpenses: isSalesManager || isAdmin || isFinance,
      canReimburseExpenses: isAdmin || isFinance,
      canAccessMarketingLeads: !isJuniorSales,
      canAssignMarketingLeads: isSalesManager || isSalesCoordinator || isAdmin,
      canAcceptRejectMarketingLeads: !isJuniorSales,
      canExportMarketingLeads: !isJuniorSales,
    };
  }, [userRole]);

  // Safe localStorage synchronization
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_products`, JSON.stringify(products));
      localStorage.setItem(`${STORAGE_KEY}_customers`, JSON.stringify(customers));
      localStorage.setItem(`${STORAGE_KEY}_quotations`, JSON.stringify(quotations));
      localStorage.setItem(`${STORAGE_KEY}_orders`, JSON.stringify(orders));
      localStorage.setItem(`${STORAGE_KEY}_dispatches`, JSON.stringify(dispatches));
      localStorage.setItem(`${STORAGE_KEY}_invoices`, JSON.stringify(invoices));
      localStorage.setItem(`${STORAGE_KEY}_payments`, JSON.stringify(payments));
      localStorage.setItem(`${STORAGE_KEY}_returns`, JSON.stringify(returns));
      localStorage.setItem(`${STORAGE_KEY}_expenses`, JSON.stringify(expenses));
      localStorage.setItem(`${STORAGE_KEY}_followups`, JSON.stringify(followups));
      localStorage.setItem(`${STORAGE_KEY}_notifications`, JSON.stringify(notifications));
      localStorage.setItem(`${STORAGE_KEY}_profile`, JSON.stringify(userProfile));
      localStorage.setItem(`${STORAGE_KEY}_auth`, JSON.stringify(isAuthenticated));
      localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(attendanceRecords));
      localStorage.setItem(`${STORAGE_KEY}_attendance_policy`, JSON.stringify(attendancePolicy));
      localStorage.setItem(`${STORAGE_KEY}_work_updates`, JSON.stringify(workUpdates));
      localStorage.setItem(`${STORAGE_KEY}_leave_requests`, JSON.stringify(leaveRequests));
      localStorage.setItem(`${STORAGE_KEY}_targets`, JSON.stringify(targets));
      localStorage.setItem(`${STORAGE_KEY}_audit_logs`, JSON.stringify(auditLogs));
      localStorage.setItem(`${STORAGE_KEY}_opportunities`, JSON.stringify(opportunities));
      localStorage.setItem(`${STORAGE_KEY}_regions`, JSON.stringify(regions));
      localStorage.setItem(`${STORAGE_KEY}_activities`, JSON.stringify(activities));
      localStorage.setItem(`${STORAGE_KEY}_company_config`, JSON.stringify(companyConfig));
      localStorage.setItem(`${STORAGE_KEY}_payment_reminders`, JSON.stringify(paymentReminders));
      localStorage.setItem(`${STORAGE_KEY}_marketing_leads`, JSON.stringify(marketingLeads));
    } catch (e) {
      console.warn('Storage sync error:', e);
    }
  }, [
    products,
    customers,
    quotations,
    orders,
    opportunities,
    dispatches,
    invoices,
    payments,
    returns,
    expenses,
    followups,
    notifications,
    userProfile,
    isAuthenticated,
    attendanceRecords,
    attendancePolicy,
    workUpdates,
    leaveRequests,
    targets,
    auditLogs,
    regions,
    activities,
    companyConfig,
    paymentReminders,
    marketingLeads,
  ]);

  // Navigation helper with browser history support
  const navigateTo = (page, filter = null, pushHistory = true) => {
    let targetPage = page;
    let targetFilter = filter;
    if (page === 'calls-followups') {
      targetPage = 'customers';
      targetFilter = 'calls-followups';
    }
    setActivePage(targetPage);
    setPageFilter(targetFilter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (pushHistory && typeof window !== 'undefined') {
      const targetHash = `#/` + targetPage;
      if (window.location.hash !== targetHash) {
        window.history.pushState({ page: targetPage, filter: targetFilter }, '', targetHash);
      }
    }
  };

  // Reset to initial demo data
  const resetDemoData = () => {
    setProducts(INITIAL_PRODUCTS);
    setCustomers(INITIAL_CUSTOMERS);
    setQuotations(INITIAL_QUOTATIONS);
    setOrders(INITIAL_ORDERS);
    setDispatches(INITIAL_DISPATCHES);
    setInvoices(INITIAL_INVOICES);
    setPayments(INITIAL_PAYMENTS);
    setReturns(INITIAL_RETURNS);
    setExpenses(INITIAL_EXPENSES);
    setFollowups(INITIAL_FOLLOWUPS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAttendanceRecords(INITIAL_ATTENDANCE);
    setAttendancePolicy(COMPANY_ATTENDANCE_POLICY);
    setWorkUpdates(INITIAL_WORK_UPDATES);
    setLeaveRequests(INITIAL_LEAVES);
    setTargets(INITIAL_TARGETS);
    setOpportunities(INITIAL_OPPORTUNITIES);
    setRegions(INITIAL_REGIONS);
    setActivities(INITIAL_ACTIVITIES);
    setCompanyConfig(DEFAULT_COMPANY_CONFIG);
    setMarketingLeads(INITIAL_MARKETING_LEADS);
    setUserProfile(DEFAULT_PROFILE);
    setIsAuthenticated(true);
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  };

  // -------------------------------------------------------------
  // USER PROFILE & AUTH SIMULATION
  // -------------------------------------------------------------
  const updateUserProfile = (newProfile) => {
    setUserProfile(newProfile);
  };

  const signIn = () => {
    setIsAuthenticated(true);
  };

  const signUp = (newUserData) => {
    setUserProfile((prev) => ({ ...prev, ...newUserData }));
    setIsAuthenticated(true);
  };

  const signOut = () => {
    setIsAuthenticated(false);
  };

  // -------------------------------------------------------------
  // CUSTOMER OPERATIONS
  // -------------------------------------------------------------
  const addCustomer = (customerData) => {
    let maxNum = 0;
    customers.forEach((c) => {
      const cid = c.customerId || c.code || c.id || '';
      const m = cid.match(/CUS-(\d+)/i) || cid.match(/CUST-(\d+)/i);
      if (m) {
        const val = parseInt(m[1], 10);
        if (!isNaN(val) && val > maxNum) {
          maxNum = val;
        }
      }
    });
    const nextNum = maxNum + 1;
    const customerId = `CUS-${String(nextNum).padStart(6, '0')}`;

    const newCustomer = {
      ...customerData,
      id: customerId,
      customerId,
      code: customerId,
      outstandingBalance: null, // New customers display '—'
      lastOrderDate: '—',
      totalOrders: 0,
      status: customerData.status || 'Active',
      remarks: customerData.remarks || 'Direct inbound sales inquiry',
      assignedTo: customerData.assignedTo || userProfile.fullName,
      assignedEmployeeId: customerData.assignedEmployeeId || userProfile.employeeId,
      createdBy: userProfile.fullName,
      createdAt: new Date().toISOString(),
      isNew: true,
    };
    setCustomers((prev) => [...prev, newCustomer]);

    // Record audit log
    const auditEntry = {
      id: `AUD-CUST-${Date.now()}`,
      action: 'Customer Created',
      user: userProfile.fullName,
      employeeId: userProfile.employeeId,
      role: userRole,
      timestamp: new Date().toISOString(),
      details: `Created customer record ${newCustomer.name} (${customerId})`,
      metadata: { customerId, name: newCustomer.name },
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);

    return newCustomer;
  };

  const updateCustomer = (id, updates) => {
    const isRestricted = userRole === 'sales_rep';
    const target = customers.find((c) => c.id === id || c.customerId === id || c.code === id);

    const safeUpdates = {
      ...updates,
      gstin: updates.gstin !== undefined ? updates.gstin : target?.gstin,
      creditLimit: isRestricted && target ? target.creditLimit : updates.creditLimit ?? target?.creditLimit,
      status: isRestricted && target ? target.status : updates.status ?? target?.status,
      lastModifiedBy: userProfile.fullName,
      lastModifiedAt: new Date().toISOString(),
    };

    setCustomers((prev) =>
      prev.map((c) => (c.id === id || c.customerId === id || c.code === id ? { ...c, ...safeUpdates } : c))
    );

    const auditEntry = {
      id: `AUD-CUST-UPD-${Date.now()}`,
      action: 'Customer Updated',
      user: userProfile.fullName,
      employeeId: userProfile.employeeId,
      role: userRole,
      timestamp: new Date().toISOString(),
      details: `Updated customer profile for ${target?.name || id}`,
      metadata: { customerId: id },
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);
  };

  const downloadCustomerData = () => {
    if (userRole === 'sales_rep') {
      throw new Error('Unauthorized: Sales Representatives are restricted from downloading customer database records.');
    }

    const headers = [
      'Customer ID',
      'Business Name',
      'Customer Type',
      'Contact Person',
      'Designation',
      'Phone',
      'WhatsApp',
      'Email',
      'City',
      'Region',
      'Address',
      'GSTIN',
      'Credit Limit',
      'Outstanding Balance',
      'Status',
      'Initial Contact Reason (Remarks)',
      'Assigned Salesperson',
      'Total Orders',
    ];

    const rows = customers.map((c) => [
      `"${c.customerId || c.code || c.id}"`,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.type || '').replace(/"/g, '""')}"`,
      `"${(c.contactPerson || '').replace(/"/g, '""')}"`,
      `"${(c.designation || '').replace(/"/g, '""')}"`,
      `"${c.phone || ''}"`,
      `"${c.whatsapp || c.phone || ''}"`,
      `"${c.email || ''}"`,
      `"${c.city || ''}"`,
      `"${c.region || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${c.gstin || ''}"`,
      c.creditLimit || 0,
      c.outstandingBalance !== null ? c.outstandingBalance : '—',
      `"${c.status || 'Active'}"`,
      `"${(c.remarks || '').replace(/"/g, '""')}"`,
      `"${c.assignedTo || 'Unassigned'}"`,
      c.totalOrders || 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `ApexERP_Customers_Export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Record user, timestamp, and downloaded data in audit log
    const auditEntry = {
      id: `AUD-EXPCUST-${Date.now()}`,
      action: 'Customer Database Export',
      user: userProfile.fullName,
      employeeId: userProfile.employeeId,
      role: userRole,
      timestamp: new Date().toISOString(),
      details: `Exported ${customers.length} customer records to CSV`,
      recordsCount: customers.length,
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);

    // Role-based notification
    if (userRole === 'sales_manager') {
      // When a Manager downloads customer data, notify the Coordinator and Admin
      addNotification({
        type: 'info',
        title: 'Customer Data Downloaded by Manager',
        message: `${userProfile.fullName} (Sales Manager) downloaded overall customer database (${customers.length} accounts). Notified Coordinator & Admin.`,
        page: 'customers',
      });
    } else if (userRole === 'sales_coordinator') {
      // When a Coordinator downloads it, notify Admin
      addNotification({
        type: 'info',
        title: 'Customer Data Downloaded by Coordinator',
        message: `${userProfile.fullName} (Sales Coordinator) downloaded overall customer database (${customers.length} accounts). Notified Admin.`,
        page: 'customers',
      });
    }

    return { success: true, count: customers.length };
  };

  // -------------------------------------------------------------
  // MARKETING LEADS OPERATIONS (Sales Module <-> Marketing)
  // -------------------------------------------------------------

  // Role-scoped marketing leads
  const scopedMarketingLeads = useMemo(() => {
    if (userRole === 'junior_sales') {
      return [];
    }
    if (userRole === 'sales_rep') {
      return marketingLeads.filter(
        (lead) => lead.assignedEmployeeId === userProfile.employeeId
      );
    }
    if (userRole === 'sales_coordinator') {
      const supervisedIds = ['APX-EMP-4091', 'APX-EMP-4092', 'APX-EMP-4093', 'APX-EMP-4082'];
      return marketingLeads.filter(
        (lead) =>
          !lead.regionId ||
          lead.regionId === 'REG-HYD' ||
          supervisedIds.includes(lead.assignedEmployeeId) ||
          !lead.assignedEmployeeId
      );
    }
    // sales_manager, admin: full organization leads
    return marketingLeads;
  }, [marketingLeads, userRole, userProfile.employeeId]);

  // Helper to find potential duplicate customers matching a marketing lead
  const findMatchingCustomers = (lead) => {
    if (!lead) return [];
    const leadPhoneClean = (lead.mobile || lead.phone || '').replace(/[\s\-\+]/g, '').slice(-10);
    const leadEmailClean = (lead.email || '').trim().toLowerCase();
    const leadGstinClean = (lead.gstin || '').trim().toUpperCase();
    const leadCompanyClean = (lead.companyName || lead.company || '').trim().toLowerCase();
    const leadNameClean = (lead.customerName || lead.contactPerson || '').trim().toLowerCase();

    return customers.filter((cust) => {
      const custPhoneClean = (cust.phone || cust.whatsapp || '').replace(/[\s\-\+]/g, '').slice(-10);
      const custEmailClean = (cust.email || '').trim().toLowerCase();
      const custGstinClean = (cust.gstin || '').trim().toUpperCase();
      const custCompanyClean = (cust.name || cust.company || '').trim().toLowerCase();
      const custContactClean = (cust.contactPerson || '').trim().toLowerCase();

      const phoneMatch = Boolean(
        leadPhoneClean &&
          custPhoneClean &&
          (leadPhoneClean === custPhoneClean ||
            leadPhoneClean.endsWith(custPhoneClean) ||
            custPhoneClean.endsWith(leadPhoneClean))
      );
      const emailMatch = Boolean(leadEmailClean && custEmailClean && leadEmailClean === custEmailClean);
      const gstinMatch = Boolean(
        leadGstinClean &&
          leadGstinClean !== '—' &&
          custGstinClean &&
          custGstinClean !== '—' &&
          leadGstinClean === custGstinClean
      );
      const companyMatch = Boolean(
        leadCompanyClean &&
          custCompanyClean &&
          (leadCompanyClean === custCompanyClean ||
            custCompanyClean.includes(leadCompanyClean) ||
            leadCompanyClean.includes(custCompanyClean))
      );
      const nameMatch = Boolean(
        leadNameClean && (custCompanyClean === leadNameClean || custContactClean === leadNameClean)
      );

      return phoneMatch || emailMatch || gstinMatch || companyMatch || nameMatch;
    });
  };

  // Accept a marketing lead, resolve customer record (auto-create or link), and update status
  const acceptMarketingLead = (leadId, options = {}) => {
    if (userRole === 'junior_sales') {
      throw new Error('Unauthorized: Junior Sales Employees do not have permission to accept marketing leads');
    }

    const lead = marketingLeads.find((l) => l.leadId === leadId || l.id === leadId);
    if (!lead) {
      throw new Error(`Marketing Lead not found: ${leadId}`);
    }

    let targetCustomerId = null;
    let targetCustomerName = '';
    let isNewCustomer = false;

    // Check for matches if no forced customer ID is specified and createNewCustomer is not forced
    if (!options.createNewCustomer && !options.forcedCustomerId) {
      const matches = findMatchingCustomers(lead);
      if (matches.length > 1) {
        // Ambiguous match - require user verification before linking
        return {
          success: false,
          requiresVerification: true,
          matches,
          lead,
          message: 'Multiple existing customer accounts matched this lead. Please confirm which customer to link.',
        };
      }
      if (matches.length === 1) {
        targetCustomerId = matches[0].customerId || matches[0].id;
        targetCustomerName = matches[0].name;
      }
    } else if (options.forcedCustomerId) {
      targetCustomerId = options.forcedCustomerId;
      const found = customers.find((c) => c.customerId === options.forcedCustomerId || c.id === options.forcedCustomerId);
      if (found) targetCustomerName = found.name;
    }

    // If an existing customer was identified or chosen:
    if (targetCustomerId) {
      // Link to existing customer without creating duplicate
      isNewCustomer = false;
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.customerId === targetCustomerId || c.id === targetCustomerId) {
            const referrals = c.marketingLeadReferrals || [];
            if (!referrals.some((r) => r.leadId === lead.leadId)) {
              return {
                ...c,
                marketingLeadReferrals: [
                  ...referrals,
                  {
                    leadId: lead.leadId,
                    sentBy: lead.sentBy,
                    dateReceived: lead.dateReceived,
                    acceptedAt: new Date().toISOString(),
                    interestedProduct: lead.interestedProduct,
                  },
                ],
              };
            }
          }
          return c;
        })
      );
    } else {
      // Step 2: Customer does NOT exist -> automatically create new Sales Customer record with CUS-XXXXXX
      isNewCustomer = true;
      const assignedName =
        options.assignedEmployeeName ||
        lead.assignedEmployeeName ||
        (userRole === 'sales_rep' ? userProfile.fullName : 'Vikram Mehta');
      const assignedId =
        options.assignedEmployeeId ||
        lead.assignedEmployeeId ||
        (userRole === 'sales_rep' ? userProfile.employeeId : 'APX-EMP-4091');

      const createdCustomer = addCustomer({
        name: lead.companyName || lead.customerName,
        company: lead.companyName || '',
        contactPerson: lead.customerName || lead.companyName,
        designation: lead.designation || 'Key Decision Maker',
        phone: lead.mobile,
        whatsapp: lead.mobile,
        email: lead.email || '',
        city: lead.location || 'Hyderabad',
        region: lead.regionId || 'REG-HYD',
        state: lead.state || 'Telangana',
        address: lead.address || lead.location || 'Hyderabad, Telangana',
        gstin: lead.gstin || '—',
        type: lead.customerType || 'Corporate',
        creditLimit: 500000,
        source: 'Marketing Referral',
        sourceDetails: `Marketing lead ${lead.leadId} forwarded by ${lead.sentBy} on ${lead.dateReceived}`,
        marketingLeadId: lead.leadId,
        assignedTo: assignedName,
        assignedEmployeeId: assignedId,
        remarks: `Marketing referral: Interested in ${lead.interestedProduct || 'Products'}. Requirement: ${lead.requirement || 'N/A'}`,
      });

      targetCustomerId = createdCustomer.customerId || createdCustomer.id;
      targetCustomerName = createdCustomer.name;
    }

    // Step 4: Update status to Accepted or Assigned
    const assignedId = options.assignedEmployeeId || lead.assignedEmployeeId || null;
    const assignedName = options.assignedEmployeeName || lead.assignedEmployeeName || null;
    const nextStatus = assignedId ? 'Assigned' : 'Accepted';

    const updatedLead = {
      ...lead,
      status: nextStatus,
      linkedCustomerId: targetCustomerId,
      linkedCustomerName: targetCustomerName || lead.companyName,
      acceptedBy: userProfile.fullName,
      acceptedAt: new Date().toISOString(),
      assignedEmployeeId: assignedId,
      assignedEmployeeName: assignedName,
      statusHistory: [
        ...(lead.statusHistory || []),
        {
          status: nextStatus,
          changedBy: userProfile.fullName,
          role:
            userProfile.jobTitle ||
            (userRole === 'sales_manager'
              ? 'Sales Manager'
              : userRole === 'sales_coordinator'
              ? 'Sales Coordinator'
              : 'Sales Representative'),
          changedAt: new Date().toISOString(),
          notes:
            options.notes ||
            (isNewCustomer
              ? `Lead accepted. Created new Sales Customer record ${targetCustomerId} (${targetCustomerName}).`
              : `Lead accepted. Linked to existing customer record ${targetCustomerId} (${targetCustomerName}).`),
        },
      ],
    };

    setMarketingLeads((prev) => prev.map((l) => (l.leadId === leadId ? updatedLead : l)));

    // Record audit log
    const auditEntry = {
      id: `AUD-LEAD-ACCEPT-${Date.now()}`,
      action: isNewCustomer
        ? 'Marketing Lead Accepted (New Customer Created)'
        : 'Marketing Lead Accepted (Linked Existing)',
      user: userProfile.fullName,
      employeeId: userProfile.employeeId,
      role: userRole,
      timestamp: new Date().toISOString(),
      details: `Accepted marketing lead ${lead.leadId} for ${lead.companyName}. Customer ID: ${targetCustomerId}.`,
      metadata: { leadId: lead.leadId, customerId: targetCustomerId, isNewCustomer },
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);

    return {
      success: true,
      lead: updatedLead,
      customerId: targetCustomerId,
      isNewCustomer,
      message: isNewCustomer
        ? `Lead accepted and new Sales Customer record ${targetCustomerId} created successfully.`
        : `Lead accepted and linked to existing customer ${targetCustomerId}.`,
    };
  };

  // Reject a marketing lead with mandatory reason
  const rejectMarketingLead = (leadId, rejectionReason) => {
    if (userRole === 'junior_sales') {
      throw new Error('Unauthorized: Junior Sales Employees do not have permission to reject marketing leads');
    }
    if (!rejectionReason || !rejectionReason.trim()) {
      throw new Error('Rejection reason is mandatory when rejecting a marketing lead');
    }

    const lead = marketingLeads.find((l) => l.leadId === leadId || l.id === leadId);
    if (!lead) {
      throw new Error(`Marketing Lead not found: ${leadId}`);
    }

    const updatedLead = {
      ...lead,
      status: 'Rejected',
      rejectionReason: rejectionReason.trim(),
      rejectedBy: userProfile.fullName,
      rejectedAt: new Date().toISOString(),
      statusHistory: [
        ...(lead.statusHistory || []),
        {
          status: 'Rejected',
          changedBy: userProfile.fullName,
          role:
            userProfile.jobTitle ||
            (userRole === 'sales_manager'
              ? 'Sales Manager'
              : userRole === 'sales_coordinator'
              ? 'Sales Coordinator'
              : 'Sales Representative'),
          changedAt: new Date().toISOString(),
          notes: `Lead rejected: ${rejectionReason.trim()}`,
        },
      ],
    };

    setMarketingLeads((prev) => prev.map((l) => (l.leadId === leadId ? updatedLead : l)));

    const auditEntry = {
      id: `AUD-LEAD-REJ-${Date.now()}`,
      action: 'Marketing Lead Rejected',
      user: userProfile.fullName,
      employeeId: userProfile.employeeId,
      role: userRole,
      timestamp: new Date().toISOString(),
      details: `Rejected marketing lead ${lead.leadId} (${lead.companyName}). Reason: ${rejectionReason.trim()}`,
      metadata: { leadId: lead.leadId, reason: rejectionReason.trim() },
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);

    return { success: true, lead: updatedLead };
  };

  // Assign a marketing lead to a Sales Representative (blocks Junior Sales Employees)
  const assignMarketingLead = (leadId, { employeeId, employeeName, employeeRole, instructions }) => {
    if (userRole === 'junior_sales') {
      throw new Error('Unauthorized: Junior Sales Employees cannot assign marketing leads');
    }

    if (
      employeeRole === 'junior_sales' ||
      employeeRole === 'Junior Sales Employee' ||
      employeeId === 'APX-EMP-4082'
    ) {
      throw new Error('Assignment Restricted: Marketing Leads cannot be assigned to Junior Sales Employees');
    }

    const lead = marketingLeads.find((l) => l.leadId === leadId || l.id === leadId);
    if (!lead) {
      throw new Error(`Marketing Lead not found: ${leadId}`);
    }

    const newStatus = lead.status === 'New' || lead.status === 'Under Review' ? 'Assigned' : lead.status;

    const updatedLead = {
      ...lead,
      assignedEmployeeId: employeeId,
      assignedEmployeeName: employeeName,
      assignedBy: userProfile.fullName,
      assignedAt: new Date().toISOString(),
      assignmentInstructions: instructions || '',
      status: newStatus,
      statusHistory: [
        ...(lead.statusHistory || []),
        {
          status: 'Assigned',
          changedBy: userProfile.fullName,
          role: userProfile.jobTitle || (userRole === 'sales_manager' ? 'Sales Manager' : 'Sales Coordinator'),
          changedAt: new Date().toISOString(),
          notes: `Assigned to ${employeeName} (${employeeRole || 'Sales Rep'})${
            instructions ? `. Instructions: ${instructions}` : ''
          }`,
        },
      ],
    };

    setMarketingLeads((prev) => prev.map((l) => (l.leadId === leadId ? updatedLead : l)));

    const auditEntry = {
      id: `AUD-LEAD-ASGN-${Date.now()}`,
      action: 'Marketing Lead Assigned',
      user: userProfile.fullName,
      employeeId: userProfile.employeeId,
      role: userRole,
      timestamp: new Date().toISOString(),
      details: `Assigned marketing lead ${lead.leadId} to ${employeeName} (${employeeId})`,
      metadata: { leadId: lead.leadId, assignedEmployeeId: employeeId, assignedEmployeeName: employeeName },
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);

    return { success: true, lead: updatedLead };
  };

  // Convert an accepted marketing lead into a Sales Pipeline opportunity
  const convertLeadToPipeline = (leadId, oppData = {}) => {
    if (userRole === 'junior_sales') {
      throw new Error('Unauthorized: Junior Sales Employees cannot convert marketing leads');
    }

    const lead = marketingLeads.find((l) => l.leadId === leadId || l.id === leadId);
    if (!lead) {
      throw new Error(`Marketing Lead not found: ${leadId}`);
    }

    if (lead.pipelineOpportunityId) {
      throw new Error(`Lead is already added to Sales Pipeline as Opportunity ${lead.pipelineOpportunityId}`);
    }

    // If lead is not accepted yet, ensure it has a linked customer
    let linkedCustId = lead.linkedCustomerId;
    let linkedCustName = lead.linkedCustomerName;
    if (!linkedCustId) {
      const acceptResult = acceptMarketingLead(leadId, {
        forcedCustomerId: oppData.customerId,
        assignedEmployeeId: oppData.assignedEmployeeId || lead.assignedEmployeeId,
        assignedEmployeeName: oppData.assignedSalesperson || lead.assignedEmployeeName,
      });
      if (acceptResult.requiresVerification) {
        return acceptResult;
      }
      linkedCustId = acceptResult.customerId;
      linkedCustName = acceptResult.lead?.linkedCustomerName || lead.companyName;
    }

    const oppValue = Number(oppData.value || lead.estimatedValue || 250000);
    const opp = addOpportunity({
      title: oppData.title || `Opportunity from Marketing: ${lead.companyName}`,
      customerId: linkedCustId,
      customerDisplayId: linkedCustId,
      customerName: linkedCustName || lead.companyName,
      contactPerson: lead.customerName,
      phone: lead.mobile,
      email: lead.email || '',
      stage: 'Prospecting', // initial pipeline stage
      leadSource: 'Marketing',
      value: oppValue,
      expectedCloseDate:
        oppData.expectedCloseDate || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      assignedSalesperson: oppData.assignedSalesperson || lead.assignedEmployeeName || userProfile.fullName,
      assignedEmployeeId: oppData.assignedEmployeeId || lead.assignedEmployeeId || userProfile.employeeId,
      lastActivity: `Converted from Marketing Lead ${lead.leadId}`,
      nextFollowUpDate:
        oppData.nextFollowUpDate || new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
      nextFollowUpNote:
        oppData.nextFollowUpNote ||
        `Follow up on inquiry for ${lead.interestedProduct || 'product requirements'}. ${lead.requirement || ''}`,
      marketingLeadId: lead.leadId,
    });

    const updatedLead = {
      ...lead,
      status: 'Converted',
      pipelineOpportunityId: opp.id || opp.opportunityNo,
      convertedAt: new Date().toISOString(),
      convertedBy: userProfile.fullName,
      statusHistory: [
        ...(lead.statusHistory || []),
        {
          status: 'Converted',
          changedBy: userProfile.fullName,
          role: userProfile.jobTitle || (userRole === 'sales_manager' ? 'Sales Manager' : 'Sales Coordinator'),
          changedAt: new Date().toISOString(),
          notes: `Lead converted to Sales Pipeline Opportunity ${opp.id || opp.opportunityNo}`,
        },
      ],
    };

    setMarketingLeads((prev) => prev.map((l) => (l.leadId === leadId ? updatedLead : l)));

    const auditEntry = {
      id: `AUD-LEAD-CONV-${Date.now()}`,
      action: 'Marketing Lead Converted to Pipeline',
      user: userProfile.fullName,
      employeeId: userProfile.employeeId,
      role: userRole,
      timestamp: new Date().toISOString(),
      details: `Converted marketing lead ${lead.leadId} to opportunity ${opp.id || opp.opportunityNo} (${opp.title})`,
      metadata: { leadId: lead.leadId, opportunityId: opp.id || opp.opportunityNo, customerId: linkedCustId },
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);

    return { success: true, opportunity: opp, lead: updatedLead };
  };

  // Receive inbound lead transferred from Marketing ("Send to Sales")
  const receiveMarketingLead = (leadData) => {
    if (!leadData.customerName || !leadData.customerName.trim()) {
      throw new Error('Validation Error: Contact person name is required');
    }
    if (!leadData.companyName || !leadData.companyName.trim()) {
      throw new Error('Validation Error: Company name is required');
    }
    if (!leadData.mobile || !leadData.mobile.trim()) {
      throw new Error('Validation Error: Mobile number is required');
    }
    if (!leadData.sentBy || !leadData.sentBy.trim()) {
      throw new Error('Validation Error: Marketing sender name (sentBy) is required');
    }

    // Check duplicate by marketingRecordRef
    if (leadData.marketingRecordRef) {
      const existingRef = marketingLeads.find((l) => l.marketingRecordRef === leadData.marketingRecordRef);
      if (existingRef) {
        throw new Error(
          `Duplicate transfer rejected: Lead with Marketing Record Reference "${leadData.marketingRecordRef}" already exists as ${existingRef.leadId}`
        );
      }
    }

    // Check duplicate by active mobile + company
    const cleanMobile = leadData.mobile.replace(/[\s\-\+]/g, '').slice(-10);
    const cleanCompany = leadData.companyName.trim().toLowerCase();
    const activeDuplicate = marketingLeads.find((l) => {
      if (l.status === 'Rejected') return false;
      const lMobile = (l.mobile || '').replace(/[\s\-\+]/g, '').slice(-10);
      const lCompany = (l.companyName || '').trim().toLowerCase();
      return lMobile === cleanMobile && lCompany === cleanCompany;
    });

    if (activeDuplicate) {
      throw new Error(
        `Duplicate transfer rejected: An active lead for "${leadData.companyName}" (${leadData.mobile}) already exists in Sales as ${activeDuplicate.leadId} (${activeDuplicate.status})`
      );
    }

    // Generate Lead ID ML-2026-XXX
    let maxNum = 0;
    marketingLeads.forEach((l) => {
      const m = (l.leadId || '').match(/ML-2026-(\d+)/);
      if (m) {
        const val = parseInt(m[1], 10);
        if (!isNaN(val) && val > maxNum) maxNum = val;
      }
    });
    const leadId = `ML-2026-${String(maxNum + 1).padStart(3, '0')}`;

    const newLead = {
      leadId,
      marketingRecordRef: leadData.marketingRecordRef || `MKT-2026-${Date.now().toString().slice(-4)}`,
      customerName: leadData.customerName.trim(),
      companyName: leadData.companyName.trim(),
      mobile: leadData.mobile.trim(),
      email: (leadData.email || '').trim(),
      location: leadData.location || leadData.city || 'Hyderabad',
      city: leadData.city || leadData.location || 'Hyderabad',
      state: leadData.state || 'Telangana',
      interestedProduct: leadData.interestedProduct || '',
      requirement: leadData.requirement || '',
      estimatedValue: Number(leadData.estimatedValue || 0),
      sentBy: leadData.sentBy.trim(),
      sentByRole: leadData.sentByRole || 'Lead Generation Specialist',
      dateReceived: leadData.dateReceived || new Date().toISOString().split('T')[0],
      forwardedAt: leadData.forwardedAt || new Date().toISOString(),
      status: 'New',
      assignedEmployeeId: null,
      assignedEmployeeName: null,
      linkedCustomerId: null,
      linkedCustomerName: null,
      pipelineOpportunityId: null,
      regionId: leadData.regionId || 'REG-HYD',
      statusHistory: [
        {
          status: 'New',
          changedBy: leadData.sentBy.trim(),
          role: leadData.sentByRole || 'Marketing Specialist',
          changedAt: new Date().toISOString(),
          notes: `Transferred from Marketing: ${leadData.campaignName || 'Direct Campaign Transfer'}`,
        },
      ],
    };

    setMarketingLeads((prev) => [newLead, ...prev]);

    addNotification({
      type: 'info',
      title: 'New Marketing Lead Received',
      message: `${newLead.companyName} (${newLead.customerName}) forwarded by ${newLead.sentBy}`,
      page: 'marketing-leads',
    });

    const auditEntry = {
      id: `AUD-LEAD-RCV-${Date.now()}`,
      action: 'Marketing Lead Transferred to Sales',
      user: leadData.sentBy,
      employeeId: 'MARKETING-INTEGRATION',
      role: 'Marketing',
      timestamp: new Date().toISOString(),
      details: `Received marketing lead ${leadId} (${newLead.companyName}) from ${newLead.sentBy}`,
      metadata: { leadId, marketingRecordRef: newLead.marketingRecordRef, company: newLead.companyName },
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);

    return newLead;
  };

  // Update a marketing lead
  const updateMarketingLead = (leadId, updates) => {
    const lead = marketingLeads.find((l) => l.leadId === leadId || l.id === leadId);
    if (!lead) throw new Error(`Marketing Lead not found: ${leadId}`);

    const newHistory = [...(lead.statusHistory || [])];
    if (updates.status && updates.status !== lead.status) {
      newHistory.push({
        status: updates.status,
        changedBy: userProfile.fullName,
        role: userProfile.jobTitle || userRole,
        changedAt: new Date().toISOString(),
        notes: updates.statusNotes || `Status updated to ${updates.status}`,
      });
    }

    const updated = {
      ...lead,
      ...updates,
      statusHistory: newHistory,
      lastModifiedBy: userProfile.fullName,
      lastModifiedAt: new Date().toISOString(),
    };

    setMarketingLeads((prev) => prev.map((l) => (l.leadId === leadId ? updated : l)));
    return updated;
  };

  // Download Marketing Leads to CSV
  const downloadMarketingLeadsData = () => {
    if (userRole === 'junior_sales') {
      throw new Error('Unauthorized: Junior Sales Employees cannot export marketing leads');
    }
    const headers = [
      'Lead ID',
      'Marketing Ref',
      'Customer/Contact Person',
      'Company Name',
      'Mobile Number',
      'Email',
      'Location/City',
      'Interested Product/Service',
      'Requirement/Remarks',
      'Estimated Value (₹)',
      'Sent By (Marketing)',
      'Date Received',
      'Assigned Sales Employee',
      'Lead Status',
      'Linked Customer ID',
      'Pipeline Opportunity ID',
    ];

    const rows = scopedMarketingLeads.map((l) => [
      `"${l.leadId}"`,
      `"${l.marketingRecordRef || ''}"`,
      `"${(l.customerName || '').replace(/"/g, '""')}"`,
      `"${(l.companyName || '').replace(/"/g, '""')}"`,
      `"${l.mobile || ''}"`,
      `"${l.email || ''}"`,
      `"${l.location || ''}"`,
      `"${(l.interestedProduct || '').replace(/"/g, '""')}"`,
      `"${(l.requirement || '').replace(/"/g, '""')}"`,
      l.estimatedValue || 0,
      `"${(l.sentBy || '').replace(/"/g, '""')}"`,
      `"${l.dateReceived || ''}"`,
      `"${l.assignedEmployeeName || 'Unassigned'}"`,
      `"${l.status}"`,
      `"${l.linkedCustomerId || '—'}"`,
      `"${l.pipelineOpportunityId || '—'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `ApexERP_Marketing_Leads_Export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const auditEntry = {
      id: `AUD-EXPMKT-${Date.now()}`,
      action: 'Marketing Leads Export',
      user: userProfile.fullName,
      employeeId: userProfile.employeeId,
      role: userRole,
      timestamp: new Date().toISOString(),
      details: `Exported ${scopedMarketingLeads.length} marketing lead records to CSV`,
      recordsCount: scopedMarketingLeads.length,
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);

    return { success: true, count: scopedMarketingLeads.length };
  };

  // Real Integration Listener & Connection Diagnostic Status
  const getMarketingIntegrationStatus = () => {
    const endpoint = typeof process !== 'undefined' && process.env?.VITE_MARKETING_API_ENDPOINT;
    const isConnected = Boolean(endpoint);
    return {
      connected: isConnected,
      status: isConnected ? 'Connected' : 'Connection Pending Upstream Deployment',
      message: isConnected
        ? `Connected to Marketing API gateway at ${endpoint}`
        : 'Marketing Module API endpoint not yet configured (VITE_MARKETING_API_ENDPOINT). The Marketing module is being developed separately by another team member. Sales receiver is active and listening for forwarded leads.',
      salesReceiverActive: true,
      protocol: 'ApexERP Cross-Module Event Bus & Window Gateway',
      totalReceivedLeads: marketingLeads.length,
    };
  };

  // Attach cross-module integration listener for leads forwarded from Marketing
  useEffect(() => {
    const handleMarketingLeadForward = (event) => {
      if (event && event.detail) {
        try {
          receiveMarketingLead(event.detail);
        } catch (err) {
          console.error('[ApexERP Sales Integration] Failed to process incoming marketing lead:', err);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('ApexERP:MarketingLeadForwarded', handleMarketingLeadForward);
      window.addEventListener('ApexERP:ForwardMarketingLead', handleMarketingLeadForward);

      // Expose inbound receiver on window for cross-module integration
      window.ApexERP_SalesReceiver = {
        receiveMarketingLead,
        getIntegrationStatus: getMarketingIntegrationStatus,
      };
      window.ApexERP_SalesIntegration = {
        ...window.ApexERP_SalesIntegration,
        receiveMarketingLead,
        getIntegrationStatus: getMarketingIntegrationStatus,
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('ApexERP:MarketingLeadForwarded', handleMarketingLeadForward);
        window.removeEventListener('ApexERP:ForwardMarketingLead', handleMarketingLeadForward);
      }
    };
  }, [marketingLeads]);

  // -------------------------------------------------------------
  // PRODUCT & STOCK OPERATIONS
  // -------------------------------------------------------------
  const updateProduct = (id, updates) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  /**
   * Adjust product stock with reason & warehouse validation
   * Prevents stock edits from silently overwriting reserved inventory or causing negative available stock
   */
  const adjustProductStock = (productId, adjustmentQty, reason, warehouseName) => {
    const adj = Number(adjustmentQty);
    if (isNaN(adj) || adj === 0) {
      throw new Error('Please enter a valid non-zero adjustment quantity.');
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error('Please specify an audit reason for manual inventory adjustment.');
    }

    const prod = products.find((p) => p.id === productId);
    if (!prod) throw new Error('Product not found.');

    const newAvail = prod.availableQty + adj;
    if (newAvail < 0) {
      throw new Error(
        `Adjustment of ${adj} ${prod.uom} would result in negative available inventory (${newAvail} ${prod.uom}). Cannot overwrite reserved stock (${prod.reservedQty} ${prod.uom}).`
      );
    }

    const newTotal = prod.totalQty + adj;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          let updatedWarehouses = p.warehouses ? [...p.warehouses] : [];
          if (warehouseName && updatedWarehouses.length > 0) {
            updatedWarehouses = updatedWarehouses.map((w) =>
              w.name === warehouseName
                ? {
                    ...w,
                    qty: Math.max(0, w.qty + adj),
                    available: Math.max(0, (w.available || w.qty) + adj),
                  }
                : w
            );
          }

          return {
            ...p,
            totalQty: newTotal,
            availableQty: newAvail,
            warehouses: updatedWarehouses,
            status:
              newAvail <= 0
                ? 'Critical Shortage'
                : newAvail < p.minStockLevel
                ? 'Low Stock'
                : 'In Stock',
            lastAdjustmentNote: `Adjusted by ${adj > 0 ? '+' + adj : adj} ${p.uom} on ${new Date().toISOString().split('T')[0]}: ${reason}`,
          };
        }
        return p;
      })
    );
  };

  // -------------------------------------------------------------
  // QUOTATION OPERATIONS & FOUR-LEVEL APPROVAL WORKFLOW
  // -------------------------------------------------------------
  const addQuotation = (quoteData) => {
    const quotationNo = quoteData.quotationNo || generateReference('QT', quotations);
    const today = quoteData.createdDate || new Date().toISOString().split('T')[0];

    // Determine status and required approver based on exact business rules:
    // 1. Junior Sales Employee creates: Approval by either Sales Coordinator OR Sales Manager is sufficient.
    // 2. Sales Representative creates: Approval by either Sales Coordinator OR Sales Manager is sufficient.
    // 3. Sales Coordinator creates: Strictly requires Sales Manager approval.
    // 4. Sales Manager creates: No additional sales approval required (Directly Approved).
    let status = quoteData.status;
    let approvedBy = null;
    let approvedAt = null;
    let approvalReason = quoteData.approvalReason || '';
    let approvalRequiredFrom = null;

    if (quoteData.status === 'Draft') {
      status = 'Draft';
    } else {
      if (userRole === 'sales_manager') {
        status = 'Approved';
        approvedBy = `${userProfile.fullName} (Sales Manager)`;
        approvedAt = new Date().toISOString();
        approvalReason = 'Authorized upon creation under Sales Manager authority (No additional sales approval required).';
      } else if (userRole === 'sales_coordinator') {
        status = 'Pending Approval';
        approvalRequiredFrom = 'sales_manager';
        approvalReason = 'Regional coordinator quotation awaiting required authorization by Sales Manager.';
      } else if (userRole === 'junior_sales') {
        status = 'Pending Approval';
        approvalRequiredFrom = 'sales_coordinator_or_manager';
        approvalReason = 'Entry-level commercial proposal awaiting review by Sales Coordinator or Sales Manager.';
      } else {
        // Sales Representative or default
        status = 'Pending Approval';
        approvalRequiredFrom = 'sales_coordinator_or_manager';
        approvalReason = 'Commercial quotation submitted for review by Sales Coordinator or Sales Manager.';
      }
    }

    const roleLabel =
      userRole === 'junior_sales'
        ? 'Junior Sales Employee'
        : userRole === 'sales_rep'
        ? 'Sales Rep'
        : userRole === 'sales_coordinator'
        ? 'Sales Coordinator'
        : userRole === 'sales_manager'
        ? 'Sales Manager'
        : userProfile.jobTitle || 'Salesperson';
    const raisedBy = `${userProfile.fullName} (${roleLabel})`;

    const newQuote = {
      id: quotationNo,
      quotationNo,
      customerId: quoteData.customerId,
      customerName: quoteData.customerName,
      contactPerson: quoteData.contactPerson || '',
      customerPhone: quoteData.customerPhone || '',
      customerEmail: quoteData.customerEmail || '',
      customerAddress: quoteData.customerAddress || '',
      customerGstin: quoteData.customerGstin || '',
      createdDate: today,
      validUntil: quoteData.validUntil,
      validityDays: quoteData.validityDays || 15,
      paymentTerms: quoteData.paymentTerms || 'Net 30 Days',
      deliveryTerms: quoteData.deliveryTerms || 'Standard Dispatch (7-10 Days)',
      raisedBy,
      salesOwner: raisedBy,
      createdBy: userProfile.employeeId,
      createdByName: userProfile.fullName,
      createdByRole: userRole,
      status,
      approvedBy,
      approvedAt,
      approvalReason,
      approvalRequiredFrom,
      notes: quoteData.notes || '',
      items: quoteData.items || [],
      subtotal: quoteData.subtotal || 0,
      discountTotal: quoteData.discountTotal || 0,
      taxTotal: quoteData.taxTotal || 0,
      grandTotal: quoteData.grandTotal || 0,
      // Save snapshot of commercial Terms & Conditions and Bank Details for Quotation
      termsAndConditions: (quoteData.termsAndConditions || companyConfig.defaultTerms).map((t) => ({ ...t })),
      bankDetails: { ...companyConfig.bankDetails },
      downloadApprovalStatus: null,
      convertedOrderNo: null,
      revisions: [],
      auditHistory: [
        {
          action:
            status === 'Draft'
              ? 'Quotation Saved as Draft'
              : status === 'Approved'
              ? 'Quotation Created & Authorized by Sales Manager'
              : userRole === 'sales_coordinator'
              ? 'Quotation Created & Submitted for Sales Manager Approval'
              : 'Quotation Created & Submitted for Approval',
          user: userProfile.fullName,
          role: userProfile.jobTitle || userRole,
          timestamp: new Date().toISOString(),
          remarks:
            status === 'Draft'
              ? 'Quotation saved as draft.'
              : status === 'Approved'
              ? 'Direct authorization granted under Sales Manager authority (No additional sales approval required).'
              : userRole === 'sales_coordinator'
              ? 'Submitted for required review and authorization by Sales Manager.'
              : 'Submitted for review and approval by Sales Coordinator or Sales Manager.',
        },
      ],
    };

    setQuotations((prev) => [newQuote, ...prev]);

    if (status === 'Pending Approval') {
      const recipientNotice =
        userRole === 'sales_coordinator'
          ? 'Awaiting required approval from Sales Manager (Ananya Roy).'
          : 'Awaiting approval from Sales Coordinator (Sneha Patil) or Sales Manager (Ananya Roy).';

      addNotification({
        type: 'warning',
        title: `Quotation Pending Approval: ${quotationNo}`,
        message: `${userProfile.fullName} submitted quotation ${quotationNo} for ${newQuote.customerName}. ${recipientNotice}`,
        page: 'quotations',
      });
    } else if (status === 'Approved') {
      addNotification({
        type: 'success',
        title: `Quotation Authorized: ${quotationNo}`,
        message: `Quotation ${quotationNo} for ${newQuote.customerName} created and authorized under Sales Manager authority.`,
        page: 'quotations',
      });
    }

    // Record in system auditLogs
    const auditEntry = {
      id: `AUD-QTCR-${Date.now()}`,
      action: 'Quotation Created',
      user: userProfile.fullName,
      employeeId: userProfile.employeeId,
      role: userRole,
      timestamp: new Date().toISOString(),
      details: `Created quotation ${quotationNo} (${newQuote.customerName}) with status ${status}`,
      metadata: { quotationNo, status, grandTotal: newQuote.grandTotal },
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);

    return newQuote;
  };

  const updateQuotation = (id, updatedData, isResubmit = false) => {
    let updatedResult = null;
    setQuotations((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          const wasApproved = q.status === 'Approved' || q.status === 'Accepted';
          const wasRejected = q.status === 'Rejected';

          let newStatus = updatedData.status;
          let approvalRequiredFrom = q.approvalRequiredFrom;
          let approvedBy = q.approvedBy;
          let approvedAt = q.approvedAt;

          // If editing an approved quotation, preserve the previous version, create a revision, and require applicable approval again
          if (wasApproved) {
            if (userRole === 'sales_manager') {
              newStatus = 'Approved';
              approvedBy = `${userProfile.fullName} (Sales Manager)`;
              approvedAt = new Date().toISOString();
              approvalRequiredFrom = null;
            } else if (userRole === 'sales_coordinator') {
              newStatus = 'Revised—Pending Approval';
              approvalRequiredFrom = 'sales_manager';
              approvedBy = null;
              approvedAt = null;
            } else {
              // sales_rep or junior_sales
              newStatus = 'Revised—Pending Approval';
              approvalRequiredFrom = 'sales_coordinator_or_manager';
              approvedBy = null;
              approvedAt = null;
            }
          } else if (wasRejected || isResubmit) {
            if (userRole === 'sales_manager') {
              newStatus = 'Approved';
              approvedBy = `${userProfile.fullName} (Sales Manager)`;
              approvedAt = new Date().toISOString();
              approvalRequiredFrom = null;
            } else if (userRole === 'sales_coordinator') {
              newStatus = 'Pending Approval';
              approvalRequiredFrom = 'sales_manager';
            } else {
              newStatus = 'Pending Approval';
              approvalRequiredFrom = 'sales_coordinator_or_manager';
            }
          } else if (!newStatus) {
            newStatus = q.status;
          }

          // Preserve previous version snapshot in revisions array
          const revisionSnapshot = wasApproved
            ? {
                revisionNo: (q.revisions?.length || 0) + 1,
                revisedAt: new Date().toISOString(),
                revisedBy: userProfile.fullName,
                revisedByRole: userRole,
                previousStatus: q.status,
                items: q.items,
                subtotal: q.subtotal,
                discountTotal: q.discountTotal,
                taxTotal: q.taxTotal,
                grandTotal: q.grandTotal,
                paymentTerms: q.paymentTerms,
                deliveryTerms: q.deliveryTerms,
                approvedBy: q.approvedBy,
                approvedAt: q.approvedAt,
              }
            : null;

          const historyEntry = {
            action: wasApproved
              ? 'Quotation Revised from Approved Version'
              : wasRejected || isResubmit
              ? 'Quotation Revised & Resubmitted for Approval'
              : newStatus === 'Pending Approval' || newStatus === 'Revised—Pending Approval'
              ? 'Quotation Submitted for Approval'
              : 'Quotation Updated',
            user: userProfile.fullName,
            role: userProfile.jobTitle || userRole,
            timestamp: new Date().toISOString(),
            remarks: wasApproved
              ? `Approved quotation revised by ${userProfile.fullName}. Previous approved version archived in revision history. Required approval: ${approvalRequiredFrom || 'Auto-authorized'}.`
              : wasRejected || isResubmit
              ? `Corrected and resubmitted after rejection: ${q.rejectionReason || 'Terms revised.'}`
              : 'Quotation details modified.',
            revisionSnapshot: revisionSnapshot || undefined,
          };

          const updated = {
            ...q,
            ...updatedData,
            // Ensure original creator remains unchanged when another person approves or edits it:
            createdBy: q.createdBy,
            createdByName: q.createdByName,
            createdByRole: q.createdByRole,
            raisedBy: q.raisedBy || q.salesOwner || `${q.createdByName || 'Salesperson'} (${q.createdByRole === 'sales_coordinator' ? 'Sales Coordinator' : q.createdByRole === 'sales_manager' ? 'Sales Manager' : q.createdByRole === 'junior_sales' ? 'Junior Sales Employee' : 'Sales Rep'})`,
            salesOwner: q.salesOwner || q.raisedBy,
            status: newStatus,
            approvalRequiredFrom,
            approvedBy,
            approvedAt,
            rejectionReason: isResubmit ? null : (updatedData.rejectionReason ?? q.rejectionReason),
            revisions: revisionSnapshot ? [revisionSnapshot, ...(q.revisions || [])] : (q.revisions || []),
            auditHistory: [historyEntry, ...(q.auditHistory || [])],
          };

          updatedResult = updated;
          return updated;
        }
        return q;
      })
    );

    if (updatedResult?.status === 'Pending Approval' || updatedResult?.status === 'Revised—Pending Approval') {
      addNotification({
        type: 'warning',
        title: `Quotation Resubmitted: ${id}`,
        message: `${userProfile.fullName} submitted revised quotation ${id} for authorization (${updatedResult.status}).`,
        page: 'quotations',
      });
    }

    // Record in system auditLogs
    const auditEntry = {
      id: `AUD-QTUPD-${Date.now()}`,
      action: 'Quotation Updated',
      user: userProfile.fullName,
      employeeId: userProfile.employeeId,
      role: userRole,
      timestamp: new Date().toISOString(),
      details: `Updated quotation ${id}. New status: ${updatedResult?.status || 'Unknown'}`,
      metadata: { quotationNo: id, status: updatedResult?.status },
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);

    return updatedResult;
  };

  const updateQuotationStatus = (id, newStatus, reason = '') => {
    setQuotations((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          return {
            ...q,
            status: newStatus,
            approvalReason: reason || q.approvalReason,
          };
        }
        return q;
      })
    );
  };

  const requestQuotationApproval = (id) => {
    const quote = quotations.find((q) => q.id === id);
    if (!quote) throw new Error('Quotation not found');

    const approvalRequiredFrom =
      quote.createdByRole === 'sales_coordinator' ? 'sales_manager' : 'sales_coordinator_or_manager';

    const historyEntry = {
      action: 'Quotation Submitted for Approval',
      user: userProfile.fullName,
      role: userProfile.jobTitle || 'Sales Representative',
      timestamp: new Date().toISOString(),
      remarks:
        approvalRequiredFrom === 'sales_manager'
          ? 'Submitted for required approval by Sales Manager.'
          : 'Submitted for approval by Sales Coordinator or Sales Manager.',
    };

    setQuotations((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              status: 'Pending Approval',
              approvalRequiredFrom,
              auditHistory: [historyEntry, ...(q.auditHistory || [])],
            }
          : q
      )
    );

    addNotification({
      type: 'warning',
      title: `Quotation Pending Approval: ${quote.quotationNo}`,
      message: `${userProfile.fullName} submitted quotation ${quote.quotationNo} for ${quote.customerName} for authorization.`,
      page: 'quotations',
    });
  };

  const approveQuotation = (id, remarks = '') => {
    const quote = quotations.find((q) => q.id === id || q.quotationNo === id);
    if (!quote) throw new Error('Quotation not found');

    // 1. Quotation must be awaiting approval
    if (quote.status !== 'Pending Approval' && quote.status !== 'Revised—Pending Approval' && quote.status !== 'Awaiting Approval') {
      throw new Error(`Quotation ${quote.quotationNo} is currently "${quote.status}" and cannot be approved.`);
    }

    // 2. A salesperson must not be able to approve their own quotation request
    const isSelfDecision =
      quote.createdBy === userProfile.employeeId ||
      quote.createdByName === userProfile.fullName;

    if (isSelfDecision) {
      throw new Error('Compliance Violation: Employees are not permitted to approve their own quotation requests.');
    }

    // 3. Junior Sales Employees and Sales Representatives cannot approve quotation requests
    if (userRole === 'junior_sales' || userRole === 'sales_rep') {
      throw new Error('Unauthorized Access: Field sales employees are not authorized to approve quotations. Approval by Sales Coordinator or Sales Manager is required.');
    }

    // 4. Exact Four-Level Approval Hierarchy:
    // - Quotation created by Junior Sales Employee: Either Sales Coordinator OR Sales Manager can approve.
    // - Quotation created by Sales Representative: Either Sales Coordinator OR Sales Manager can approve.
    // - Quotation created by Sales Coordinator: Strictly requires Sales Manager approval.
    // - Quotation created by Sales Manager: Requires no additional sales approval.
    const isCoordinatorQuote =
      quote.createdByRole === 'sales_coordinator' ||
      quote.raisedBy?.includes('Sales Coordinator') ||
      quote.salesOwner?.includes('Sales Coordinator') ||
      quote.createdBy === 'APX-EMP-3044';

    if (isCoordinatorQuote) {
      if (userRole !== 'sales_manager' && userRole !== 'admin') {
        throw new Error('Approval Rule Violation: Quotations created by the Sales Coordinator strictly require approval from the Sales Manager.');
      }
    } else {
      // Created by Sales Rep or Junior Sales Employee
      if (userRole !== 'sales_manager' && userRole !== 'sales_coordinator' && userRole !== 'admin') {
        throw new Error('Approval Rule Violation: Quotations created by Sales Representatives or Junior Sales Employees require approval by either the Sales Manager or Sales Coordinator.');
      }
    }

    const approverRoleTitle =
      userRole === 'sales_coordinator'
        ? 'Sales Coordinator'
        : userRole === 'sales_manager'
        ? 'Sales Manager'
        : 'Administrator';
    const approvedByString = `${userProfile.fullName} (${approverRoleTitle})`;
    const approvedAt = new Date().toISOString();

    const historyEntry = {
      action: 'Quotation Approved',
      user: userProfile.fullName,
      role: approverRoleTitle,
      timestamp: approvedAt,
      remarks: remarks || `Quotation approved by ${approverRoleTitle}.`,
    };

    setQuotations((prev) =>
      prev.map((q) =>
        (q.id === id || q.quotationNo === id)
          ? {
              ...q,
              status: 'Approved',
              approvedBy: approvedByString,
              approvedAt,
              approvalReason: remarks || q.approvalReason,
              approvalRequiredFrom: null,
              rejectionReason: null,
              rejectedBy: null,
              rejectedAt: null,
              auditHistory: [historyEntry, ...(q.auditHistory || [])],
            }
          : q
      )
    );

    addNotification({
      type: 'success',
      title: `Quotation Approved: ${quote.quotationNo}`,
      message: `Quotation ${quote.quotationNo} for ${quote.customerName} has been approved by ${approvedByString}.`,
      page: 'quotations',
    });

    // Record in system auditLogs
    const auditEntry = {
      id: `AUD-QTAPP-${Date.now()}`,
      action: 'Quotation Approved',
      user: userProfile.fullName,
      employeeId: userProfile.employeeId,
      role: userRole,
      timestamp: approvedAt,
      details: `Approved quotation ${quote.quotationNo} (${quote.customerName})`,
      metadata: { quotationNo: quote.quotationNo, approver: approvedByString },
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);
  };

  const rejectQuotation = (id, reason) => {
    const quote = quotations.find((q) => q.id === id || q.quotationNo === id);
    if (!quote) throw new Error('Quotation not found');

    if (quote.status !== 'Pending Approval' && quote.status !== 'Revised—Pending Approval' && quote.status !== 'Awaiting Approval') {
      throw new Error(`Quotation ${quote.quotationNo} is currently "${quote.status}" and cannot be rejected.`);
    }

    const isSelfDecision =
      quote.createdBy === userProfile.employeeId ||
      quote.createdByName === userProfile.fullName;

    if (isSelfDecision) {
      throw new Error('Compliance Violation: Employees are not permitted to reject their own quotations.');
    }

    if (userRole === 'junior_sales' || userRole === 'sales_rep') {
      throw new Error('Unauthorized Access: Field sales employees are not authorized to reject quotation requests.');
    }

    const isCoordinatorQuote =
      quote.createdByRole === 'sales_coordinator' ||
      quote.raisedBy?.includes('Sales Coordinator') ||
      quote.salesOwner?.includes('Sales Coordinator') ||
      quote.createdBy === 'APX-EMP-3044';

    if (isCoordinatorQuote && userRole !== 'sales_manager' && userRole !== 'admin') {
      throw new Error('Approval Rule Violation: Quotations created by the Sales Coordinator strictly require evaluation from the Sales Manager.');
    }

    if (!isCoordinatorQuote && userRole !== 'sales_manager' && userRole !== 'sales_coordinator' && userRole !== 'admin') {
      throw new Error('Approval Rule Violation: Quotations created by Sales Representatives or Junior Sales Employees can only be evaluated by either the Sales Manager or Sales Coordinator.');
    }

    const rejecterRoleTitle =
      userRole === 'sales_coordinator'
        ? 'Sales Coordinator'
        : userRole === 'sales_manager'
        ? 'Sales Manager'
        : 'Administrator';
    const rejectedByString = `${userProfile.fullName} (${rejecterRoleTitle})`;
    const rejectedAt = new Date().toISOString();

    const historyEntry = {
      action: 'Quotation Rejected',
      user: userProfile.fullName,
      role: rejecterRoleTitle,
      timestamp: rejectedAt,
      remarks: reason || 'Commercial terms or discount rate not approved.',
    };

    setQuotations((prev) =>
      prev.map((q) =>
        (q.id === id || q.quotationNo === id)
          ? {
              ...q,
              status: 'Rejected',
              rejectedBy: rejectedByString,
              rejectedAt,
              rejectionReason: reason,
              approvalRequiredFrom: null,
              auditHistory: [historyEntry, ...(q.auditHistory || [])],
            }
          : q
      )
    );

    addNotification({
      type: 'danger',
      title: `Quotation Rejected: ${quote.quotationNo}`,
      message: `Quotation ${quote.quotationNo} was rejected by ${rejectedByString}: ${reason}`,
      page: 'quotations',
    });

    // Record in system auditLogs
    const auditEntry = {
      id: `AUD-QTREJ-${Date.now()}`,
      action: 'Quotation Rejected',
      user: userProfile.fullName,
      employeeId: userProfile.employeeId,
      role: userRole,
      timestamp: rejectedAt,
      details: `Rejected quotation ${quote.quotationNo}: ${reason}`,
      metadata: { quotationNo: quote.quotationNo, rejecter: rejectedByString, reason },
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);
  };

  // Download Formal Quotation PDF (Accessible to all authorized Sales roles for approved quotations)
  const downloadQuotationPDF = (quoteId) => {
    const quote = quotations.find((q) => q.id === quoteId || q.quotationNo === quoteId);
    if (!quote) throw new Error('Quotation not found');

    if (quote.status !== 'Approved' && quote.status !== 'Accepted') {
      throw new Error('Quotation must be in Approved status before formal proposal PDF download is permitted.');
    }

    try {
      downloadQuotationDocument(quote, { bypassSecurityCheck: true, companyConfig });
    } catch (err) {
      throw new Error(`PDF generation failed: ${err.message}`);
    }

    // Log authorized download into quotation auditHistory
    const auditEntry = {
      action: 'Formal Quotation PDF Downloaded',
      user: userProfile.fullName,
      role: userProfile.jobTitle || userRole,
      timestamp: new Date().toISOString(),
      remarks: `Formal company quotation PDF generated and downloaded for ${quote.customerName} by ${userProfile.fullName} (${userRole}).`,
    };

    setQuotations((prev) =>
      prev.map((q) => (q.id === quote.id ? { ...q, auditHistory: [auditEntry, ...(q.auditHistory || [])] } : q))
    );

    // Record in system auditLogs
    setAuditLogs((prev) => [
      {
        id: `AUD-QTDL-${Date.now()}`,
        action: 'Quotation PDF Download',
        user: userProfile.fullName,
        employeeId: userProfile.employeeId,
        role: userRole,
        timestamp: new Date().toISOString(),
        details: `Downloaded formal PDF for quotation ${quote.quotationNo} (${quote.customerName})`,
        metadata: { quotationNo: quote.quotationNo, customerId: quote.customerId },
      },
      ...prev,
    ]);

    return { success: true };
  };

  // Email Quotation Proposal to Client Workflow
  const sendQuotationEmail = async ({ quotationId, to, cc, subject, message }) => {
    const quote = quotations.find((q) => q.id === quotationId || q.quotationNo === quotationId);
    if (!quote) throw new Error('Quotation record not found');
    if (quote.status !== 'Approved' && quote.status !== 'Accepted') {
      throw new Error('Only approved quotations can be emailed to clients.');
    }
    if (!to || !to.trim()) {
      throw new Error('Recipient email address (To) is required.');
    }

    const emailPayload = {
      from: emailConfig.fromEmail,
      fromName: emailConfig.fromName,
      to: to.trim(),
      cc: Array.isArray(cc) ? cc : String(cc || '').split(/[,;]+/).map((s) => s.trim()).filter(Boolean),
      subject: subject.trim(),
      body: message.trim(),
      attachment: {
        filename: `${quote.quotationNo}_Commercial_Proposal.pdf`,
        contentType: 'application/pdf',
        quotationNo: quote.quotationNo,
      },
      sentBy: userProfile.fullName,
      sentAt: new Date().toISOString(),
    };

    // Check if external email transport service endpoint is configured
    const endpoint = emailConfig.apiEndpoint || (typeof process !== 'undefined' && process.env?.VITE_EMAIL_API_ENDPOINT);
    if (endpoint) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailPayload),
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Email gateway error (${response.status}): ${errText}`);
        }
      } catch (err) {
        throw new Error(`Failed to transmit email via configured gateway: ${err.message}`);
      }
    } else {
      // Missing email transport integration
      // Per instructions: "If email credentials, sender configuration, attachment support, or integration is missing, clearly report what needs configuration rather than simulating a successful send."
      const diagnosticError = new Error(
        'Email Service Configuration Required: No external SMTP gateway or mail API endpoint is configured (VITE_EMAIL_API_ENDPOINT or SMTP credentials). ' +
        `The quotation email draft and PDF attachment (${quote.quotationNo}_Commercial_Proposal.pdf) have been compiled. ` +
        'Please configure VITE_EMAIL_API_ENDPOINT or SMTP settings in your environment to enable automated dispatch, or use the local mail client option.'
      );
      diagnosticError.isConfigMissing = true;
      diagnosticError.emailPayload = emailPayload;

      // Log attempt in auditLogs
      setAuditLogs((prev) => [
        {
          id: `AUD-EMLAT-${Date.now()}`,
          action: 'Quotation Email Drafted (Transport Unconfigured)',
          user: userProfile.fullName,
          employeeId: userProfile.employeeId,
          role: userRole,
          timestamp: new Date().toISOString(),
          details: `Drafted quotation email for ${quote.quotationNo} to ${to}. Gateway unconfigured.`,
          metadata: { quotationNo: quote.quotationNo, to },
        },
        ...prev,
      ]);

      throw diagnosticError;
    }

    // If sent successfully via configured gateway:
    const historyEntry = {
      action: 'Quotation Emailed to Client',
      user: userProfile.fullName,
      role: userProfile.jobTitle || userRole,
      timestamp: new Date().toISOString(),
      remarks: `Quotation PDF transmitted to ${to} (CC: ${(emailPayload.cc || []).join(', ')}) via configured sender account ${emailConfig.fromEmail}.`,
    };

    setQuotations((prev) =>
      prev.map((q) => (q.id === quote.id ? { ...q, emailedAt: new Date().toISOString(), auditHistory: [historyEntry, ...(q.auditHistory || [])] } : q))
    );

    addNotification({
      type: 'success',
      title: `Quotation Emailed: ${quote.quotationNo}`,
      message: `Quotation proposal successfully sent to ${to}.`,
      page: 'quotations',
    });

    setAuditLogs((prev) => [
      {
        id: `AUD-EML-${Date.now()}`,
        action: 'Quotation Emailed',
        user: userProfile.fullName,
        employeeId: userProfile.employeeId,
        role: userRole,
        timestamp: new Date().toISOString(),
        details: `Sent quotation email ${quote.quotationNo} to ${to}`,
        metadata: { quotationNo: quote.quotationNo, to },
      },
      ...prev,
    ]);

    return { success: true, payload: emailPayload };
  };

  // -------------------------------------------------------------
  // REGIONAL OPERATIONS & TASK SCHEDULING (Section 3)
  // Distributed by Sales Coordinator to Reps and Junior Sales Employees
  // -------------------------------------------------------------
  const assignActivity = (activityData) => {
    if (!activityData.customerId) throw new Error('Customer ID is required.');
    if (!activityData.assignedEmployeeId) throw new Error('Please select an employee to assign this activity.');
    if (!activityData.scheduledDate) throw new Error('Scheduled date is required.');

    // Duplicate check: Same customer, employee, date, and activity type
    const isDuplicate = activities.some(
      (a) =>
        a.customerId === activityData.customerId &&
        a.assignedEmployeeId === activityData.assignedEmployeeId &&
        a.scheduledDate === activityData.scheduledDate &&
        a.activityType === activityData.activityType &&
        a.status !== 'Cancelled'
    );
    if (isDuplicate) {
      throw new Error(`Duplicate Assignment Prevented: An active ${activityData.activityType} is already assigned to this employee for this customer on ${activityData.scheduledDate}.`);
    }

    const activityId = activityData.activityId || generateReference('ACT', activities);
    const assignedByRole =
      userRole === 'sales_coordinator'
        ? 'Sales Coordinator'
        : userRole === 'sales_manager'
        ? 'Sales Manager'
        : 'Operations Lead';
    const assignedByStr = `${userProfile.fullName} (${assignedByRole})`;
    const assignedAt = new Date().toISOString();

    const newActivity = {
      id: activityId,
      activityId,
      customerId: activityData.customerId,
      customerDisplayId: activityData.customerDisplayId || activityData.customerId,
      customerName: activityData.customerName || 'Customer Account',
      contactPerson: activityData.contactPerson || '',
      contactPhone: activityData.contactPhone || '',
      contactEmail: activityData.contactEmail || '',
      customerAddress: activityData.customerAddress || '',
      territoryId: activityData.territoryId || 'TERR-HYD-A',
      territoryName: activityData.territoryName || 'Distributor Territory A',
      regionId: activityData.regionId || 'REG-HYD',
      assignedEmployeeId: activityData.assignedEmployeeId,
      assignedEmployeeName: activityData.assignedEmployeeName,
      assignedEmployeeRole: activityData.assignedEmployeeRole || 'sales_rep',
      activityType: activityData.activityType || 'Customer Visit',
      scheduledDate: activityData.scheduledDate,
      scheduledTime: activityData.scheduledTime || '10:00 AM',
      dueDate: activityData.dueDate || activityData.scheduledDate,
      priority: activityData.priority || 'Medium',
      purpose: activityData.purpose || '',
      instructions: activityData.instructions || '',
      status: 'Pending',
      outcomeRemarks: '',
      nextFollowUpDate: null,
      assignedBy: assignedByStr,
      assignedAt,
      history: [
        {
          action: 'Activity Assigned by Coordinator',
          user: userProfile.fullName,
          role: assignedByRole,
          timestamp: assignedAt,
          remarks: `Assigned ${activityData.activityType} to ${activityData.assignedEmployeeName}.`,
        },
      ],
    };

    setActivities((prev) => [newActivity, ...prev]);

    // Send notification to the assigned employee
    addNotification({
      type: 'info',
      title: `New Activity Assigned: ${newActivity.activityType}`,
      message: `${assignedByStr} assigned you a ${newActivity.activityType} for ${newActivity.customerName} on ${newActivity.scheduledDate} at ${newActivity.scheduledTime}.`,
      page: 'team-schedule',
    });

    // Record in system auditLogs
    setAuditLogs((prev) => [
      {
        id: `AUD-ACTCR-${Date.now()}`,
        action: 'Field Activity Assigned',
        user: userProfile.fullName,
        employeeId: userProfile.employeeId,
        role: userRole,
        timestamp: assignedAt,
        details: `Assigned ${newActivity.activityType} (${newActivity.customerName}) to ${newActivity.assignedEmployeeName}`,
        metadata: { activityId, employeeId: newActivity.assignedEmployeeId },
      },
      ...prev,
    ]);

    return newActivity;
  };

  const updateActivity = (activityId, updates) => {
    let updatedResult = null;
    setActivities((prev) =>
      prev.map((a) => {
        if (a.id === activityId || a.activityId === activityId) {
          const historyEntry = {
            action: 'Activity Details Updated',
            user: userProfile.fullName,
            role: userProfile.jobTitle || userRole,
            timestamp: new Date().toISOString(),
            remarks: updates.rescheduleReason || 'Activity parameters updated.',
          };
          const updated = {
            ...a,
            ...updates,
            history: [historyEntry, ...(a.history || [])],
          };
          updatedResult = updated;
          return updated;
        }
        return a;
      })
    );
    return updatedResult;
  };

  const updateActivityProgress = (activityId, progressData) => {
    let updatedResult = null;
    const nowIso = new Date().toISOString();
    setActivities((prev) =>
      prev.map((a) => {
        if (a.id === activityId || a.activityId === activityId) {
          const isRescheduled = progressData.status === 'Rescheduled' || progressData.status === 'Postponed';
          const origDate = a.originalScheduledDate || a.scheduledDate;
          const origTime = a.originalScheduledTime || a.scheduledTime;
          const historyEntry = {
            action: `Status Updated: ${progressData.status || a.status}`,
            user: userProfile.fullName,
            role: userProfile.jobTitle || userRole,
            timestamp: nowIso,
            remarks: progressData.outcomeRemarks || `Status marked as ${progressData.status}`,
            originalScheduledDate: origDate,
            originalScheduledTime: origTime,
            rescheduledDate: isRescheduled ? progressData.scheduledDate : undefined,
            rescheduledTime: isRescheduled ? progressData.scheduledTime : undefined,
          };
          const updated = {
            ...a,
            status: progressData.status || a.status,
            outcomeRemarks: progressData.outcomeRemarks !== undefined ? progressData.outcomeRemarks : a.outcomeRemarks,
            nextFollowUpDate: progressData.nextFollowUpDate !== undefined ? progressData.nextFollowUpDate : a.nextFollowUpDate,
            originalScheduledDate: origDate,
            originalScheduledTime: origTime,
            postponedFrom: isRescheduled ? origDate : a.postponedFrom,
            postponedReason: isRescheduled ? (progressData.outcomeRemarks || a.postponedReason) : a.postponedReason,
            scheduledDate: isRescheduled && progressData.scheduledDate ? progressData.scheduledDate : a.scheduledDate,
            scheduledTime: isRescheduled && progressData.scheduledTime ? progressData.scheduledTime : a.scheduledTime,
            completedAt: progressData.status === 'Completed' ? nowIso : a.completedAt,
            history: [historyEntry, ...(a.history || [])],
          };
          updatedResult = updated;
          return updated;
        }
        return a;
      })
    );

    // Notify Coordinator / Manager
    if (updatedResult) {
      addNotification({
        type: updatedResult.status === 'Completed' ? 'success' : 'info',
        title: `Field Visit Update: ${updatedResult.customerName}`,
        message: `${userProfile.fullName} updated ${updatedResult.activityType} status to "${updatedResult.status}". Outcome: ${updatedResult.outcomeRemarks || 'Progress submitted.'}`,
        page: 'team-schedule',
      });
    }

    return updatedResult;
  };

  const deleteActivity = (activityId) => {
    setActivities((prev) => prev.filter((a) => a.id !== activityId && a.activityId !== activityId));
  };

  const updateCompanyConfig = (newConfig) => {
    setCompanyConfig((prev) => ({
      ...prev,
      ...newConfig,
    }));
  };

  // Separate Download Approval Workflow (Admin ONLY)
  const requestDownloadApproval = (id) => {
    const quote = quotations.find((q) => q.id === id);
    if (!quote) throw new Error('Quotation not found');
    if (quote.status !== 'Approved' && quote.status !== 'Accepted') {
      throw new Error('Only approved quotations can be requested for download.');
    }
    if (quote.downloadApprovalStatus === 'Pending Admin Approval') {
      throw new Error('A download request is already pending Admin approval.');
    }

    const requestedAt = new Date().toISOString();
    const historyEntry = {
      action: 'Download Approval Requested',
      user: userProfile.fullName,
      role: userProfile.jobTitle || 'Sales Representative',
      timestamp: requestedAt,
      remarks: 'Sales representative submitted formal request for Admin download approval.',
    };

    setQuotations((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              downloadApprovalStatus: 'Pending Admin Approval',
              downloadRequestedBy: userProfile.fullName,
              downloadRequestedAt: requestedAt,
              downloadRejectedReason: null,
              auditHistory: [historyEntry, ...(q.auditHistory || [])],
            }
          : q
      )
    );

    addNotification({
      type: 'warning',
      title: `Download Approval Requested: ${quote.quotationNo}`,
      message: `${userProfile.fullName} requested Admin permission to download quotation ${quote.quotationNo} for ${quote.customerName}.`,
      page: 'quotations',
    });
  };

  const approveDownload = (id, remarks = '') => {
    if (userRole !== 'admin' && userRole !== 'sales_manager') {
      throw new Error('Only authorized Administrators can approve quotation downloads. Finance approval is not authorized.');
    }
    const quote = quotations.find((q) => q.id === id);
    if (!quote) throw new Error('Quotation not found');

    const approvedAt = new Date().toISOString();
    const historyEntry = {
      action: 'Download Approved by Admin',
      user: userProfile.fullName,
      role: 'Administrator',
      timestamp: approvedAt,
      remarks: remarks || 'Admin authorization granted to download formal quotation.',
    };

    setQuotations((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              downloadApprovalStatus: 'Approved',
              downloadApprovedBy: `${userProfile.fullName} (Admin)`,
              downloadApprovedAt: approvedAt,
              downloadRejectedReason: null,
              auditHistory: [historyEntry, ...(q.auditHistory || [])],
            }
          : q
      )
    );

    addNotification({
      type: 'success',
      title: `Quotation Download Approved: ${quote.quotationNo}`,
      message: `Administrator ${userProfile.fullName} approved download for quotation ${quote.quotationNo}. You may now download the document.`,
      page: 'quotations',
    });
  };

  const rejectDownload = (id, reason) => {
    if (userRole !== 'admin' && userRole !== 'sales_manager') {
      throw new Error('Only authorized Administrators can review quotation download requests.');
    }
    const quote = quotations.find((q) => q.id === id);
    if (!quote) throw new Error('Quotation not found');

    const rejectedAt = new Date().toISOString();
    const historyEntry = {
      action: 'Download Rejected by Admin',
      user: userProfile.fullName,
      role: 'Administrator',
      timestamp: rejectedAt,
      remarks: reason,
    };

    setQuotations((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              downloadApprovalStatus: 'Rejected',
              downloadRejectedReason: reason,
              downloadRejectedBy: `${userProfile.fullName} (Admin)`,
              downloadRejectedAt: rejectedAt,
              auditHistory: [historyEntry, ...(q.auditHistory || [])],
            }
          : q
      )
    );

    addNotification({
      type: 'danger',
      title: `Quotation Download Rejected: ${quote.quotationNo}`,
      message: `Administrator ${userProfile.fullName} rejected download for quotation ${quote.quotationNo}: ${reason}`,
      page: 'quotations',
    });
  };

  const triggerAutoSalesOrderForInvoice = (inv, paymentMethod = 'Bank Transfer / NEFT') => {
    if (!inv || !inv.quotationNo) return null;

    // Check if order already exists for this quotation or invoice to prevent duplicates
    const existingOrder = orders.find(
      (o) => (o.quotationNo && o.quotationNo === inv.quotationNo) || (inv.orderNo && o.orderNo === inv.orderNo)
    );
    if (existingOrder) {
      if (!inv.orderNo) {
        setInvoices((prev) =>
          prev.map((i) => (i.invoiceNo === inv.invoiceNo ? { ...i, orderNo: existingOrder.orderNo } : i))
        );
      }
      return existingOrder;
    }

    const quote = quotations.find((q) => q.quotationNo === inv.quotationNo || q.id === inv.quotationNo);
    if (!quote) return null;

    // Do not generate Sales Orders from draft, rejected, or unfinalized quotations
    if (quote.status !== 'Approved' && quote.status !== 'Accepted' && quote.status !== 'Converted') {
      console.warn(`Cannot auto-generate Sales Order for quotation ${quote.quotationNo} with status ${quote.status}`);
      return null;
    }

    const orderNo = generateReference('SO', orders);
    const today = new Date().toISOString().split('T')[0];
    const deliveryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let totalOrderedQty = 0;
    const orderItems = (quote.items || []).map((item) => {
      const q = Number(item.qty || 0);
      totalOrderedQty += q;
      return {
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        orderedQty: q,
        reservedQty: 0,
        dispatchedQty: 0,
        taxRate: item.taxRate,
        lineTotal: item.lineTotal,
      };
    });

    const newOrder = {
      id: orderNo,
      orderNo: orderNo,
      quotationNo: quote.quotationNo,
      invoiceNo: inv.invoiceNo,
      customerId: quote.customerId,
      customerName: quote.customerName,
      customerType: quote.customerType || 'Customer',
      orderDate: today,
      requiredDeliveryDate: deliveryDate,
      fulfilmentStatus: 'Confirmed',
      paymentStatus: 'Paid',
      paymentMethod: paymentMethod,
      totalAmount: quote.grandTotal,
      amountPaid: quote.grandTotal,
      pendingBalance: 0,
      orderedQtyTotal: totalOrderedQty,
      reservedQtyTotal: 0,
      missingQtyTotal: totalOrderedQty,
      items: orderItems,
      notes: `Automatically generated from finalized Quotation ${quote.quotationNo} upon payment completion of Invoice ${inv.invoiceNo}.`,
      stockCheckNote: 'Order auto-created upon payment confirmation. Ready for warehouse inventory reservation.',
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Update invoice orderNo
    setInvoices((prev) =>
      prev.map((i) => (i.invoiceNo === inv.invoiceNo ? { ...i, orderNo: orderNo } : i))
    );

    // Update quotation converted status and order reference
    setQuotations((prev) =>
      prev.map((q) =>
        q.quotationNo === quote.quotationNo
          ? { ...q, status: 'Converted', convertedOrderNo: orderNo }
          : q
      )
    );

    // Update customer last order date
    updateCustomer(quote.customerId, {
      lastOrderDate: today,
      isNew: false,
    });

    addNotification({
      type: 'success',
      title: `Automatic Sales Order Created: ${orderNo}`,
      message: `Full payment received on Invoice ${inv.invoiceNo}. Sales Order ${orderNo} generated for Quotation ${quote.quotationNo} (${quote.customerName}).`,
      page: 'orders',
    });

    return newOrder;
  };

  const convertQuotationToOrder = (quotationId) => {
    const quote = quotations.find((q) => q.id === quotationId || q.quotationNo === quotationId);
    if (!quote) throw new Error('Quotation not found');
    if (quote.status !== 'Accepted' && quote.status !== 'Approved') {
      throw new Error('Only Approved or Accepted quotations can be converted to a Sales Order');
    }

    const existingOrder = orders.find(
      (o) => o.quotationNo === quote.quotationNo || (quote.convertedOrderNo && o.orderNo === quote.convertedOrderNo)
    );
    if (existingOrder) {
      throw new Error(`Quotation ${quote.quotationNo} is already linked to Sales Order ${existingOrder.orderNo}`);
    }

    let linkedInv = invoices.find((i) => i.quotationNo === quote.quotationNo);
    const orderNo = generateReference('SO', orders);
    const today = new Date().toISOString().split('T')[0];
    const deliveryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (!linkedInv) {
      const invNo = generateReference('INV', invoices);
      linkedInv = {
        id: invNo,
        invoiceNo: invNo,
        quotationNo: quote.quotationNo,
        orderNo: orderNo,
        customerId: quote.customerId,
        customerName: quote.customerName,
        invoiceDate: today,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        totalAmount: quote.grandTotal,
        paidAmount: 0,
        balance: quote.grandTotal,
        status: 'Issued',
        taxBreakdown: {
          cgst: Math.round(Number(quote.taxTotal || 0) / 2),
          sgst: Number(quote.taxTotal || 0) - Math.round(Number(quote.taxTotal || 0) / 2),
          igst: 0,
        },
        items: (quote.items || []).map((it) => ({
          productId: it.productId,
          productName: it.productName,
          unitPrice: it.unitPrice,
          qty: it.qty,
          taxRate: it.taxRate,
          lineTotal: it.lineTotal,
        })),
        notes: `Tax Invoice linked to Sales Order ${orderNo} from Quotation ${quote.quotationNo}.`,
      };
      setInvoices((prev) => [linkedInv, ...prev]);
    } else {
      setInvoices((prev) =>
        prev.map((i) => (i.invoiceNo === linkedInv.invoiceNo ? { ...i, orderNo: orderNo } : i))
      );
    }

    let totalOrderedQty = 0;
    const orderItems = quote.items.map((item) => {
      totalOrderedQty += Number(item.qty || 0);
      return {
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        orderedQty: Number(item.qty || 0),
        reservedQty: 0,
        dispatchedQty: 0,
        taxRate: item.taxRate,
        lineTotal: item.lineTotal,
      };
    });

    const isPaid = linkedInv.status === 'Paid' || linkedInv.balance <= 0;
    const paidAmount = isPaid ? quote.grandTotal : (linkedInv.paidAmount || 0);
    const pendingBalance = Math.max(0, quote.grandTotal - paidAmount);

    const newOrder = {
      id: orderNo,
      orderNo: orderNo,
      quotationNo: quote.quotationNo,
      invoiceNo: linkedInv.invoiceNo,
      customerId: quote.customerId,
      customerName: quote.customerName,
      customerType: quote.customerType || 'Customer',
      orderDate: today,
      requiredDeliveryDate: deliveryDate,
      fulfilmentStatus: 'Confirmed',
      paymentStatus: isPaid ? 'Paid' : paidAmount > 0 ? 'Partially Paid' : 'Unpaid',
      paymentMethod: 'Bank Transfer / NEFT',
      totalAmount: quote.grandTotal,
      amountPaid: paidAmount,
      pendingBalance: pendingBalance,
      orderedQtyTotal: totalOrderedQty,
      reservedQtyTotal: 0,
      missingQtyTotal: totalOrderedQty,
      items: orderItems,
      stockCheckNote: 'Order created from quotation. Click "Check & Reserve Stock" to verify warehouse availability.',
    };

    setQuotations((prev) =>
      prev.map((q) =>
        q.id === quote.id ? { ...q, status: 'Converted', convertedOrderNo: orderNo } : q
      )
    );

    setOrders((prev) => [newOrder, ...prev]);
    updateCustomer(quote.customerId, { lastOrderDate: today, isNew: false });

    return newOrder;
  };

  // -------------------------------------------------------------
  // SALES ORDER OPERATIONS
  // -------------------------------------------------------------
  const addSalesOrder = (orderData) => {
    const orderNo = generateReference('SO');
    const today = new Date().toISOString().split('T')[0];

    const newOrder = {
      id: orderNo,
      orderNo: orderNo,
      quotationNo: orderData.quotationNo || null,
      customerId: orderData.customerId,
      customerName: orderData.customerName,
      customerType: orderData.customerType || 'Distributor/Dealer',
      orderDate: orderData.orderDate || today,
      requiredDeliveryDate: orderData.requiredDeliveryDate,
      fulfilmentStatus: orderData.fulfilmentStatus || 'Confirmed',
      paymentStatus: 'Unpaid',
      paymentMethod: orderData.paymentMethod || 'Bank Transfer / NEFT',
      totalAmount: Number(orderData.totalAmount),
      orderedQtyTotal: Number(orderData.orderedQtyTotal),
      reservedQtyTotal: Number(orderData.reservedQtyTotal || 0),
      missingQtyTotal: Number(orderData.missingQtyTotal || 0),
      items: orderData.items,
      notes: orderData.notes || '',
      stockCheckNote: orderData.stockCheckNote || 'New sales order registered.',
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Update customer lastOrderDate and mark as active
    updateCustomer(orderData.customerId, {
      lastOrderDate: today,
      isNew: false,
      totalOrders: (customers.find((c) => c.id === orderData.customerId)?.totalOrders || 0) + 1,
    });

    return newOrder;
  };

  const updateSalesOrder = (orderId, updates) => {
    const isSalesRep = (userRole || '').toLowerCase().includes('sales');

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId && o.orderNo !== orderId) return o;

        let safeUpdates = { ...updates };

        if (isSalesRep) {
          // Strictly read-only for sales representatives per Section 6:
          delete safeUpdates.id;
          delete safeUpdates.orderNo;
          delete safeUpdates.quotationNo;
          delete safeUpdates.invoiceNo;
          delete safeUpdates.fulfilmentStatus;
          delete safeUpdates.paymentStatus;
          delete safeUpdates.dispatchedQty;
          delete safeUpdates.amountPaid;
          delete safeUpdates.pendingBalance;

          // If product items or quantities are edited, automatically recalculate financial totals from catalog pricing
          if (safeUpdates.items && Array.isArray(safeUpdates.items)) {
            let recalculatedTotal = 0;
            let recalculatedQty = 0;
            const validatedItems = safeUpdates.items.map((item) => {
              const product = products.find((p) => p.id === item.productId || p.code === item.productId);
              const unitPrice = product ? Number(product.price || 0) : Number(item.unitPrice || 0);
              const qty = Number(item.orderedQty || item.qty || 1);
              const taxRate = Number(item.taxRate !== undefined ? item.taxRate : (product?.gstRate || 18));
              const baseAmount = unitPrice * qty;
              const taxAmount = Math.round((baseAmount * taxRate) / 100);
              const lineTotal = baseAmount + taxAmount;

              recalculatedQty += qty;
              recalculatedTotal += lineTotal;

              return {
                ...item,
                unitPrice,
                orderedQty: qty,
                taxRate,
                lineTotal,
                dispatchedQty: item.dispatchedQty || 0,
              };
            });

            safeUpdates.items = validatedItems;
            safeUpdates.orderedQtyTotal = recalculatedQty;
            safeUpdates.totalAmount = recalculatedTotal;
            const paid = Number(o.amountPaid || 0);
            safeUpdates.pendingBalance = Math.max(0, recalculatedTotal - paid);
          }
        }

        return { ...o, ...safeUpdates };
      })
    );
  };

  /**
   * Cancel an order according to Section 14:
   * - If Unpaid: cancel order, release reserved stock back to availability, no refund.
   * - If Paid/Partially Paid: cancel order, release reserved stock, flag refund-pending for Admin/Finance approval.
   */
  const cancelSalesOrder = (orderId, reason = '') => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');

    const hasPayment = order.paymentStatus === 'Paid' || order.paymentStatus === 'Partially Paid';
    const cancelRef = generateReference('CAN');
    const today = new Date().toISOString().split('T')[0];

    // 1. Release reserved stock back to available
    order.items.forEach((item) => {
      if (item.reservedQty > 0) {
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id === item.productId || p.code === item.productId) {
              const newReserved = Math.max(0, p.reservedQty - item.reservedQty);
              const newAvail = p.availableQty + item.reservedQty;
              return {
                ...p,
                reservedQty: newReserved,
                availableQty: newAvail,
                status: newAvail <= 0 ? 'Critical Shortage' : newAvail < p.minStockLevel ? 'Low Stock' : 'In Stock',
              };
            }
            return p;
          })
        );
      }
    });

    // 2. Add to Returns & Cancellations
    const cancelRecord = {
      id: cancelRef,
      returnNo: cancelRef,
      itemType: 'Cancellation',
      classification: hasPayment ? 'After Payment' : 'Before Payment',
      customerId: order.customerId,
      customerName: order.customerName,
      orderNo: order.orderNo,
      invoiceNo: '—',
      orderDate: order.orderDate,
      returnDate: today,
      productCode: order.items[0]?.productId || 'Multiple',
      productName: order.items.map((i) => i.productName).join(', '),
      qty: order.orderedQtyTotal,
      batchOrSerial: 'N/A',
      reason: reason || 'Customer requested order cancellation',
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod || 'Bank Transfer',
      status: hasPayment ? 'Refund Pending' : 'Cancelled',
      resolution: hasPayment ? 'Finance Refund Case Initiated' : 'Order Nullified',
      disposition: 'Reserved Stock Released to Available',
      restockApproved: true,
      refundStatus: hasPayment ? 'Pending Admin/Finance Approval' : 'Not Applicable (No Payment Received)',
      creditNoteStatus: hasPayment ? 'Finance Approval Queued' : 'Not Applicable',
      notes: hasPayment
        ? `Cancellation after payment. Refund approval queued for Finance/Admin.`
        : 'Order cancelled before payment. Reserved stock released back to available pool.',
    };

    setReturns((prev) => [cancelRecord, ...prev]);

    // 3. Update Order status
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              fulfilmentStatus: 'Cancelled',
              reservedQtyTotal: 0,
              stockCheckNote: 'Order was cancelled. All reserved inventory released back to sellable pool.',
            }
          : o
      )
    );

    return cancelRecord;
  };

  // -------------------------------------------------------------
  // SERVICE HANDOFF (5 MANDATORY CONDITIONS PER SALES SPECIFICATION)
  // -------------------------------------------------------------
  const validateServiceHandoffConditions = (order) => {
    const reasons = [];

    if (!order) {
      return { eligible: false, reasons: ['Order does not exist.'], alreadyAssigned: false };
    }

    // Condition 1: Finalized quotation and confirmed Sales Order
    if (order.fulfilmentStatus === 'Cancelled') {
      reasons.push('Order is cancelled and cannot be assigned to Service.');
    }
    if (order.quotationNo) {
      const q = quotations.find((quote) => quote.id === order.quotationNo || quote.quotationNo === order.quotationNo);
      if (q && ['Rejected', 'Draft', 'Under Review'].includes(q.status)) {
        reasons.push(`Originating quotation ${order.quotationNo} is not approved or finalized (Status: ${q.status}).`);
      }
    }

    // Condition 2: Actual recorded payment received >= 50% of required order payment
    const linkedInvoices = invoices.filter((i) => i.orderNo === order.orderNo || i.orderNo === order.id);
    const invoicePaid = linkedInvoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0);
    const linkedPayments = payments.filter((p) => p.orderNo === order.orderNo || p.orderNo === order.id);
    const directPaid = linkedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalPaid = Math.max(invoicePaid, directPaid, Number(order.amountPaid || 0));
    const totalAmt = Number(order.totalAmount || 0);
    const minRequiredPayment = totalAmt * 0.5;

    if (totalPaid < minRequiredPayment) {
      const pct = totalAmt > 0 ? Math.round((totalPaid / totalAmt) * 100) : 0;
      reasons.push(`Payment milestone not met: At least 50% payment required (Currently ₹${totalPaid.toLocaleString('en-IN')} of ₹${totalAmt.toLocaleString('en-IN')}, ${pct}%).`);
    }

    // Condition 3: Fulfillment status is Dispatched or Delivered
    if (!['Dispatched', 'Delivered'].includes(order.fulfilmentStatus)) {
      reasons.push(`Fulfillment milestone not met: Status must be Dispatched or Delivered (Current: ${order.fulfilmentStatus || 'Pending'}).`);
    }

    // Condition 4: Order has NOT already been assigned to Service
    const isAlreadyAssigned = Boolean(order.serviceHandoff && order.serviceHandoff.status === 'Assigned');
    if (isAlreadyAssigned) {
      reasons.push(`Order is already assigned to Service by ${order.serviceHandoff.assignedByName || 'Sales'} (${order.serviceHandoff.assignedByRole || 'Sales'}).`);
    }

    // Condition 5: Logged-in user has appropriate Sales role
    const allowedRoles = ['sales_rep', 'sales_manager', 'sales_coordinator', 'admin'];
    if (!allowedRoles.includes(userRole)) {
      reasons.push(`User role '${userRole}' is not authorized to hand off orders to Service.`);
    }

    return {
      eligible: reasons.length === 0,
      reasons,
      totalPaid,
      percentPaid: totalAmt > 0 ? Math.round((totalPaid / totalAmt) * 100) : 0,
      alreadyAssigned: isAlreadyAssigned,
    };
  };

  const assignOrderToService = (orderId, handoffData = {}) => {
    const order = orders.find((o) => o.id === orderId || o.orderNo === orderId);
    if (!order) throw new Error('Sales Order not found');

    const validation = validateServiceHandoffConditions(order);
    if (!validation.eligible) {
      throw new Error(`Cannot assign to Service: ${validation.reasons.join(' ')}`);
    }

    const cust = customers.find((c) => c.id === order.customerId || c.customerId === order.customerId || c.name === order.customerName) || {};

    const handoffRecord = {
      status: 'Assigned',
      assignedAt: new Date().toISOString(),
      assignedByName: userProfile?.fullName || 'Vikram Mehta',
      assignedByEmployeeId: userProfile?.employeeId || 'APX-EMP-4091',
      assignedByRole: userProfile?.jobTitle || (userRole === 'sales_manager' ? 'Sales Manager' : userRole === 'sales_coordinator' ? 'Sales Coordinator' : 'Sales Representative'),
      serviceRequirement: handoffData.serviceRequirement || 'Installation & Commissioning Required',
      serviceCompletionStatus: 'Pending Service Execution',
      customerDetails: {
        customerId: cust.customerId || cust.code || cust.id || order.customerId,
        customerName: order.customerName,
        contactPerson: cust.contactPerson || 'Contact Person',
        phone: cust.phone || '—',
        email: cust.email || '—',
        address: cust.address || '—',
      },
      products: (order.items || []).map((it) => ({
        productId: it.productId,
        productName: it.productName,
        orderedQty: Number(it.orderedQty || it.qty || 0),
        dispatchedQty: Number(it.dispatchedQty || 0),
      })),
      quotationNo: order.quotationNo || 'Direct',
      invoiceNo: order.invoiceNo || 'Pending Invoice',
      paymentMilestone: {
        totalAmount: order.totalAmount,
        amountPaid: validation.totalPaid,
        pendingBalance: Math.max(0, Number(order.totalAmount || 0) - validation.totalPaid),
        percentPaid: validation.percentPaid,
      },
      notes: handoffData.notes || '',
    };

    // Update order state with handoff record
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, serviceHandoff: handoffRecord } : o))
    );

    // Audit log
    const auditEntry = {
      id: generateReference('AUD'),
      timestamp: new Date().toISOString(),
      action: 'ORDER_ASSIGNED_TO_SERVICE',
      entityType: 'SalesOrder',
      entityId: order.orderNo,
      performedBy: userProfile?.fullName || 'Sales Representative',
      userRole: userRole,
      details: `Sales Order ${order.orderNo} handed off to Service by ${userProfile?.fullName || 'Sales'} (${userRole}). Service Requirement: ${handoffRecord.serviceRequirement}`,
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);

    // Also update any matching opportunity note
    setOpportunities((prev) =>
      prev.map((opp) => {
        if (opp.orderNo === order.orderNo || opp.quotationNo === order.quotationNo) {
          return {
            ...opp,
            lastActivity: `Assigned to Service by ${userProfile?.fullName || 'Sales'} (${handoffRecord.serviceRequirement})`,
          };
        }
        return opp;
      })
    );

    return handoffRecord;
  };

  // -------------------------------------------------------------
  // OPPORTUNITIES / SALES PIPELINE (7 BUSINESS STAGES)
  // -------------------------------------------------------------
  const addOpportunity = (oppData) => {
    const oppId = generateReference('OPP');
    const today = new Date().toISOString().split('T')[0];
    const newOpp = {
      id: oppId,
      opportunityNo: oppId,
      title: oppData.title || `Opportunity for ${oppData.customerName || 'Customer'}`,
      customerId: oppData.customerId || '',
      customerDisplayId: oppData.customerDisplayId || oppData.customerId || '',
      customerName: oppData.customerName || '',
      contactPerson: oppData.contactPerson || '',
      phone: oppData.phone || '',
      email: oppData.email || '',
      quotationNo: oppData.quotationNo || null,
      orderNo: oppData.orderNo || null,
      stage: oppData.stage || 'New Lead',
      value: Number(oppData.value || 0),
      expectedCloseDate: oppData.expectedCloseDate || today,
      createdAt: today,
      assignedSalesperson: oppData.assignedSalesperson || userProfile?.fullName || 'Vikram Mehta',
      assignedEmployeeId: oppData.assignedEmployeeId || userProfile?.employeeId || 'APX-EMP-4091',
      lastActivity: oppData.lastActivity || 'Opportunity created',
      nextFollowUpDate: oppData.nextFollowUpDate || today,
      nextFollowUpNote: oppData.nextFollowUpNote || '',
      history: [
        {
          stage: oppData.stage || 'New Lead',
          changedAt: new Date().toISOString(),
          changedBy: userProfile?.fullName || 'Vikram Mehta',
          role: userProfile?.jobTitle || (userRole === 'sales_manager' ? 'Sales Manager' : userRole === 'sales_coordinator' ? 'Sales Coordinator' : 'Sales Representative'),
          notes: 'Opportunity initiated',
        },
      ],
    };

    setOpportunities((prev) => [newOpp, ...prev]);
    return newOpp;
  };

  const updateOpportunity = (oppId, updates) => {
    setOpportunities((prev) =>
      prev.map((opp) => {
        if (opp.id !== oppId && opp.opportunityNo !== oppId) return opp;
        return { ...opp, ...updates };
      })
    );
  };

  const moveOpportunityStage = (oppId, newStage, meta = {}) => {
    const opp = opportunities.find((o) => o.id === oppId || o.opportunityNo === oppId);
    if (!opp) throw new Error('Opportunity not found');

    if (opp.stage === newStage) return opp;

    // Strict condition for Closed Won:
    // Only when actual fulfillment & full payment conditions are satisfied, not prematurely on quote/order creation
    if (newStage === 'Closed Won') {
      if (!opp.orderNo) {
        throw new Error('Cannot move to Closed Won: Opportunity must have an active linked Sales Order that has been Delivered and Paid in Full.');
      }
      const linkedOrder = orders.find((o) => o.orderNo === opp.orderNo || o.id === opp.orderNo);
      if (!linkedOrder) {
        throw new Error(`Linked Sales Order ${opp.orderNo} not found in records.`);
      }
      if (linkedOrder.fulfilmentStatus !== 'Delivered') {
        throw new Error(`Cannot move to Closed Won: Order fulfillment is currently '${linkedOrder.fulfilmentStatus}'. Both Delivered status and 100% full payment are required.`);
      }
      const paid = Number(linkedOrder.amountPaid || 0);
      const total = Number(linkedOrder.totalAmount || 0);
      if (paid < total) {
        throw new Error(`Cannot move to Closed Won: Order payment is incomplete (₹${paid.toLocaleString('en-IN')} of ₹${total.toLocaleString('en-IN')}). 100% full payment is required.`);
      }
    }

    // Strict condition for Closed Lost:
    if (newStage === 'Closed Lost') {
      if (!meta.lossReason || !meta.lossReason.trim()) {
        throw new Error('A loss reason is mandatory when closing an opportunity as Lost.');
      }
    }

    const historyEntry = {
      stage: newStage,
      changedAt: new Date().toISOString(),
      changedBy: userProfile?.fullName || 'Vikram Mehta',
      role: userProfile?.jobTitle || (userRole === 'sales_manager' ? 'Sales Manager' : userRole === 'sales_coordinator' ? 'Sales Coordinator' : 'Sales Representative'),
      notes: meta.notes || (newStage === 'Closed Lost' ? `Loss Reason: ${meta.lossReason}` : `Stage updated to ${newStage}`),
    };

    const updatedOpp = {
      ...opp,
      stage: newStage,
      lossReason: newStage === 'Closed Lost' ? meta.lossReason : opp.lossReason,
      closedAt: (newStage === 'Closed Won' || newStage === 'Closed Lost') ? new Date().toISOString() : opp.closedAt,
      lastActivity: meta.lastActivity || `Stage moved to ${newStage} by ${userProfile?.fullName || 'Sales'}`,
      history: [...(opp.history || []), historyEntry],
    };

    setOpportunities((prev) =>
      prev.map((o) => (o.id === opp.id ? updatedOpp : o))
    );

    return updatedOpp;
  };

  // -------------------------------------------------------------
  // STOCK RESERVATION (BUSINESS RULE: Cannot reserve > available)
  // -------------------------------------------------------------
  const reserveOrderStock = (orderId, productId, requestedQty) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');

    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error('Product not found');

    const orderItem = order.items.find((i) => i.productId === productId);
    if (!orderItem) throw new Error('Product not in order');

    const unreservedNeeded = orderItem.orderedQty - orderItem.reservedQty;
    if (unreservedNeeded <= 0) {
      throw new Error('Stock is already fully reserved for this item in this order');
    }

    const qtyToReserve = Math.min(requestedQty, unreservedNeeded);
    if (qtyToReserve <= 0) {
      throw new Error('Requested reservation quantity must be positive');
    }

    if (qtyToReserve > product.availableQty) {
      throw new Error(
        `Insufficient available stock. Available: ${product.availableQty} ${product.uom}, Requested: ${qtyToReserve} ${product.uom}. Cannot over-reserve.`
      );
    }

    // Update Product stock: reduce available, increase reserved
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newAvail = p.availableQty - qtyToReserve;
          const newReserved = p.reservedQty + qtyToReserve;
          return {
            ...p,
            availableQty: newAvail,
            reservedQty: newReserved,
            status: newAvail <= 0 ? 'Critical Shortage' : newAvail < p.minStockLevel ? 'Low Stock' : 'In Stock',
          };
        }
        return p;
      })
    );

    // Update Order Item reservation
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          let allFullyReserved = true;
          let anyReserved = false;
          let newTotalReserved = 0;
          let newTotalMissing = 0;

          const updatedItems = o.items.map((it) => {
            if (it.productId === productId) {
              const itemReserved = it.reservedQty + qtyToReserve;
              newTotalReserved += itemReserved;
              const missing = it.orderedQty - itemReserved;
              newTotalMissing += missing;
              if (itemReserved < it.orderedQty) allFullyReserved = false;
              if (itemReserved > 0) anyReserved = true;
              return { ...it, reservedQty: itemReserved };
            }
            newTotalReserved += it.reservedQty;
            const missing = it.orderedQty - it.reservedQty;
            newTotalMissing += missing;
            if (it.reservedQty < it.orderedQty) allFullyReserved = false;
            if (it.reservedQty > 0) anyReserved = true;
            return it;
          });

          let newStatus = o.fulfilmentStatus;
          if (allFullyReserved) {
            newStatus = 'Ready for Dispatch';
          } else if (anyReserved) {
            newStatus = 'Checking Stock';
          }

          return {
            ...o,
            items: updatedItems,
            reservedQtyTotal: newTotalReserved,
            missingQtyTotal: newTotalMissing,
            fulfilmentStatus: newStatus,
            stockCheckNote: allFullyReserved
              ? '100% of required stock is reserved and ready for dispatch.'
              : `Partial stock reserved (${newTotalReserved}/${o.orderedQtyTotal}). Shortage of ${newTotalMissing} units remaining.`,
          };
        }
        return o;
      })
    );
  };

  // -------------------------------------------------------------
  // DISPATCH & DELIVERY OPERATIONS
  // -------------------------------------------------------------
  const createDispatch = (dispatchData) => {
    const { orderId, itemsToDispatch, carrier, trackingNo, warehouse } = dispatchData;

    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');

    const dispatchNo = generateReference('DSP');
    const today = new Date().toISOString().split('T')[0];
    const expectedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const processedDispatchItems = [];

    itemsToDispatch.forEach(({ productId, qty, batchOrSerial }) => {
      const orderItem = order.items.find((i) => i.productId === productId);
      if (!orderItem) throw new Error(`Product ${productId} not in order`);
      const availableToDispatch = orderItem.reservedQty;
      if (qty > availableToDispatch) {
        throw new Error(`Cannot dispatch ${qty} units. Only ${availableToDispatch} units are reserved.`);
      }
      processedDispatchItems.push({
        productId,
        productName: orderItem.productName,
        qty,
        batchOrSerial: batchOrSerial || 'Batch assigned at warehouse bay',
      });
    });

    const newDispatch = {
      id: dispatchNo,
      dispatchNo: dispatchNo,
      orderNo: order.orderNo,
      customerId: order.customerId,
      customerName: order.customerName,
      dispatchDate: today,
      expectedDeliveryDate: expectedDelivery,
      deliveredDate: null,
      warehouse: warehouse || 'Pune Central Plant',
      carrier: carrier || 'Standard Courier',
      trackingNo: trackingNo || 'TRK-' + Math.floor(100000 + Math.random() * 900000),
      status: 'Ready for Dispatch',
      items: processedDispatchItems,
    };

    setDispatches((prev) => [newDispatch, ...prev]);

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          let allDispatched = true;
          let anyDispatched = false;

          const updatedItems = o.items.map((it) => {
            const dispatchSpec = itemsToDispatch.find((d) => d.productId === it.productId);
            if (dispatchSpec) {
              const newDispatched = it.dispatchedQty + dispatchSpec.qty;
              const newReserved = Math.max(0, it.reservedQty - dispatchSpec.qty);
              if (newDispatched < it.orderedQty) allDispatched = false;
              if (newDispatched > 0) anyDispatched = true;
              return {
                ...it,
                dispatchedQty: newDispatched,
                reservedQty: newReserved,
              };
            }
            if (it.dispatchedQty < it.orderedQty) allDispatched = false;
            if (it.dispatchedQty > 0) anyDispatched = true;
            return it;
          });

          return {
            ...o,
            items: updatedItems,
            fulfilmentStatus: allDispatched ? 'Dispatched' : anyDispatched ? 'Partially Dispatched' : o.fulfilmentStatus,
          };
        }
        return o;
      })
    );

    // Update Product stock (reserved falls, total stock falls)
    itemsToDispatch.forEach(({ productId, qty }) => {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === productId) {
            const newReserved = Math.max(0, p.reservedQty - qty);
            const newTotal = Math.max(0, p.totalQty - qty);
            return {
              ...p,
              reservedQty: newReserved,
              totalQty: newTotal,
            };
          }
          return p;
        })
      );
    });

    return newDispatch;
  };

  const updateDispatchStatus = (dispatchId, newStatus) => {
    const today = new Date().toISOString().split('T')[0];
    setDispatches((prev) =>
      prev.map((d) => {
        if (d.id === dispatchId) {
          return {
            ...d,
            status: newStatus,
            deliveredDate: newStatus === 'Delivered' ? today : d.deliveredDate,
          };
        }
        return d;
      })
    );
  };

  // -------------------------------------------------------------
  // INVOICING & PAYMENT OPERATIONS
  // -------------------------------------------------------------
  const createInvoiceForQuotation = (quotationId) => {
    const quote = quotations.find((q) => q.id === quotationId || q.quotationNo === quotationId);
    if (!quote) throw new Error('Quotation not found');
    if (quote.status !== 'Approved' && quote.status !== 'Accepted' && quote.status !== 'Converted') {
      throw new Error('Invoices can only be generated for Approved or Accepted quotations.');
    }

    const existingInv = invoices.find((i) => i.quotationNo === quote.quotationNo);
    if (existingInv) {
      return existingInv;
    }

    const invoiceNo = generateReference('INV', invoices);
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const totalAmount = Number(quote.grandTotal || 0);
    const taxAmount = Number(quote.taxTotal || 0);
    const cgst = Math.round(taxAmount / 2);
    const sgst = taxAmount - cgst;

    const newInvoice = {
      id: invoiceNo,
      invoiceNo: invoiceNo,
      quotationNo: quote.quotationNo,
      orderNo: quote.convertedOrderNo || null,
      customerId: quote.customerId,
      customerName: quote.customerName,
      invoiceDate: today,
      dueDate: dueDate,
      totalAmount: totalAmount,
      paidAmount: 0,
      balance: totalAmount,
      status: 'Issued',
      taxBreakdown: {
        cgst,
        sgst,
        igst: 0,
      },
      items: (quote.items || []).map((it) => ({
        productId: it.productId,
        productName: it.productName,
        unitPrice: it.unitPrice,
        qty: it.qty,
        taxRate: it.taxRate,
        lineTotal: it.lineTotal,
      })),
      notes: `Tax Invoice generated against finalized Quotation ${quote.quotationNo}. Sales Order will be created automatically upon full payment completion.`,
    };

    setInvoices((prev) => [newInvoice, ...prev]);

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === quote.customerId
          ? { ...c, outstandingBalance: (c.outstandingBalance || 0) + totalAmount }
          : c
      )
    );

    addNotification({
      type: 'info',
      title: `Invoice Generated: ${invoiceNo}`,
      message: `Tax Invoice ${invoiceNo} generated for Quotation ${quote.quotationNo} (${quote.customerName}).`,
      page: 'invoices',
    });

    return newInvoice;
  };

  const createInvoiceForOrder = (orderId) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');

    const invoiceNo = generateReference('INV');
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newInvoice = {
      id: invoiceNo,
      invoiceNo: invoiceNo,
      orderNo: order.orderNo,
      customerId: order.customerId,
      customerName: order.customerName,
      invoiceDate: today,
      dueDate: dueDate,
      totalAmount: order.totalAmount,
      paidAmount: 0,
      balance: order.totalAmount,
      status: 'Issued',
      taxBreakdown: {
        cgst: Math.round(order.totalAmount * 0.09),
        sgst: Math.round(order.totalAmount * 0.09),
        igst: 0,
      },
      notes: `Tax Invoice generated for Sales Order ${order.orderNo}.`,
    };

    setInvoices((prev) => [newInvoice, ...prev]);

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === order.customerId
          ? { ...c, outstandingBalance: (c.outstandingBalance || 0) + order.totalAmount }
          : c
      )
    );

    return newInvoice;
  };

  const recordCustomerPayment = (paymentData) => {
    const { invoiceNo, amount, method, referenceNo, notes, paymentType } = paymentData;
    const inv = invoices.find((i) => i.invoiceNo === invoiceNo);
    if (!inv) throw new Error('Invoice not found');

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }
    if (payAmount > inv.balance) {
      throw new Error(
        `Payment amount (₹${payAmount}) cannot exceed remaining invoice balance (₹${inv.balance})`
      );
    }

    const cleanRef = (referenceNo || '').trim();
    if (cleanRef) {
      const isDuplicate = payments.some(
        (p) => p.referenceNo && p.referenceNo.trim().toLowerCase() === cleanRef.toLowerCase()
      );
      if (isDuplicate) {
        throw new Error(
          `Duplicate payment rejected: A transaction with reference / UTR "${cleanRef}" is already recorded in the ledger.`
        );
      }
    }

    const receiptNo = generateReference('RCP', payments);
    const today = new Date().toISOString().split('T')[0];

    const newPaid = inv.paidAmount + payAmount;
    const newBalance = inv.balance - payAmount;
    const newStatus = newBalance <= 0 ? 'Paid' : 'Partially Paid';

    const resolvedType =
      paymentType ||
      (newBalance <= 0
        ? 'Final Payment'
        : inv.paidAmount > 0
        ? 'Installment'
        : 'Advance Payment');

    const newPayment = {
      id: receiptNo,
      receiptNo: receiptNo,
      customerId: inv.customerId,
      customerName: inv.customerName,
      invoiceNo: inv.invoiceNo,
      orderNo: inv.orderNo || null,
      paymentDate: today,
      amount: payAmount,
      method: method || 'Bank Transfer / NEFT',
      paymentType: resolvedType,
      referenceNo: cleanRef || `TXN-2026-${String(payments.length + 101).padStart(4, '0')}`,
      notes: notes || 'Customer invoice settlement payment',
    };

    setPayments((prev) => [newPayment, ...prev]);

    setInvoices((prev) =>
      prev.map((i) =>
        i.invoiceNo === invoiceNo
          ? {
              ...i,
              paidAmount: newPaid,
              balance: newBalance,
              status: newStatus,
            }
          : i
      )
    );

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === inv.customerId
          ? { ...c, outstandingBalance: Math.max(0, (c.outstandingBalance || 0) - payAmount) }
          : c
      )
    );

    if (inv.orderNo) {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.orderNo === inv.orderNo) {
            const currentPaid = o.amountPaid !== undefined ? Number(o.amountPaid) : (inv.paidAmount || 0);
            const totalOrderPaid = currentPaid + payAmount;
            const remainingOrderBalance = Math.max(0, Number(o.totalAmount || 0) - totalOrderPaid);
            return {
              ...o,
              amountPaid: totalOrderPaid,
              pendingBalance: remainingOrderBalance,
              paymentStatus: remainingOrderBalance <= 0 ? 'Paid' : 'Partially Paid',
            };
          }
          return o;
        })
      );
    }

    // Automatic Sales Order creation upon full invoice settlement for quotation-linked invoices
    if (newBalance <= 0 && inv.quotationNo) {
      setTimeout(() => {
        triggerAutoSalesOrderForInvoice(
          { ...inv, paidAmount: newPaid, balance: newBalance, status: newStatus },
          method || 'Bank Transfer / NEFT'
        );
      }, 0);
    }

    return newPayment;
  };

  const updateInvoice = (invoiceId, updates) => {
    setInvoices((prev) =>
      prev.map((i) => {
        if (i.id === invoiceId || i.invoiceNo === invoiceId) {
          const updated = { ...i, ...updates };
          if (updates.status === 'Paid') {
            updated.balance = 0;
            updated.paidAmount = updated.totalAmount;
          } else if (updates.status === 'Partially Paid' && updated.balance <= 0) {
            updated.balance = Math.round(updated.totalAmount / 2);
            updated.paidAmount = updated.totalAmount - updated.balance;
          } else if (updates.status === 'Issued' && updated.paidAmount === 0) {
            updated.balance = updated.totalAmount;
          }

          // Trigger automatic Sales Order if payment completed on quotation-linked invoice
          if (updated.status === 'Paid' && updated.quotationNo) {
            setTimeout(() => {
              triggerAutoSalesOrderForInvoice(updated, 'Bank Transfer / NEFT');
            }, 0);
          }

          return updated;
        }
        return i;
      })
    );
  };

  const addInvoice = (invoiceData) => {
    const invoiceNo = invoiceData.invoiceNo || generateReference('INV', invoices);
    const today = new Date().toISOString().split('T')[0];
    const dueDate = invoiceData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const totalAmount = Number(invoiceData.totalAmount || 0);
    const taxAmount = Number(invoiceData.taxAmount || invoiceData.taxTotal || (totalAmount * 0.18 / 1.18));
    const cgst = invoiceData.taxBreakdown?.cgst ?? Math.round(taxAmount / 2);
    const sgst = invoiceData.taxBreakdown?.sgst ?? Math.round(taxAmount - cgst);
    const igst = invoiceData.taxBreakdown?.igst ?? 0;

    const newInvoice = {
      id: invoiceNo,
      invoiceNo: invoiceNo,
      orderNo: invoiceData.orderNo || null,
      quotationNo: invoiceData.quotationNo || null,
      customerId: invoiceData.customerId,
      customerDisplayId: invoiceData.customerDisplayId || invoiceData.customerId,
      customerName: invoiceData.customerName,
      customerPhone: invoiceData.customerPhone || '',
      customerEmail: invoiceData.customerEmail || '',
      customerAddress: invoiceData.customerAddress || '',
      customerGstin: invoiceData.customerGstin || '',
      invoiceDate: invoiceData.invoiceDate || today,
      dueDate: dueDate,
      totalAmount: totalAmount,
      paidAmount: Number(invoiceData.paidAmount || 0),
      balance: Math.max(0, totalAmount - Number(invoiceData.paidAmount || 0)),
      status: invoiceData.status || 'Pending Approval',
      approvalStatus: invoiceData.approvalStatus || 'Pending Approval',
      approvedBy: invoiceData.approvedBy || null,
      approvedRole: invoiceData.approvedRole || null,
      approvedAt: invoiceData.approvedAt || null,
      approvalHistory: invoiceData.approvalHistory || [],
      taxBreakdown: {
        cgst,
        sgst,
        igst,
      },
      items: (invoiceData.items || []).map((it) => ({
        productId: it.productId,
        productName: it.productName,
        unitPrice: Number(it.unitPrice || 0),
        qty: Number(it.qty || it.orderedQty || 1),
        uom: it.uom || 'Nos',
        discountPercent: Number(it.discountPercent || 0),
        taxRate: Number(it.taxRate || 18),
        taxableValue: Number(it.taxableValue || it.lineTotal || (Number(it.unitPrice || 0) * Number(it.qty || 1))),
        lineTotal: Number(it.lineTotal || (Number(it.unitPrice || 0) * Number(it.qty || 1))),
      })),
      notes: invoiceData.notes || 'Commercial Sales Tax Invoice created. Awaiting Finance authorization.',
      createdBy: userProfile?.fullName || 'Sales Staff',
      createdByRole: userRole,
      createdAt: new Date().toISOString(),
    };

    setInvoices((prev) => [newInvoice, ...prev]);

    if (newInvoice.customerId) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === newInvoice.customerId || c.customerId === newInvoice.customerId
            ? { ...c, outstandingBalance: (c.outstandingBalance || 0) + totalAmount }
            : c
        )
      );
    }

    addNotification({
      type: 'info',
      title: `Invoice Created: ${invoiceNo}`,
      message: `Tax Invoice ${invoiceNo} submitted for ${newInvoice.customerName}. Routing to Finance for authorization by Accountant or Account Manager.`,
      page: 'invoices',
    });

    setAuditLogs((prev) => [
      {
        id: `AUD-INVCR-${Date.now()}`,
        action: 'Invoice Created (Pending Finance Approval)',
        user: userProfile?.fullName || 'Sales Staff',
        employeeId: userProfile?.employeeId || 'APX-EMP',
        role: userRole,
        details: `Created invoice ${invoiceNo} for ${newInvoice.customerName} (₹${totalAmount})`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    return newInvoice;
  };

  const approveInvoice = (invoiceId, approverData = {}) => {
    const inv = invoices.find((i) => i.id === invoiceId || i.invoiceNo === invoiceId);
    if (!inv) throw new Error('Invoice not found');

    if (inv.approvalStatus === 'Approved') {
      throw new Error(`Invoice ${inv.invoiceNo} is already approved by ${inv.approvedBy || 'Finance'}. Duplicate approvals are prohibited.`);
    }

    // Role check: Must be Accountant or Account Manager (Finance)
    const currentRole = approverData.role || userRole;
    const currentTitle = approverData.jobTitle || userProfile?.jobTitle || '';
    const approverName = approverData.name || userProfile?.fullName || 'Rajesh Singhania';

    const isAccountant =
      currentRole === 'accountant' ||
      currentRole === 'finance' ||
      currentTitle.toLowerCase().includes('accountant') ||
      approverName.toLowerCase().includes('singhania');

    const isAccountManager =
      currentRole === 'account_manager' ||
      currentTitle.toLowerCase().includes('account manager') ||
      currentTitle.toLowerCase().includes('accounts manager');

    const isAdmin = currentRole === 'admin';

    if (!isAccountant && !isAccountManager && !isAdmin) {
      throw new Error('Unauthorized: Invoices require approval from either the Accountant OR Account Manager (Finance Department). Sales users cannot approve or override invoices.');
    }

    const roleLabel = isAccountManager ? 'Account Manager' : 'Accountant';
    const nowIso = new Date().toISOString();
    const approvedRecord = {
      approvalStatus: 'Approved',
      approvedBy: approverName,
      approvedRole: roleLabel,
      approvedAt: nowIso,
      status: inv.status === 'Pending Approval' ? 'Issued' : inv.status,
    };

    setInvoices((prev) =>
      prev.map((i) => {
        if (i.id === inv.id || i.invoiceNo === inv.invoiceNo) {
          return {
            ...i,
            ...approvedRecord,
            approvalHistory: [
              ...(i.approvalHistory || []),
              {
                approver: approverName,
                role: roleLabel,
                timestamp: nowIso,
                action: 'Approved Tax Invoice',
              },
            ],
          };
        }
        return i;
      })
    );

    addNotification({
      type: 'success',
      title: `Invoice ${inv.invoiceNo} Authorized`,
      message: `Tax Invoice ${inv.invoiceNo} authorized by ${roleLabel} (${approverName}). Ready for delivery and customer settlement.`,
      page: 'invoices',
    });

    setAuditLogs((prev) => [
      {
        id: `AUD-INVAP-${Date.now()}`,
        action: 'Invoice Authorized',
        user: approverName,
        employeeId: userProfile?.employeeId || 'APX-EMP',
        role: roleLabel,
        details: `Authorized invoice ${inv.invoiceNo} as ${roleLabel}`,
        timestamp: nowIso,
      },
      ...prev,
    ]);

    return { ...inv, ...approvedRecord };
  };

  const recordPaymentReminder = (reminderData) => {
    const reminderId = `REM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newReminder = {
      id: reminderId,
      invoiceNo: reminderData.invoiceNo,
      orderNo: reminderData.orderNo || null,
      customerId: reminderData.customerId,
      customerName: reminderData.customerName,
      channel: reminderData.channel || 'WhatsApp', // 'WhatsApp' | 'Email'
      recipient: reminderData.recipient,
      message: reminderData.message,
      status: reminderData.status || 'Sent', // 'Drafted' | 'Opened in WhatsApp' | 'Opened in Email' | 'Sent'
      scenario: reminderData.scenario || 'payment_due',
      sentBy: userProfile?.fullName || 'Sales Representative',
      sentRole: userRole,
      createdAt: new Date().toISOString(),
    };

    setPaymentReminders((prev) => [newReminder, ...prev]);

    setAuditLogs((prev) => [
      {
        id: `AUD-REM-${Date.now()}`,
        action: `Payment Reminder (${newReminder.channel})`,
        user: userProfile?.fullName || 'Sales Representative',
        employeeId: userProfile?.employeeId || 'APX-EMP',
        role: userRole,
        details: `Sent ${newReminder.channel} reminder to ${newReminder.customerName} for invoice ${newReminder.invoiceNo} (${newReminder.status})`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    return newReminder;
  };

  // -------------------------------------------------------------
  // RETURNS & CANCELLATIONS OPERATIONS
  // -------------------------------------------------------------
  const addReturnRequest = (returnData) => {
    const returnNo = generateReference('RMA');
    const today = new Date().toISOString().split('T')[0];

    const newReturn = {
      id: returnNo,
      returnNo: returnNo,
      itemType: 'Return',
      classification: 'After Delivery',
      customerId: returnData.customerId,
      customerName: returnData.customerName,
      orderNo: returnData.orderNo || '—',
      invoiceNo: returnData.invoiceNo || '—',
      orderDate: returnData.orderDate || today,
      returnDate: today,
      productCode: returnData.productCode,
      productName: returnData.productName,
      qty: Number(returnData.qty),
      batchOrSerial: returnData.batchOrSerial || 'N/A',
      reason: returnData.reason,
      paymentStatus: 'Recorded',
      paymentMethod: returnData.paymentMethod || 'Bank Transfer',
      status: 'Received',
      resolution: 'Awaiting QC Inspection',
      disposition: 'Quarantined (Stock withheld from available inventory)',
      restockApproved: false,
      refundStatus: 'Pending Finance Authorization',
      creditNoteStatus: 'Pending Finance Authorization',
      notes: returnData.notes || 'Goods received at inspection dock.',
    };

    setReturns((prev) => [newReturn, ...prev]);
    return newReturn;
  };

  const approveReturnRestock = (returnId) => {
    const ret = returns.find((r) => r.id === returnId);
    if (!ret) throw new Error('Return record not found');
    if (ret.restockApproved) {
      throw new Error('This return has already been approved and restocked to sellable inventory.');
    }

    // Increase product available and total stock
    setProducts((prev) =>
      prev.map((p) => {
        if (p.code === ret.productCode || p.id === ret.productCode) {
          const newTotal = p.totalQty + ret.qty;
          const newAvail = p.availableQty + ret.qty;
          return {
            ...p,
            totalQty: newTotal,
            availableQty: newAvail,
            status: newAvail <= 0 ? 'Critical Shortage' : newAvail < p.minStockLevel ? 'Low Stock' : 'In Stock',
          };
        }
        return p;
      })
    );

    setReturns((prev) =>
      prev.map((r) =>
        r.id === returnId
          ? {
              ...r,
              restockApproved: true,
              status: 'Restocked',
              disposition: 'Approved by QC & Restocked to Available Inventory',
              notes: `${r.notes || ''} [QC Passed: Restocked on ${new Date().toISOString().split('T')[0]}]`,
            }
          : r
      )
    );
  };

  const approveRefund = (returnId) => {
    setReturns((prev) =>
      prev.map((r) =>
        r.id === returnId
          ? {
              ...r,
              refundStatus: 'Refund Approved & Processed (Simulated)',
              status: 'Completed',
              notes: `${r.notes || ''} [Finance Authorization: Credit note issued via bank channel]`,
            }
          : r
      )
    );
  };

  const updateReturn = (returnId, updates) => {
    setReturns((prev) =>
      prev.map((r) => (r.id === returnId || r.returnNo === returnId ? { ...r, ...updates } : r))
    );
  };

  // -------------------------------------------------------------
  // EXPENSES OPERATIONS & BUDGET MANAGEMENT
  // -------------------------------------------------------------
  const addExpense = (expenseData) => {
    const expId = generateReference('EXP');
    const empId = expenseData.employeeId || userProfile.employeeId || 'APX-EMP-4091';
    const empName = expenseData.employeeName || userProfile.fullName || 'Vikram Mehta';
    const amtNum = Number(expenseData.amount || 0);

    // Check employee budget
    const budget = employeeBudgets.find((b) => b.employeeId === empId);
    const remaining = budget ? Number(budget.remainingBudget || 0) : 25000;
    const isExceeding = amtNum > remaining;

    const claimType = isExceeding ? 'Additional Request' : 'Within Budget';
    let defaultStatus = expenseData.approvalStatus || (expenseData.asDraft ? 'Draft' : 'Submitted');
    if (isExceeding && defaultStatus !== 'Draft') {
      defaultStatus = 'Additional Approval Required';
    }

    const newExpense = {
      ...expenseData,
      id: expId,
      employeeId: empId,
      employeeName: empName,
      amount: amtNum,
      claimType,
      allocatedBudget: budget?.allocatedBudget || 35000,
      remainingBudget: remaining,
      excessAmount: isExceeding ? amtNum - remaining : 0,
      expenseMonth: expenseData.expenseMonth || new Date().toISOString().substring(0, 7),
      submissionDate:
        defaultStatus === 'Draft' ? '—' : new Date().toISOString().split('T')[0],
      approvalStatus: defaultStatus,
      reimbursementStatus: 'Pending',
      batchRef: '—',
      reviewerRemark: '',
    };

    // Update budget utilization if not draft
    if (defaultStatus !== 'Draft') {
      setEmployeeBudgets((prev) =>
        prev.map((b) => {
          if (b.employeeId === empId) {
            const newUsed = b.amountUsed + (isExceeding ? remaining : amtNum);
            const newRemaining = Math.max(0, b.allocatedBudget - newUsed);
            const addReq = isExceeding ? b.additionalAmountRequested + (amtNum - remaining) : b.additionalAmountRequested;
            return {
              ...b,
              amountUsed: newUsed,
              remainingBudget: newRemaining,
              additionalAmountRequested: addReq,
              approvalStatus: isExceeding ? 'Pending Manager Review' : b.approvalStatus,
            };
          }
          return b;
        })
      );
    }

    setExpenses((prev) => [newExpense, ...prev]);
    return newExpense;
  };

  const updateExpense = (id, updates) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  const updateExpenseStatus = (id, approvalStatus, reimbursementStatus = 'Pending', remark = '') => {
    // Only Finance / Accountant or Admin can approve payment and mark claim as Paid
    if (reimbursementStatus === 'Paid' || approvalStatus === 'Paid' || approvalStatus === 'Reimbursed') {
      const isFinance = ['finance', 'accountant', 'account_manager', 'admin'].includes(userRole);
      if (!isFinance) {
        throw new Error('Unauthorized: Finance / Accountant authorization required to process payment or mark expense as Paid.');
      }
    }

    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          return {
            ...e,
            approvalStatus: approvalStatus || e.approvalStatus,
            reimbursementStatus: reimbursementStatus || e.reimbursementStatus,
            reviewerRemark: remark || e.reviewerRemark,
            submissionDate:
              e.submissionDate === '—' && approvalStatus !== 'Draft'
                ? new Date().toISOString().split('T')[0]
                : e.submissionDate,
          };
        }
        return e;
      })
    );
  };

  const requestAdditionalBudget = (employeeId, additionalAmount, reason = '') => {
    setEmployeeBudgets((prev) =>
      prev.map((b) => {
        if (b.employeeId === employeeId) {
          return {
            ...b,
            additionalAmountRequested: Number(additionalAmount || 0),
            approvalStatus: 'Pending Manager Review',
            requestReason: reason,
          };
        }
        return b;
      })
    );
  };

  const deleteExpenseDraft = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // -------------------------------------------------------------
  // CALLS & FOLLOW-UPS OPERATIONS
  // -------------------------------------------------------------
  const addFollowup = (followupData) => {
    const id = generateReference('FLW');
    const newFollowup = {
      ...followupData,
      id,
      owner: userProfile.fullName || 'Vikram Mehta',
      status: 'Scheduled',
    };
    setFollowups((prev) => [newFollowup, ...prev]);
    return newFollowup;
  };

  const updateFollowupPriority = (id, newPriority) => {
    setFollowups((prev) =>
      prev.map((f) => (f.id === id ? { ...f, priority: newPriority } : f))
    );
  };

  const updateFollowup = (id, updates) => {
    setFollowups((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const toggleFollowupComplete = (id) => {
    const today = new Date().toISOString().split('T')[0];
    setFollowups((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          const isDone = f.status === 'Completed';
          return {
            ...f,
            status: isDone ? 'Scheduled' : 'Completed',
            completedDate: isDone ? null : today,
          };
        }
        return f;
      })
    );
  };

  // -------------------------------------------------------------
  // AUTOMATED FOLLOW-UP REMINDER ENGINE
  // Starting 2 days prior to scheduled date, repeat daily until completed/rescheduled
  // -------------------------------------------------------------
  const checkFollowupReminders = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayDate = new Date(today);

    (followups || []).forEach((f) => {
      if (f.status === 'Completed' || f.status === 'Closed') return;
      const scheduledStr = f.followUpDate || f.nextFollowUpDate;
      if (!scheduledStr) return;

      const schedDate = new Date(scheduledStr);
      const diffTime = schedDate.getTime() - todayDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Remind starting 2 days before scheduled date or if overdue
      if (diffDays <= 2) {
        const reminderKey = `remind_${f.id}_${today}`;
        const alreadyNotified = (notifications || []).some(
          (n) => n.reminderKey === reminderKey || (n.followupId === f.id && n.date === today)
        );

        if (!alreadyNotified) {
          const isOverdue = diffDays < 0;
          const label = isOverdue
            ? `OVERDUE by ${Math.abs(diffDays)} day(s)`
            : diffDays === 0
            ? 'Due Today'
            : diffDays === 1
            ? 'Due Tomorrow'
            : 'Due in 2 Days';

          addNotification({
            type: isOverdue ? 'danger' : 'warning',
            title: `${isOverdue ? '⚠️ Overdue Action' : '⏰ Follow-up Reminder'}: ${f.customerName}`,
            message: `${label} (${scheduledStr} at ${f.scheduledTime || '11:00 AM'}): ${f.subject} (${f.contactMethod || 'Call'}).`,
            page: 'customers',
            reminderKey,
            followupId: f.id,
            date: today,
          });
        }
      }
    });
  };

  // Run reminder check whenever followups list is initialized/updated
  useEffect(() => {
    checkFollowupReminders();
  }, [followups]);

  // -------------------------------------------------------------
  // ATTENDANCE & SHIFT OPERATIONS
  // -------------------------------------------------------------
  const checkInEmployee = (employeeId = userProfile.employeeId, notes = '') => {
    const today = new Date().toISOString().split('T')[0];
    const existing = attendanceRecords.find((r) => r.employeeId === employeeId && r.date === today);

    if (existing && existing.checkInTimestamp) {
      throw new Error(`Already checked in today at ${existing.checkInTime}. Duplicate check-in prevented.`);
    }

    const now = new Date();
    const checkInTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const shiftStart = attendancePolicy.shiftStartTime || '09:30';
    const [sH, sM] = shiftStart.split(':').map(Number);
    const graceMinutes = Number(attendancePolicy.gracePeriodMinutes || 15);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const onTimeCutoff = sH * 60 + sM + graceMinutes;
    const halfDayCutoff = 13 * 60 + 30; // 01:30 PM

    let status = 'Present';
    if (currentMinutes > halfDayCutoff) {
      status = 'Half-day';
    } else if (currentMinutes > onTimeCutoff) {
      status = 'Late';
    }

    const recordId = `ATT-${today.replace(/-/g, '')}-${employeeId}`;
    const emp = teamRoster.find((t) => t.employeeId === employeeId) || userProfile;

    const newRecord = {
      id: recordId,
      employeeId,
      employeeName: emp.fullName,
      date: today,
      checkInTime,
      checkInTimestamp: now.toISOString(),
      checkOutTime: '—',
      checkOutTimestamp: null,
      totalHours: 0,
      status,
      notes: notes || (status === 'Late' ? 'Late arrival past 15-min grace window' : 'Shift check-in recorded'),
    };

    setAttendanceRecords((prev) => [newRecord, ...prev.filter((r) => r.id !== recordId)]);

    addNotification({
      type: status === 'Late' ? 'warning' : 'success',
      title: `Check-in Recorded: ${checkInTime}`,
      message: `${emp.fullName} marked as ${status} for today.`,
      page: 'attendance-work',
    });

    return newRecord;
  };

  const checkOutEmployee = (employeeId = userProfile.employeeId, notes = '') => {
    const today = new Date().toISOString().split('T')[0];
    const record = attendanceRecords.find((r) => r.employeeId === employeeId && r.date === today);

    if (!record || !record.checkInTimestamp) {
      throw new Error('No active check-in record found for today. You must check in before checking out.');
    }
    if (record.checkOutTimestamp) {
      throw new Error(`Already checked out for today at ${record.checkOutTime}. Shift has concluded.`);
    }

    const now = new Date();
    const checkOutTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const diffMs = Math.max(0, now - new Date(record.checkInTimestamp));
    const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;

    let finalStatus = record.status;
    const minFull = Number(attendancePolicy.minHoursFullDay || 8.0);
    const minHalf = Number(attendancePolicy.minHoursHalfDay || 4.5);

    if (totalHours < minHalf) {
      finalStatus = 'Half-day';
    } else if (totalHours < minFull && record.status === 'Present') {
      finalStatus = 'Half-day';
    }

    const updatedRecord = {
      ...record,
      checkOutTime,
      checkOutTimestamp: now.toISOString(),
      totalHours,
      status: finalStatus,
      notes: notes
        ? `${record.notes || ''} • ${notes}`
        : `${record.notes || ''} • Total worked: ${totalHours} hrs`,
    };

    setAttendanceRecords((prev) =>
      prev.map((r) => (r.id === record.id ? updatedRecord : r))
    );

    addNotification({
      type: 'info',
      title: `Check-out Recorded: ${checkOutTime}`,
      message: `Shift ended. Total hours worked: ${totalHours} hrs (${finalStatus}).`,
      page: 'attendance-work',
    });

    return updatedRecord;
  };

  const updateAttendancePolicy = (newPolicy) => {
    if (!permissions.isAdmin && userRole !== 'admin' && userRole !== 'sales_manager') {
      throw new Error('Unauthorized: Only Administrators can configure attendance rules.');
    }
    setAttendancePolicy((prev) => ({ ...prev, ...newPolicy }));
    addNotification({
      type: 'info',
      title: 'Company Attendance Policy Updated',
      message: 'New shift rules and grace period configurations applied.',
      page: 'attendance-work',
    });
  };

  // -------------------------------------------------------------
  // DAILY WORK UPDATES OPERATIONS
  // -------------------------------------------------------------
  const addWorkUpdate = (updateData) => {
    if (!updateData.title || !updateData.title.trim()) {
      throw new Error('Work update title is required.');
    }
    if (!updateData.description || !updateData.description.trim()) {
      throw new Error('Work description is required.');
    }

    const updateId = generateReference('WRK', workUpdates);
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const newUpdate = {
      id: updateId,
      employeeId: userProfile.employeeId,
      employeeName: userProfile.fullName,
      role: userProfile.role || 'Sales Representative',
      date: today,
      timestamp: now.toISOString(),
      title: updateData.title.trim(),
      description: updateData.description.trim(),
      progress: updateData.progress || 'In Progress',
      progressPercentage: Math.min(100, Math.max(0, parseInt(updateData.progressPercentage, 10) || 0)),
      blockers: (updateData.blockers || '').trim(),
      nextSteps: (updateData.nextSteps || '').trim(),
      targetId: updateData.targetId || null,
      targetPeriod: updateData.targetPeriod || null,
      moduleRef: (updateData.moduleRef || '').trim() || null,
      activityRef: updateData.activityRef || null,
      activityId: updateData.activityId || null,
      versionHistory: [],
    };

    setWorkUpdates((prev) => [newUpdate, ...prev]);

    if (newUpdate.blockers) {
      addNotification({
        type: 'warning',
        title: `Work Blocker Reported: ${newUpdate.title}`,
        message: `${userProfile.fullName} flagged an issue: "${newUpdate.blockers}"`,
        page: 'attendance-work',
      });
    } else {
      addNotification({
        type: 'success',
        title: 'Daily Work Update Submitted',
        message: `Task "${newUpdate.title}" logged under ${newUpdate.progress}.`,
        page: 'attendance-work',
      });
    }

    return newUpdate;
  };

  const editWorkUpdate = (updateId, updates) => {
    const existing = workUpdates.find((w) => w.id === updateId);
    if (!existing) throw new Error('Work update record not found.');

    const isOwner = existing.employeeId === userProfile.employeeId;
    const isAdmin = permissions.isAdmin || userRole === 'admin' || userRole === 'sales_manager';
    if (!isOwner && !isAdmin) {
      throw new Error('Unauthorized: You can only edit your own work updates.');
    }

    const versionEntry = {
      editedAt: new Date().toISOString(),
      editedBy: userProfile.fullName,
      previousProgress: existing.progress,
      previousPercentage: existing.progressPercentage,
      previousDescription: existing.description,
      changeSummary: updates.changeSummary || 'Details corrected by employee',
    };

    const updated = {
      ...existing,
      title: updates.title ? updates.title.trim() : existing.title,
      description: updates.description ? updates.description.trim() : existing.description,
      progress: updates.progress || existing.progress,
      progressPercentage: updates.progressPercentage !== undefined
        ? Math.min(100, Math.max(0, parseInt(updates.progressPercentage, 10) || 0))
        : existing.progressPercentage,
      blockers: updates.blockers !== undefined ? updates.blockers.trim() : existing.blockers,
      nextSteps: updates.nextSteps !== undefined ? updates.nextSteps.trim() : existing.nextSteps,
      targetId: updates.targetId !== undefined ? updates.targetId : existing.targetId,
      targetPeriod: updates.targetPeriod !== undefined ? updates.targetPeriod : existing.targetPeriod,
      moduleRef: updates.moduleRef !== undefined ? updates.moduleRef : existing.moduleRef,
      versionHistory: [versionEntry, ...(existing.versionHistory || [])],
    };

    setWorkUpdates((prev) =>
      prev.map((w) => (w.id === updateId ? updated : w))
    );

    return updated;
  };

  // -------------------------------------------------------------
  // LEAVE APPLICATIONS & ADMIN APPROVAL OPERATIONS
  // -------------------------------------------------------------
  const applyForLeave = (leaveData) => {
    if (!leaveData.startDate || !leaveData.endDate) {
      throw new Error('Start date and end date are required.');
    }
    if (leaveData.endDate < leaveData.startDate) {
      throw new Error('End date cannot be earlier than start date.');
    }
    if (!leaveData.reason || !leaveData.reason.trim()) {
      throw new Error('Reason for leave application is required.');
    }

    const hasOverlap = leaveRequests.some(
      (l) =>
        l.employeeId === userProfile.employeeId &&
        l.status !== 'Rejected' &&
        l.startDate <= leaveData.endDate &&
        l.endDate >= leaveData.startDate
    );

    if (hasOverlap) {
      throw new Error('Leave application rejected: Date range overlaps with an existing pending or approved leave request.');
    }

    let workingDays = 0;
    const cur = new Date(leaveData.startDate);
    const end = new Date(leaveData.endDate);
    const holidayDates = (attendancePolicy.publicHolidays || []).map((h) => h.date);

    while (cur <= end) {
      const dateStr = cur.toISOString().split('T')[0];
      const dayName = cur.toLocaleDateString('en-US', { weekday: 'long' });
      const isWeekend = (attendancePolicy.weekendDays || ['Sunday']).includes(dayName);
      const isHoliday = holidayDates.includes(dateStr);

      if (!isWeekend && !isHoliday) {
        workingDays += 1;
      }
      cur.setDate(cur.getDate() + 1);
    }

    const leaveId = generateReference('LEV', leaveRequests);
    const newLeave = {
      id: leaveId,
      employeeId: userProfile.employeeId,
      employeeName: userProfile.fullName,
      leaveType: leaveData.leaveType || 'Casual Leave (CL)',
      startDate: leaveData.startDate,
      endDate: leaveData.endDate,
      daysCount: Math.max(1, workingDays),
      reason: leaveData.reason.trim(),
      supportingInfo: (leaveData.supportingInfo || '').trim(),
      status: 'Pending Approval',
      appliedOn: new Date().toISOString().split('T')[0],
      approvedBy: null,
      approvedAt: null,
      remarks: '',
    };

    setLeaveRequests((prev) => [newLeave, ...prev]);

    addNotification({
      type: 'info',
      title: `Leave Application Submitted: ${newLeave.id}`,
      message: `${newLeave.leaveType} for ${newLeave.daysCount} days submitted for Administrator approval.`,
      page: 'attendance-work',
    });

    return newLeave;
  };

  const approveLeaveRequest = (leaveId, approverRemarks = '') => {
    const canReviewLeaves =
      permissions.isAdmin ||
      userRole === 'admin' ||
      userRole === 'sales_manager' ||
      userRole === 'sales_coordinator';
    if (!canReviewLeaves) {
      throw new Error('Unauthorized: Only Sales Managers, Sales Coordinators, or Administrators can review and approve leave applications.');
    }

    const req = leaveRequests.find((l) => l.id === leaveId);
    if (!req) throw new Error('Leave application not found.');

    if (req.employeeId === userProfile.employeeId && userRole !== 'admin') {
      throw new Error('Compliance Violation: Employees are not permitted to approve their own leave applications.');
    }

    const updatedLeave = {
      ...req,
      status: 'Approved',
      approvedBy: `${userProfile.fullName} (${userProfile.jobTitle || 'Administrator'})`,
      approvedAt: new Date().toISOString(),
      remarks: approverRemarks || 'Leave request reviewed and approved according to leave policy.',
    };

    setLeaveRequests((prev) =>
      prev.map((l) => (l.id === leaveId ? updatedLeave : l))
    );

    // Reflect approved leave in attendance history and calendar
    const cur = new Date(req.startDate);
    const end = new Date(req.endDate);
    const holidayDates = (attendancePolicy.publicHolidays || []).map((h) => h.date);
    const newAttendanceEntries = [];

    while (cur <= end) {
      const dateStr = cur.toISOString().split('T')[0];
      const dayName = cur.toLocaleDateString('en-US', { weekday: 'long' });
      const isWeekend = (attendancePolicy.weekendDays || ['Sunday']).includes(dayName);
      const isHoliday = holidayDates.includes(dateStr);

      if (!isWeekend && !isHoliday) {
        newAttendanceEntries.push({
          id: `ATT-${dateStr.replace(/-/g, '')}-${req.employeeId}`,
          employeeId: req.employeeId,
          employeeName: req.employeeName,
          date: dateStr,
          checkInTime: '—',
          checkInTimestamp: null,
          checkOutTime: '—',
          checkOutTimestamp: null,
          totalHours: 0,
          status: 'Approved Leave',
          leaveType: req.leaveType,
          notes: `Sanctioned ${req.leaveType} (Leave Ref: ${req.id})`,
        });
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (newAttendanceEntries.length > 0) {
      setAttendanceRecords((prev) => {
        const entryIds = new Set(newAttendanceEntries.map((e) => e.id));
        const filtered = prev.filter((r) => !entryIds.has(r.id));
        return [...newAttendanceEntries, ...filtered];
      });
    }

    addNotification({
      type: 'success',
      title: `Leave Approved: ${req.id}`,
      message: `${req.employeeName}'s ${req.leaveType} for ${req.daysCount} days has been approved.`,
      page: 'attendance-work',
    });

    return updatedLeave;
  };

  const rejectLeaveRequest = (leaveId, rejectionReason) => {
    const canReviewLeaves =
      permissions.isAdmin ||
      userRole === 'admin' ||
      userRole === 'sales_manager' ||
      userRole === 'sales_coordinator';
    if (!canReviewLeaves) {
      throw new Error('Unauthorized: Only Sales Managers, Sales Coordinators, or Administrators can reject leave applications.');
    }
    if (!rejectionReason || !rejectionReason.trim()) {
      throw new Error('A specific rejection reason must be provided to the employee.');
    }

    const req = leaveRequests.find((l) => l.id === leaveId);
    if (!req) throw new Error('Leave application not found.');

    const updatedLeave = {
      ...req,
      status: 'Rejected',
      rejectedBy: `${userProfile.fullName} (${userProfile.jobTitle || 'Administrator'})`,
      rejectedAt: new Date().toISOString(),
      remarks: rejectionReason.trim(),
    };

    setLeaveRequests((prev) =>
      prev.map((l) => (l.id === leaveId ? updatedLeave : l))
    );

    addNotification({
      type: 'danger',
      title: `Leave Rejected: ${req.id}`,
      message: `${req.employeeName}'s leave application was rejected: "${rejectionReason}"`,
      page: 'attendance-work',
    });

    return updatedLeave;
  };

  // -------------------------------------------------------------
  // TARGET INTEGRATION OPERATIONS
  // -------------------------------------------------------------
  const linkWorkUpdateToTarget = (updateId, targetId) => {
    const target = targets.find((t) => t.id === targetId);
    if (!target) throw new Error('Target not found');

    setWorkUpdates((prev) =>
      prev.map((w) =>
        w.id === updateId ? { ...w, targetId, targetPeriod: target.period } : w
      )
    );
  };

  // -------------------------------------------------------------
  // NOTIFICATION OPERATIONS
  // -------------------------------------------------------------
  const addNotification = (notif) => {
    const newNotif = {
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      time: 'Just now',
      ...notif,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // -------------------------------------------------------------
  // DERIVED METRICS FOR DASHBOARD, PIPELINE & REPORTS
  // -------------------------------------------------------------
  const metrics = useMemo(() => {
    const netSalesMonth = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalOrdersCount = orders.length;

    const pendingOrdersCount = orders.filter((o) =>
      ['Confirmed', 'Awaiting Stock', 'Checking Stock', 'Ready for Dispatch'].includes(o.fulfilmentStatus)
    ).length;

    const pendingQuotesCount = quotations.filter((q) =>
      ['Draft', 'Sent', 'Awaiting Approval'].includes(q.status)
    ).length;

    const outstandingInvoicesTotal = invoices
      .filter((i) => ['Issued', 'Partially Paid', 'Overdue'].includes(i.status))
      .reduce((sum, i) => sum + (i.balance || 0), 0);

    const paymentsCollectedTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const targetAssigned = 2500000;
    const targetAchieved = 1845000;
    const targetPercentage = Math.round((targetAchieved / targetAssigned) * 1000) / 10;
    const targetRemaining = targetAssigned - targetAchieved;

    const pendingDispatchesCount = dispatches.filter((d) =>
      ['Ready for Dispatch', 'Picked & Packed', 'In Transit'].includes(d.status)
    ).length;

    const overdueInvoicesCount = invoices.filter((i) => i.status === 'Overdue').length;

    // Pipeline breakdown
    const activePipelineCount = orders.filter(
      (o) => !['Delivered', 'Cancelled'].includes(o.fulfilmentStatus)
    ).length;

    // Marketing Leads breakdown
    const marketingLeadsCount = scopedMarketingLeads.length;
    const newMarketingLeadsCount = scopedMarketingLeads.filter((l) => l.status === 'New').length;
    const underReviewMarketingLeadsCount = scopedMarketingLeads.filter((l) => l.status === 'Under Review').length;
    const acceptedMarketingLeadsCount = scopedMarketingLeads.filter((l) => l.status === 'Accepted').length;
    const assignedMarketingLeadsCount = scopedMarketingLeads.filter((l) => l.status === 'Assigned').length;
    const convertedMarketingLeadsCount = scopedMarketingLeads.filter((l) => l.status === 'Converted').length;
    const rejectedMarketingLeadsCount = scopedMarketingLeads.filter((l) => l.status === 'Rejected').length;

    return {
      netSalesMonth,
      totalOrdersCount,
      pendingOrdersCount,
      pendingQuotesCount,
      outstandingInvoicesTotal,
      paymentsCollectedTotal,
      targetAssigned,
      targetAchieved,
      targetPercentage,
      targetRemaining,
      pendingDispatchesCount,
      overdueInvoicesCount,
      activePipelineCount,
      marketingLeadsCount,
      newMarketingLeadsCount,
      underReviewMarketingLeadsCount,
      acceptedMarketingLeadsCount,
      assignedMarketingLeadsCount,
      convertedMarketingLeadsCount,
      rejectedMarketingLeadsCount,
    };
  }, [orders, quotations, invoices, payments, dispatches, scopedMarketingLeads]);

  return (
    <SalesContext.Provider
      value={{
        // Data collections
        products,
        customers,
        quotations,
        orders,
        opportunities,
        dispatches,
        invoices,
        payments,
        returns,
        expenses,
        followups,
        notifications,
        metrics,
        regions,
        activities,
        companyConfig,

        // Profile & Auth
        userProfile,
        isAuthenticated,
        updateUserProfile,
        signIn,
        signUp,
        signOut,

        // Navigation
        activePage,
        pageFilter,
        navigateTo,

        // Role & Permissions
        userRole,
        setUserRole,
        permissions,

        // Commission Policy & Calculations (Configurable)
        commissionPolicy,
        updateCommissionPolicy,

        // Product & Stock Actions
        updateProduct,
        adjustProductStock,

        // Customer Actions
        addCustomer,
        updateCustomer,
        downloadCustomerData,

        // Marketing Leads State & Actions
        marketingLeads,
        scopedMarketingLeads,
        findMatchingCustomers,
        acceptMarketingLead,
        rejectMarketingLead,
        assignMarketingLead,
        convertLeadToPipeline,
        receiveMarketingLead,
        updateMarketingLead,
        downloadMarketingLeadsData,
        getMarketingIntegrationStatus,

        // Quotations Actions & Dual Approval Workflows
        addQuotation,
        updateQuotation,
        updateQuotationStatus,
        requestQuotationApproval,
        approveQuotation,
        rejectQuotation,
        downloadQuotationPDF,
        sendQuotationEmail,
        requestDownloadApproval,
        approveDownload,
        rejectDownload,
        convertQuotationToOrder,

        // Enterprise Audit Trail & Communications
        auditLogs,
        emailConfig,
        checkFollowupReminders,

        // Sales Orders Actions
        addSalesOrder,
        updateSalesOrder,
        cancelSalesOrder,
        reserveOrderStock,
        validateServiceHandoffConditions,
        assignOrderToService,

        // Opportunities / Sales Pipeline Actions
        addOpportunity,
        updateOpportunity,
        moveOpportunityStage,

        // Dispatch Actions
        createDispatch,
        updateDispatchStatus,

        // Invoicing & Payment Actions
        invoices,
        payments,
        paymentReminders,
        addInvoice,
        approveInvoice,
        recordPaymentReminder,
        createInvoiceForQuotation,
        createInvoiceForOrder,
        recordCustomerPayment,
        updateInvoice,

        // Returns & Cancellations Actions
        addReturnRequest,
        approveReturnRestock,
        approveRefund,
        updateReturn,

        // Expenses & Budgets Actions
        employeeBudgets,
        requestAdditionalBudget,
        addExpense,
        updateExpense,
        updateExpenseStatus,
        deleteExpenseDraft,

        // Follow-ups Actions
        addFollowup,
        updateFollowup,
        updateFollowupPriority,
        toggleFollowupComplete,

        // Regional Scheduling & Field Activities
        assignActivity,
        updateActivity,
        updateActivityProgress,
        deleteActivity,

        // Centralized Company Configuration
        updateCompanyConfig,

        // Attendance, Work Updates & Leaves State
        attendanceRecords,
        attendancePolicy,
        teamRoster,
        workUpdates,
        leaveRequests,
        targets,

        // Attendance & Shift Actions
        checkInEmployee,
        checkOutEmployee,
        updateAttendancePolicy,

        // Daily Work Updates Actions
        addWorkUpdate,
        editWorkUpdate,

        // Leave Application & Approval Actions
        applyForLeave,
        approveLeaveRequest,
        rejectLeaveRequest,

        // Target Integration Actions
        linkWorkUpdateToTarget,

        // Utilities
        addNotification,
        dismissNotification,
        clearAllNotifications,
        resetDemoData,
      }}
    >
      {children}
    </SalesContext.Provider>
  );
}

export function useSales() {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return context;
}
