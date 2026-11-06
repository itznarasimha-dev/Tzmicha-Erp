import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import { User, UserRole } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select, SearchInput } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import {
  Users,
  UserPlus,
  Shield,
  Briefcase,
  Warehouse,
  Compass,
  Edit2,
  Filter,
  CheckCircle2,
  Mail,
  Phone,
  Building,
  Target,
  Building2,
  Check,
  Copy,
  Eye,
  Activity,
  Calendar,
  UserCheck,
  UserX,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown,
  AlertTriangle,
  Lock,
  Unlock,
  Key,
  FileText,
  Clock,
  Sparkles,
  Award,
  DollarSign,
  Layers,
  MapPin,
  XCircle,
  HelpCircle,
  MoreVertical,
} from 'lucide-react';

// Predefined organizational departments for employee alignment
const DEPARTMENTS = [
  'Executive Administration',
  'Operations & Business Excellence',
  'Sales & Business Development',
  'Supply Chain & Warehousing',
  'Field Marketing & Outreach',
  'Finance & Accounts',
  'Customer Service & Technical Support',
];

// Baseline System Roles with definitions and module access
interface RoleDefinition {
  id: UserRole;
  title: string;
  department: string;
  description: string;
  badgeVariant: 'purple' | 'primary' | 'neutral' | 'warning' | 'success' | 'info';
  responsibilities: string[];
  defaultPermissions: Record<string, boolean>;
}

const SYSTEM_ROLES_CATALOG: RoleDefinition[] = [
  {
    id: 'admin',
    title: 'Executive Administrator',
    department: 'Executive Administration',
    description: 'Complete system authority across masters, catalog pricing, financial audits, and organizational governance.',
    badgeVariant: 'purple',
    responsibilities: [
      'Full governance & master data management',
      'Costing & catalog selling price control',
      'Credit limit & margin threshold overrides',
      'User role & territory assignment management',
    ],
    defaultPermissions: {
      'Dashboard (Executive Analytics)': true,
      'Sales (Orders & Dispatch)': true,
      'Customers (Directory & Credit)': true,
      'Quotations (Pricing & Margin)': true,
      'Inventory (Ledgers & Adjustments)': true,
      'Suppliers (Purchasing & Inward)': true,
      'Finance (A/R & Remittance)': true,
      'Marketing (Surveys & Visits)': true,
      'Attendance (Punches & Approvals)': true,
      'Reports (P&L & Analytics)': true,
    },
  },
  {
    id: 'manager',
    title: 'Operations Manager',
    department: 'Operations & Business Excellence',
    description: 'Operational leadership across sales dispatches, stock audits, customer accounts, quotations, and staff leave approvals.',
    badgeVariant: 'info',
    responsibilities: [
      'Operational approvals for sales orders & discounts',
      'Inventory health, stock transfers & QC review',
      'Staff leave approval & attendance coordination',
      'Customer accounts & vendor operational management',
    ],
    defaultPermissions: {
      'Dashboard (Operations Analytics)': true,
      'Sales (Orders & Dispatch)': true,
      'Customers (Directory & Credit)': true,
      'Quotations (Pricing & Margin)': true,
      'Inventory (Ledgers & Adjustments)': true,
      'Suppliers (Purchasing & Inward)': true,
      'Finance (A/R & Remittance Review)': true,
      'Marketing (Surveys & Visits)': true,
      'Attendance (Punches & Approvals)': true,
      'Reports (Operational Analytics)': true,
    },
  },
  {
    id: 'sales',
    title: 'Field Sales Representative',
    department: 'Sales & Business Development',
    description: 'Customer account management, sales order booking, dealer price quotation, and cash remittance tracking.',
    badgeVariant: 'primary',
    responsibilities: [
      'Retailer & dealer order booking',
      'Customer quotation generation',
      'Outstanding payment collection & remittance',
      'Assigned territory customer relationship building',
    ],
    defaultPermissions: {
      'Dashboard (Sales Performance)': true,
      'Sales (Orders & Dispatch)': true,
      'Customers (Directory & Credit)': true,
      'Quotations (Pricing & Margin)': true,
      'Inventory (Stock Availability)': true,
      'Suppliers (Purchasing & Inward)': false,
      'Finance (Collection Remittance)': true,
      'Marketing (Surveys & Visits)': false,
      'Attendance (Self Punch Only)': true,
      'Reports (Individual Sales Targets)': true,
    },
  },
  {
    id: 'store_manager',
    title: 'Warehouse & Depot Operations Head',
    department: 'Supply Chain & Warehousing',
    description: 'Inward goods receiving, batch inventory tracking, order stock reservation, and dispatch gatepass processing.',
    badgeVariant: 'neutral',
    responsibilities: [
      'Inbound goods physical count & GRN verification',
      'Batch inventory reservation & warehouse picking',
      'Shortage & transit damage reporting',
      'Stock ledger movements & physical audits',
    ],
    defaultPermissions: {
      'Dashboard (Depot Stock)': true,
      'Sales (Dispatch & Packing Slips)': true,
      'Customers (Shipping Addresses)': true,
      'Quotations (Pricing & Margin)': false,
      'Inventory (Full Batch Management)': true,
      'Suppliers (Inward Receipt Inspection)': true,
      'Finance (Inventory Valuation)': false,
      'Marketing (Surveys & Visits)': false,
      'Attendance (Self Punch Only)': true,
      'Reports (Stock Turn & Ageing)': true,
    },
  },
  {
    id: 'marketing',
    title: 'Ground Marketing Specialist',
    department: 'Field Marketing & Outreach',
    description: 'Physical dealer visit logging, application demo trials, lead generation, and competitive market surveys.',
    badgeVariant: 'warning',
    responsibilities: [
      'On-ground physical dealer visits & check-ins',
      'Product demonstration trials & sample distribution',
      'Market intelligence surveys & competitor pricing',
      'Trade lead generation for regional sales reps',
    ],
    defaultPermissions: {
      'Dashboard (Marketing Campaigns)': true,
      'Sales (Read-Only Order Status)': false,
      'Customers (Lead Directory)': true,
      'Quotations (Pricing & Margin)': false,
      'Inventory (Sample Stock)': true,
      'Suppliers (Purchasing & Inward)': false,
      'Finance (Field Expense Claims)': true,
      'Marketing (Full Field Visits & Surveys)': true,
      'Attendance (Self Punch Only)': true,
      'Reports (Visit Target Compliance)': true,
    },
  },
  {
    id: 'finance',
    title: 'Finance & Accounts Specialist',
    department: 'Finance & Accounts',
    description: 'Accounts receivable tracking, customer credit limit vetting, payment remittance verification, and tax audit compliance.',
    badgeVariant: 'success',
    responsibilities: [
      'Cash & bank remittance verification',
      'A/R aging & overdue payment follow-ups',
      'GST tax audit & recoverable input tax credit (ITC)',
      'Customer credit assessment & credit notes',
    ],
    defaultPermissions: {
      'Dashboard (Financial Overview)': true,
      'Sales (Invoicing & Credit Notes)': true,
      'Customers (Credit & Ledgers)': true,
      'Quotations (Margin & Payment Terms)': true,
      'Inventory (Inventory Valuation)': true,
      'Suppliers (Vendor Payables)': true,
      'Finance (Full Cash & Bank Ledgers)': true,
      'Marketing (Expense Audit)': true,
      'Attendance (Payroll Integration)': true,
      'Reports (Financial Statements & P&L)': true,
    },
  },
  {
    id: 'service',
    title: 'Customer Service & Technical Engineer',
    department: 'Customer Service & Technical Support',
    description: 'Chemical product technical support, on-site application diagnostics, and customer complaint resolution.',
    badgeVariant: 'info',
    responsibilities: [
      'Technical product usage queries & diagnostics',
      'Customer complaint logging & investigation',
      'Batch quality feedback to manufacturing plants',
      'Product warranty & chemical specification sheets',
    ],
    defaultPermissions: {
      'Dashboard (Service Tickets)': true,
      'Sales (Read-Only Orders)': false,
      'Customers (Technical Contact)': true,
      'Quotations (Spec Validation)': false,
      'Inventory (Batch Assay Sheets)': true,
      'Suppliers (Technical Data Sheets)': true,
      'Finance (Service Billing)': false,
      'Marketing (Demo Assistance)': true,
      'Attendance (Self Punch Only)': true,
      'Reports (Complaint Resolution Metrics)': true,
    },
  },
];

export const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const {
    users,
    currentUser,
    regions,
    warehouses,
    organizations,
    currentOrganization,
    leaveRequests,
    attendanceRecords,
    salesOrders,
    customers,
    quotations,
    salesTargets,
    marketingTargets,
    addUser,
    updateUser,
  } = useErpStore();

  const isCurrentUserManager = currentUser?.role === 'manager';

  // Helper to compute holistic multi-dimensional employee performance & portfolio
  const getEmployeePerformance = (user: User) => {
    // 1. Handled Customers
    const handledCustomers = (customers || []).filter(
      (c) => c.assignedSalesUserId === user.id || c.assignedMarketingUserId === user.id
    );

    // 2. Quotations Created
    const userQuotations = (quotations || []).filter(
      (q) => q.assignedSalesUserId === user.id || q.senderEmail === user.email
    );
    const totalQuotedValue = userQuotations.reduce(
      (sum, q) => sum + (q.subtotal || 0) + (q.taxTotal || 0),
      0
    );

    // 3. Sales Orders Handled
    const userOrders = (salesOrders || []).filter((so) => so.salesUserId === user.id);
    const totalOrdersValue = userOrders.reduce((sum, so) => sum + (so.totalAmount || 0), 0);

    // 4. Targets & Progress
    const sTarget = (salesTargets || []).find((t) => t.userId === user.id);
    const mTarget = (marketingTargets || []).find((t) => t.userId === user.id);

    let targetSummary = 'Enterprise Standard';
    let targetProgress = 85;

    if (sTarget) {
      targetSummary = `₹${(sTarget.targetAmount / 100000).toFixed(1)}L (${sTarget.period || 'Monthly'})`;
      targetProgress =
        sTarget.targetAmount > 0
          ? Math.min(100, Math.round(((sTarget.achievedAmount || 0) / sTarget.targetAmount) * 100))
          : 85;
    } else if (mTarget) {
      targetSummary = `${mTarget.targetVisits || 40} Field Demos`;
      targetProgress =
        mTarget.targetVisits > 0
          ? Math.min(100, Math.round(((mTarget.completedVisits || 0) / mTarget.targetVisits) * 100))
          : 75;
    } else if (user.monthlySalesTarget) {
      targetSummary = `₹${(user.monthlySalesTarget / 100000).toFixed(1)}L Target`;
      targetProgress = 80;
    } else if (user.role === 'store_manager') {
      const whCount = user.assignedWarehouseIds?.length || 1;
      targetSummary = `${whCount} Depot${whCount > 1 ? 's' : ''} Active`;
      targetProgress = 96;
    } else if (user.role === 'admin' || user.role === 'manager') {
      targetSummary = 'Org Governance';
      targetProgress = 100;
    }

    return {
      handledCustomersCount: handledCustomers.length,
      handledCustomers,
      quotationsCount: userQuotations.length,
      userQuotations,
      totalQuotedValue,
      ordersCount: userOrders.length,
      userOrders,
      totalOrdersValue,
      targetSummary,
      targetProgress,
    };
  };

  // Active top view tab: 'directory' | 'roles_matrix'
  const [activeViewTab, setActiveViewTab] = useState<'directory' | 'roles_matrix'>('directory');

  // Search & Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'empId' | 'joining_desc' | 'dept'>('name');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Modals & Drawer State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [changeRoleModalOpen, setChangeRoleModalOpen] = useState(false);
  const [assignTerritoryModalOpen, setAssignTerritoryModalOpen] = useState(false);
  const [confirmStatusModalOpen, setConfirmStatusModalOpen] = useState(false);
  const [profileDrawerUser, setProfileDrawerUser] = useState<User | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'overview' | 'permissions' | 'activity'>('overview');
  const [selectedTargetUser, setSelectedTargetUser] = useState<User | null>(null);

  // Status toggle confirmation action state
  const [pendingStatusAction, setPendingStatusAction] = useState<'active' | 'inactive' | 'suspended'>('active');

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // --------------------------------------------------------------------------
  // FORM STATES: Add & Edit Employee
  // --------------------------------------------------------------------------
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmpId, setFormEmpId] = useState('');
  const [formDept, setFormDept] = useState(DEPARTMENTS[1]);
  const [formDesignation, setFormDesignation] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('sales');
  const [formRegion, setFormRegion] = useState(regions[0]?.id || 'reg-north');
  const [formWarehouse, setFormWarehouse] = useState(warehouses[0]?.id || '');
  const [formJoiningDate, setFormJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [formReportingManager, setFormReportingManager] = useState('Rajesh Verma');
  const [formResponsibilities, setFormResponsibilities] = useState('');
  const [formTeamId, setFormTeamId] = useState(currentOrganization?.teamId || 'APEX-2026');

  // Interactive Roles & Permissions Simulation State
  const [activeRoleForMatrix, setActiveRoleForMatrix] = useState<UserRole>('sales');
  const [simulatedPermissions, setSimulatedPermissions] = useState<Record<UserRole, Record<string, boolean>>>(() => {
    const initial: Record<UserRole, Record<string, boolean>> = {} as any;
    SYSTEM_ROLES_CATALOG.forEach((r) => {
      initial[r.id] = { ...r.defaultPermissions };
    });
    return initial;
  });

  // --------------------------------------------------------------------------
  // HELPER MAPPINGS
  // --------------------------------------------------------------------------
  const getRoleInfo = (role: UserRole) => {
    return SYSTEM_ROLES_CATALOG.find((r) => r.id === role) || SYSTEM_ROLES_CATALOG[0];
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Badge variant="purple">Executive Admin</Badge>;
      case 'manager':
        return <Badge variant="info">Operations Manager</Badge>;
      case 'sales':
        return <Badge variant="primary">Field Sales</Badge>;
      case 'store_manager':
        return <Badge variant="neutral">Warehouse Manager</Badge>;
      case 'marketing':
        return <Badge variant="warning">Ground Marketing</Badge>;
      case 'finance':
        return <Badge variant="success">Finance & Accounts</Badge>;
      case 'service':
        return <Badge variant="info">Field Service</Badge>;
      default:
        return <Badge variant="neutral">{role}</Badge>;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'inactive':
        return <Badge variant="neutral">Inactive</Badge>;
      case 'suspended':
        return <Badge variant="danger">Suspended</Badge>;
      case 'invited':
        return <Badge variant="warning">Invited</Badge>;
      case 'active':
      default:
        return <Badge variant="success">Active</Badge>;
    }
  };

  // --------------------------------------------------------------------------
  // SUMMARY METRICS CALCULATIONS
  // --------------------------------------------------------------------------
  const totalEmployees = users.length;
  const activeEmployees = users.filter((u) => u.status !== 'inactive' && u.status !== 'suspended').length;
  const inactiveEmployees = users.filter((u) => u.status === 'inactive' || u.status === 'suspended').length;

  // Pending administrative actions calculation
  const pendingLeavesCount = leaveRequests.filter((l) => l.status === 'pending').length;
  const incompleteProfilesCount = users.filter(
    (u) => !u.phone || !u.employeeId || (u.role === 'store_manager' && (!u.assignedWarehouseIds || u.assignedWarehouseIds.length === 0))
  ).length;
  const pendingAdminActionsTotal = pendingLeavesCount + incompleteProfilesCount;

  // Department distribution
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => {
      const dept = u.department || 'Sales & Business Development';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return counts;
  }, [users]);

  // --------------------------------------------------------------------------
  // FILTERING, SORTING & PAGINATION
  // --------------------------------------------------------------------------
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const empId = u.employeeId || '';
        const dept = u.department || 'Sales & Business Development';
        const matchesSearch =
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
          empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (u.designation && u.designation.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesDept = selectedDeptFilter === 'all' || dept === selectedDeptFilter;
        const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
        const matchesRegion = selectedRegionFilter === 'all' || u.assignedRegionId === selectedRegionFilter;

        const isUserActive = u.status !== 'inactive' && u.status !== 'suspended';
        const matchesStatus =
          selectedStatusFilter === 'all' ||
          (selectedStatusFilter === 'active' && isUserActive) ||
          (selectedStatusFilter === 'inactive' && u.status === 'inactive') ||
          (selectedStatusFilter === 'suspended' && u.status === 'suspended');

        return matchesSearch && matchesDept && matchesRole && matchesRegion && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'empId') return (a.employeeId || '').localeCompare(b.employeeId || '');
        if (sortBy === 'joining_desc') return (b.joiningDate || '').localeCompare(a.joiningDate || '');
        if (sortBy === 'dept') return (a.department || '').localeCompare(b.department || '');
        return 0;
      });
  }, [users, searchTerm, selectedDeptFilter, selectedRoleFilter, selectedRegionFilter, selectedStatusFilter, sortBy]);

  // Paginated Slice
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // --------------------------------------------------------------------------
  // ACTION HANDLERS
  // --------------------------------------------------------------------------
  const handleOpenAdd = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormEmpId(`EMP-${Date.now().toString().slice(-4)}`);
    setFormDept(DEPARTMENTS[1]);
    setFormDesignation('Sales Executive');
    setFormRole('sales');
    setFormRegion(regions[0]?.id || 'reg-north');
    setFormWarehouse(warehouses[0]?.id || '');
    setFormJoiningDate(new Date().toISOString().split('T')[0]);
    setFormReportingManager('Rajesh Verma');
    setFormResponsibilities('Account coordination, order booking, and field partner visits');
    setFormTeamId(currentOrganization?.teamId || 'APEX-2026');
    setAddModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setSelectedTargetUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPhone(user.phone);
    setFormEmpId(user.employeeId || `EMP-${user.id.slice(-4)}`);
    setFormDept(user.department || DEPARTMENTS[1]);
    setFormDesignation(user.designation || 'Specialist');
    setFormRole(user.role);
    setFormRegion(user.assignedRegionId);
    setFormWarehouse(user.assignedWarehouseIds?.[0] || warehouses[0]?.id || '');
    setFormJoiningDate(user.joiningDate || '2023-01-01');
    setFormReportingManager(user.reportingManager || 'Rajesh Verma');
    setFormResponsibilities(user.responsibilities?.join(', ') || '');
    setFormTeamId(user.teamId || currentOrganization?.teamId || 'APEX-2026');
    setEditModalOpen(true);
  };

  const handleOpenChangeRole = (user: User) => {
    if (isCurrentUserManager) {
      if (user.role === 'admin') {
        triggerToast('Administrative Restriction: Operations Managers cannot alter Executive Administrator credentials.');
        return;
      }
      if (user.id === currentUser?.id) {
        triggerToast('Security Restriction: Personnel cannot alter their own system role privileges.');
        return;
      }
    }
    setSelectedTargetUser(user);
    setFormRole(user.role);
    setChangeRoleModalOpen(true);
  };

  const handleOpenAssignTerritory = (user: User) => {
    setSelectedTargetUser(user);
    setFormRegion(user.assignedRegionId);
    setFormWarehouse(user.assignedWarehouseIds?.[0] || warehouses[0]?.id || '');
    setAssignTerritoryModalOpen(true);
  };

  const handleOpenConfirmStatus = (user: User, newStatus: 'active' | 'inactive' | 'suspended') => {
    if (isCurrentUserManager && user.role === 'admin') {
      triggerToast('Administrative Restriction: Operations Managers cannot deactivate Executive Administrators.');
      return;
    }
    if (isCurrentUserManager && user.id === currentUser?.id) {
      triggerToast('Security Restriction: Personnel cannot deactivate their own active user account.');
      return;
    }
    setSelectedTargetUser(user);
    setPendingStatusAction(newStatus);
    setConfirmStatusModalOpen(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) return;

    const matchedOrg = organizations.find((o) => o.teamId === formTeamId);
    const respList = formResponsibilities
      ? formResponsibilities.split(',').map((r) => r.trim()).filter(Boolean)
      : ['Operational duties & enterprise reporting'];

    addUser({
      name: formName,
      email: formEmail,
      phone: formPhone || '+91 98000 00000',
      role: formRole,
      department: formDept,
      designation: formDesignation || 'Operations Staff',
      employeeId: formEmpId,
      joiningDate: formJoiningDate,
      reportingManager: formReportingManager,
      responsibilities: respList,
      teamId: formTeamId,
      organizationId: matchedOrg?.id || 'org-apex',
      assignedRegionId: formRole === 'admin' ? 'all' : formRegion,
      assignedWarehouseIds: formRole === 'store_manager' && formWarehouse ? [formWarehouse] : [],
      status: 'active',
      walletBalance: 0,
      maxDiscountPercent: 0,
      avatar: `https://images.unsplash.com/photo-${1534528741775 + users.length * 1000}?w=150&auto=format&fit=crop&q=80`,
    });

    setAddModalOpen(false);
    triggerToast(`Employee ${formName} (${formEmpId}) successfully created and registered.`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetUser) return;

    const respList = formResponsibilities
      ? formResponsibilities.split(',').map((r) => r.trim()).filter(Boolean)
      : selectedTargetUser.responsibilities || [];

    updateUser(selectedTargetUser.id, {
      name: formName,
      email: formEmail,
      phone: formPhone,
      department: formDept,
      designation: formDesignation,
      employeeId: formEmpId,
      joiningDate: formJoiningDate,
      reportingManager: formReportingManager,
      responsibilities: respList,
      assignedRegionId: formRole === 'admin' ? 'all' : formRegion,
      assignedWarehouseIds: formRole === 'store_manager' && formWarehouse ? [formWarehouse] : selectedTargetUser.assignedWarehouseIds,
    });

    setEditModalOpen(false);
    triggerToast(`Updated profile details for ${formName}.`);

    // If profile drawer is open for this employee, sync changes
    if (profileDrawerUser && profileDrawerUser.id === selectedTargetUser.id) {
      setProfileDrawerUser({
        ...profileDrawerUser,
        name: formName,
        email: formEmail,
        phone: formPhone,
        department: formDept,
        designation: formDesignation,
        employeeId: formEmpId,
        joiningDate: formJoiningDate,
        reportingManager: formReportingManager,
        responsibilities: respList,
      });
    }
  };

  const handleSaveChangeRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetUser) return;

    updateUser(selectedTargetUser.id, {
      role: formRole,
      assignedRegionId: formRole === 'admin' ? 'all' : selectedTargetUser.assignedRegionId,
    });

    setChangeRoleModalOpen(false);
    triggerToast(`Role updated to ${getRoleInfo(formRole).title} for ${selectedTargetUser.name}.`);

    if (profileDrawerUser && profileDrawerUser.id === selectedTargetUser.id) {
      setProfileDrawerUser({ ...profileDrawerUser, role: formRole });
    }
  };

  const handleSaveAssignTerritory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetUser) return;

    updateUser(selectedTargetUser.id, {
      assignedRegionId: formRegion,
      assignedWarehouseIds: formWarehouse ? [formWarehouse] : [],
    });

    setAssignTerritoryModalOpen(false);
    triggerToast(`Assigned territory & warehouse updated for ${selectedTargetUser.name}.`);

    if (profileDrawerUser && profileDrawerUser.id === selectedTargetUser.id) {
      setProfileDrawerUser({
        ...profileDrawerUser,
        assignedRegionId: formRegion,
        assignedWarehouseIds: formWarehouse ? [formWarehouse] : [],
      });
    }
  };

  const handleExecuteStatusChange = () => {
    if (!selectedTargetUser) return;

    updateUser(selectedTargetUser.id, {
      status: pendingStatusAction,
    });

    setConfirmStatusModalOpen(false);
    const actionLabel = pendingStatusAction === 'active' ? 'activated' : pendingStatusAction === 'inactive' ? 'deactivated' : 'suspended';
    triggerToast(`Employee ${selectedTargetUser.name} has been ${actionLabel}.`);

    if (profileDrawerUser && profileDrawerUser.id === selectedTargetUser.id) {
      setProfileDrawerUser({ ...profileDrawerUser, status: pendingStatusAction });
    }
  };

  // Toggle module permission in simulation state
  const handleToggleSimulatedPermission = (roleId: UserRole, moduleName: string) => {
    setSimulatedPermissions((prev) => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [moduleName]: !prev[roleId][moduleName],
      },
    }));
  };

  const handleResetRolePermissions = (roleId: UserRole) => {
    const roleDef = SYSTEM_ROLES_CATALOG.find((r) => r.id === roleId);
    if (!roleDef) return;
    setSimulatedPermissions((prev) => ({
      ...prev,
      [roleId]: { ...roleDef.defaultPermissions },
    }));
    triggerToast(`Reset ${roleDef.title} permissions to default governance baseline.`);
  };

  const handleSaveSimulatedRolePolicy = () => {
    triggerToast(`Role access policy matrix saved in simulated local state.`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-semibold animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Administration</span>
            <span>•</span>
            <span className="text-indigo-600">Personnel &amp; Roles</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            Employee Management &amp; Administration
            <Badge variant="purple" size="sm">Admin Control</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Maintain complete enterprise personnel profiles, manage departments and reporting hierarchies, configure system access roles, and audit operational permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            icon={<UserPlus className="w-4 h-4" />}
          >
            Add New Employee
          </Button>
        </div>
      </div>

      {/* Primary View Tab Switcher: Employee Directory vs Roles & Permissions Matrix */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-0.5">
        <button
          type="button"
          onClick={() => setActiveViewTab('directory')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeViewTab === 'directory'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Employee Directory ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveViewTab('roles_matrix')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeViewTab === 'roles_matrix'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Role &amp; Permissions Matrix ({SYSTEM_ROLES_CATALOG.length} Roles)</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold uppercase tracking-wider">
            RBAC
          </span>
        </button>
      </div>

      {activeViewTab === 'directory' ? (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Total Employees */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Employees
                </span>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {totalEmployees}
                </div>
                <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
                  Across {Object.keys(deptCounts).length} Departments
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Active Employees */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Active Personnel
                </span>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  {activeEmployees}
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Operational Standing
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Inactive / Suspended */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Inactive / Suspended
                </span>
                <div className="text-2xl font-black text-rose-700 mt-1">
                  {inactiveEmployees}
                </div>
                <span className="text-[10px] text-rose-600 font-semibold mt-0.5 flex items-center gap-1">
                  <UserX className="w-3 h-3" /> Deactivated Access
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            {/* Pending Admin Actions */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Pending Actions
                  </span>
                  <span
                    className="text-[10px] text-slate-400 hover:text-slate-600 cursor-help"
                    title="Includes pending leave approvals and employee profiles with incomplete assignments."
                  >
                    <HelpCircle className="w-3 h-3" />
                  </span>
                </div>
                <div className="text-2xl font-black text-amber-600 mt-1">
                  {pendingAdminActionsTotal}
                </div>
                <span className="text-[10px] text-amber-700 font-semibold mt-0.5 block truncate max-w-[150px]">
                  {pendingLeavesCount} Leaves • {incompleteProfilesCount} Profile Info
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Department Breakdown Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Building className="w-3 h-3" /> Depts:
            </span>
            <button
              type="button"
              onClick={() => setSelectedDeptFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedDeptFilter === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({totalEmployees})
            </button>
            {DEPARTMENTS.map((dept) => {
              const count = deptCounts[dept] || 0;
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDeptFilter(dept)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedDeptFilter === dept
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {dept} ({count})
                </button>
              );
            })}
          </div>

          {/* Filter & Search Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search by Name, Employee ID, Email or Phone..."
                />
              </div>

              {/* Role Filter */}
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All Roles</option>
                {SYSTEM_ROLES_CATALOG.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>

              {/* Territory Filter */}
              <select
                value={selectedRegionFilter}
                onChange={(e) => setSelectedRegionFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All Territories</option>
                <option value="all_national">National (Executive / All)</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
                <option value="suspended">Suspended Only</option>
              </select>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="name">Sort by Name (A-Z)</option>
                <option value="empId">Sort by Employee ID</option>
                <option value="joining_desc">Sort by Joining Date (Newest)</option>
                <option value="dept">Sort by Department</option>
              </select>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs text-slate-500">
              <span className="text-[11px] font-medium">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 text-xs rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-700 cursor-pointer"
              >
                <option value={5}>5 / page</option>
                <option value={6}>6 / page</option>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
              </select>
            </div>
          </div>

          {/* REDESIGNED EMPLOYEE DIRECTORY TABLE */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Personnel Directory ({filteredUsers.length})</CardTitle>
                <CardDescription>
                  Clean alignment of corporate identity, contact coordinates, department, territory assignment, and status.
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-semibold bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>Enterprise RBAC Active</span>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/70">
                    <th className="py-3 px-3.5">Employee ID</th>
                    <th className="py-3 px-3.5">Employee &amp; Role</th>
                    <th className="py-3 px-3.5">Contact Coordinates</th>
                    <th className="py-3 px-3.5">Department / Team</th>
                    <th className="py-3 px-3.5">Performance &amp; Scope</th>
                    <th className="py-3 px-3.5">Assigned Territory</th>
                    <th className="py-3 px-3.5">Employment Status</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold">No personnel found matching current filters.</p>
                        <p className="text-[11px] mt-0.5">Try adjusting your search keywords, department or status criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u) => {
                      const reg = regions.find((r) => r.id === u.assignedRegionId);
                      const deptName = u.department || 'Sales & Business Development';
                      const perf = getEmployeePerformance(u);
                      const displayEmpId = u.employeeId || `EMP-${u.id.slice(-4).toUpperCase()}`;
                      const isUserActive = u.status !== 'inactive' && u.status !== 'suspended';

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors group">
                          {/* 1. Employee Master ID */}
                          <td className="py-3.5 px-3.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-extrabold text-xs text-indigo-700 bg-indigo-50/90 border border-indigo-200/90 px-2 py-0.5 rounded-lg select-all">
                                {displayEmpId}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(displayEmpId);
                                  setCopiedId(u.id);
                                  setTimeout(() => setCopiedId(null), 2000);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                title="Copy Employee ID"
                              >
                                {copiedId === u.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* 2. Employee Profile & Role */}
                          <td className="py-3.5 px-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={u.avatar}
                                alt={u.name}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150';
                                }}
                              />
                              <div>
                                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-sans mt-0.5">
                                  <span className="text-slate-700 font-semibold">{u.designation || 'Staff'}</span>
                                  <span>•</span>
                                  <span>{getRoleBadge(u.role)}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 3. Contact Coordinates */}
                          <td className="py-3.5 px-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-slate-700 font-mono text-[11px]">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[170px]" title={u.email}>{u.email}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{u.phone}</span>
                              </div>
                            </div>
                          </td>

                          {/* 4. Department / Team */}
                          <td className="py-3.5 px-3.5">
                            <div>
                              <span className="font-semibold text-slate-800 text-[11px] block">{deptName}</span>
                              <span className="inline-block mt-0.5 text-[10px] text-slate-500 font-mono">
                                Team: {u.teamId || 'APEX-2026'}
                              </span>
                            </div>
                          </td>

                          {/* 5. Performance & Portfolio Scope */}
                          <td className="py-3.5 px-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs">
                                  {perf.handledCustomersCount} Customers
                                </span>
                                {perf.quotationsCount > 0 && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-indigo-700 font-semibold text-[11px]">
                                      {perf.quotationsCount} Quotes
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                <span className="text-emerald-700 font-bold">{perf.targetSummary}</span>
                                <span className="text-slate-300">•</span>
                                <span className="font-mono text-slate-600">{perf.targetProgress}% achieved</span>
                              </div>
                            </div>
                          </td>

                          {/* 6. Assigned Territory */}
                          <td className="py-3.5 px-3.5">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 font-bold text-[10px] uppercase border border-purple-200">
                                <Building2 className="w-3 h-3" /> National (All)
                              </span>
                            ) : u.role === 'store_manager' ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                                  <Warehouse className="w-2.5 h-2.5" />
                                  {u.assignedWarehouseIds && u.assignedWarehouseIds.length > 0
                                    ? `${u.assignedWarehouseIds.length} Depots Assigned`
                                    : 'Depot Pending'}
                                </span>
                                <span className="block text-[10px] text-slate-500 truncate max-w-[150px]">
                                  {reg?.name || 'Assigned Depot'}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                {reg?.name || (u.assignedRegionId === 'all' ? 'National (All)' : u.assignedRegionId)}
                              </span>
                            )}
                          </td>

                          {/* 7. Employment Status */}
                          <td className="py-3.5 px-3.5">
                            {getStatusBadge(u.status)}
                          </td>

                          {/* 8. Actions Menu */}
                          <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Profile Drawer Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setProfileDrawerUser(u);
                                  setActiveProfileTab('overview');
                                }}
                                icon={<Eye className="w-3.5 h-3.5 text-slate-600" />}
                                title="View Complete Employee Profile Drawer"
                              >
                                Profile
                              </Button>

                              {/* Edit Employee Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEdit(u)}
                                icon={<Edit2 className="w-3.5 h-3.5 text-indigo-600" />}
                                title="Edit Employee Information"
                              >
                                Edit
                              </Button>

                              {/* Quick Action: Status Toggle */}
                              {isUserActive ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenConfirmStatus(u, 'inactive')}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Deactivate Employee Account"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenConfirmStatus(u, 'active')}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                  title="Reactivate Employee Account"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredUsers.length > pageSize && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/40">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredUsers.length}
                  itemsPerPage={pageSize}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
          </Card>
        </>
      ) : (
        /* -------------------------------------------------------------------------- */
        /* ROLES & PERMISSIONS MATRIX TAB */
        /* -------------------------------------------------------------------------- */
        <div className="space-y-6">
          {/* Roles Matrix Header Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                  Role-Based Access Governance (RBAC)
                </span>
                <h2 className="text-xl sm:text-2xl font-black mt-1">System Roles &amp; Module Permissions</h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Inspect and simulate operational access capabilities partitioned by ERP business modules. Changes made here apply to all personnel holding the selected role.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isCurrentUserManager ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetRolePermissions(activeRoleForMatrix)}
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                    >
                      Reset Defaults
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveSimulatedRolePolicy}
                      icon={<Check className="w-3.5 h-3.5" />}
                    >
                      Simulate Save
                    </Button>
                  </>
                ) : (
                  <Badge variant="warning" size="sm">
                    Read-Only Policy Mode
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {isCurrentUserManager && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Manager Access Limitation:</strong> Operations Managers have view-only access to RBAC policies. Modifying system-wide baseline permissions is restricted to Executive Administrators.
              </span>
            </div>
          )}

          {/* Role Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {SYSTEM_ROLES_CATALOG.map((roleDef) => {
              const assignedCount = users.filter((u) => u.role === roleDef.id).length;
              const isSelected = activeRoleForMatrix === roleDef.id;

              return (
                <div
                  key={roleDef.id}
                  onClick={() => setActiveRoleForMatrix(roleDef.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-500 shadow-xs ring-1 ring-indigo-500'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      {roleDef.id.replace('_', ' ')}
                    </span>
                    <Badge variant={roleDef.badgeVariant} size="sm">
                      {assignedCount} Staff
                    </Badge>
                  </div>
                  <h4 className="font-black text-slate-900 text-xs mt-1.5">{roleDef.title}</h4>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{roleDef.department}</p>
                </div>
              );
            })}
          </div>

          {/* Active Role Detail & Permission Matrix */}
          {(() => {
            const activeRoleDef = SYSTEM_ROLES_CATALOG.find((r) => r.id === activeRoleForMatrix)!;
            const currentPerms = simulatedPermissions[activeRoleForMatrix] || activeRoleDef.defaultPermissions;
            const assignedMembers = users.filter((u) => u.role === activeRoleForMatrix);

            return (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>{activeRoleDef.title} — Permission Matrix</CardTitle>
                        <Badge variant={activeRoleDef.badgeVariant}>{activeRoleDef.department}</Badge>
                      </div>
                      <CardDescription className="mt-1">
                        {activeRoleDef.description}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900 block font-mono">
                        {assignedMembers.length} Employees Assigned
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Governed by this access profile
                      </span>
                    </div>
                  </CardHeader>

                  <div className="p-4 sm:p-6 space-y-6">
                    {/* Responsibilities list */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-indigo-600" />
                        Core System Responsibilities
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeRoleDef.responsibilities.map((resp, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{resp}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Module Permission Checklist */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        Module-Level Authorization Switches (Local Simulation)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {Object.entries(currentPerms).map(([moduleName, isAllowed]) => (
                          <div
                            key={moduleName}
                            onClick={() => handleToggleSimulatedPermission(activeRoleForMatrix, moduleName)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isAllowed
                                ? 'bg-emerald-50/50 border-emerald-300 text-emerald-950'
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {isAllowed ? (
                                <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <Unlock className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <span className="font-bold text-xs">{moduleName}</span>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isAllowed
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {isAllowed ? 'Authorized' : 'Restricted'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Assigned Personnel Quick List */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        Personnel Currently Assigned ({assignedMembers.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {assignedMembers.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => {
                              setProfileDrawerUser(m);
                              setActiveProfileTab('overview');
                            }}
                            className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer text-xs"
                          >
                            <img src={m.avatar} alt={m.name} className="w-6 h-6 rounded-lg object-cover" />
                            <span className="font-bold text-slate-800">{m.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">({m.employeeId})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })()}
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* EMPLOYEE DETAILS DRAWER / PROFILE VIEW */}
      {/* -------------------------------------------------------------------------- */}
      {profileDrawerUser && (
        <Modal
          isOpen={true}
          onClose={() => setProfileDrawerUser(null)}
          title={`Employee Profile: ${profileDrawerUser.name}`}
          description={`ID: ${profileDrawerUser.employeeId || profileDrawerUser.id} | Department: ${profileDrawerUser.department || 'Operations'}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Top Identity Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={profileDrawerUser.avatar}
                    alt={profileDrawerUser.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
                  />
                  <div>
                    <h3 className="text-base font-black text-slate-900">{profileDrawerUser.name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-mono text-xs text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                        <span>ID: {profileDrawerUser.employeeId || `EMP-${profileDrawerUser.id.slice(-4).toUpperCase()}`}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const idToCopy = profileDrawerUser.employeeId || `EMP-${profileDrawerUser.id.slice(-4).toUpperCase()}`;
                            navigator.clipboard.writeText(idToCopy);
                            setCopiedId(profileDrawerUser.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 cursor-pointer"
                          title="Copy Employee ID"
                        >
                          {copiedId === profileDrawerUser.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-700 font-semibold">{profileDrawerUser.designation || 'Staff'}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600 font-medium">{profileDrawerUser.department}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(profileDrawerUser.status)}
                  {getRoleBadge(profileDrawerUser.role)}
                </div>
              </div>

              {/* Quick Actions Bar inside Drawer */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const u = profileDrawerUser;
                      setProfileDrawerUser(null);
                      handleOpenEdit(u);
                    }}
                    icon={<Edit2 className="w-3.5 h-3.5" />}
                  >
                    Edit Profile
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const u = profileDrawerUser;
                      setProfileDrawerUser(null);
                      handleOpenChangeRole(u);
                    }}
                    icon={<Shield className="w-3.5 h-3.5" />}
                  >
                    Change Role
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const u = profileDrawerUser;
                      setProfileDrawerUser(null);
                      handleOpenAssignTerritory(u);
                    }}
                    icon={<MapPin className="w-3.5 h-3.5" />}
                  >
                    Territory
                  </Button>
                </div>

                {profileDrawerUser.status !== 'inactive' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const u = profileDrawerUser;
                      setProfileDrawerUser(null);
                      handleOpenConfirmStatus(u, 'inactive');
                    }}
                    className="text-rose-700 hover:bg-rose-50 border-rose-200"
                    icon={<UserX className="w-3.5 h-3.5" />}
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const u = profileDrawerUser;
                      setProfileDrawerUser(null);
                      handleOpenConfirmStatus(u, 'active');
                    }}
                    className="text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                    icon={<UserCheck className="w-3.5 h-3.5" />}
                  >
                    Activate
                  </Button>
                )}
              </div>
            </div>

            {/* Profile Drawer Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
              <button
                type="button"
                onClick={() => setActiveProfileTab('overview')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-colors ${
                  activeProfileTab === 'overview'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Overview &amp; Employment
              </button>
              <button
                type="button"
                onClick={() => setActiveProfileTab('permissions')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-colors ${
                  activeProfileTab === 'permissions'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Role &amp; Permissions
              </button>
              <button
                type="button"
                onClick={() => setActiveProfileTab('activity')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-colors ${
                  activeProfileTab === 'activity'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Performance &amp; Handled Accounts
              </button>
            </div>

            {/* TAB 1: OVERVIEW & EMPLOYMENT */}
            {activeProfileTab === 'overview' && (
              <div className="space-y-4">
                {/* Contact Coordinates */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
                  <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    Contact &amp; Personal Credentials
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                      <span className="font-bold font-mono text-slate-800">{profileDrawerUser.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Phone</span>
                      <span className="font-bold text-slate-800">{profileDrawerUser.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Employment Specifications */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
                  <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                    Corporate Hierarchy &amp; Organizational Workspace
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Joining Date</span>
                      <span className="font-bold text-slate-800">{profileDrawerUser.joiningDate || '2023-01-15'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Reporting Manager</span>
                      <span className="font-bold text-slate-800">{profileDrawerUser.reportingManager || 'Rajesh Verma'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Team Workspace</span>
                      <span className="font-bold font-mono text-indigo-700">{profileDrawerUser.teamId || 'APEX-2026'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Territory</span>
                      <span className="font-bold text-slate-800">
                        {regions.find((r) => r.id === profileDrawerUser.assignedRegionId)?.name ||
                          (profileDrawerUser.assignedRegionId === 'all' ? 'National (All Regions)' : profileDrawerUser.assignedRegionId)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Warehouses</span>
                      <span className="font-bold text-slate-800">
                        {profileDrawerUser.assignedWarehouseIds && profileDrawerUser.assignedWarehouseIds.length > 0
                          ? profileDrawerUser.assignedWarehouseIds.join(', ')
                          : 'No Specific Depot (Territory Scope)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Core Responsibilities */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                  <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-600" />
                    Assigned Key Responsibilities
                  </span>
                  <div className="space-y-1.5">
                    {(profileDrawerUser.responsibilities || [
                      'Execution of role responsibilities per standard operating procedures',
                      'Daily attendance recording & activity reporting',
                    ]).map((resp, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{resp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ROLE & PERMISSIONS */}
            {activeProfileTab === 'permissions' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">Role Profile Definition</span>
                    {getRoleBadge(profileDrawerUser.role)}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {getRoleInfo(profileDrawerUser.role).description}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                  <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    Authorized Module Privileges
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {Object.entries(getRoleInfo(profileDrawerUser.role).defaultPermissions).map(([mod, isAuth]) => (
                      <div
                        key={mod}
                        className={`p-2 rounded-lg border flex items-center justify-between ${
                          isAuth ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        <span className="truncate max-w-[170px]">{mod}</span>
                        <span className={`text-[9px] font-bold uppercase ${isAuth ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {isAuth ? 'Granted' : 'Denied'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PERFORMANCE, TARGETS & HANDLED ACCOUNTS PORTFOLIO */}
            {activeProfileTab === 'activity' && (() => {
              const drawerPerf = getEmployeePerformance(profileDrawerUser);

              return (
                <div className="space-y-4">
                  {/* Top 4 KPI Metrics Banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200">
                      <span className="text-[10px] uppercase font-bold text-indigo-700 block">
                        Customers Handled
                      </span>
                      <div className="text-lg font-black text-slate-900 mt-0.5">
                        {drawerPerf.handledCustomersCount} Accounts
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">Assigned Portfolio</span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                        Quotations Created
                      </span>
                      <div className="text-lg font-black text-slate-900 mt-0.5">
                        {drawerPerf.quotationsCount} Quotes
                      </div>
                      <span className="text-[10px] text-emerald-700 font-mono font-bold">
                        ₹{(drawerPerf.totalQuotedValue / 100000).toFixed(1)}L Quoted
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                      <span className="text-[10px] uppercase font-bold text-blue-700 block">
                        Orders Booked
                      </span>
                      <div className="text-lg font-black text-slate-900 mt-0.5">
                        {drawerPerf.ordersCount} Orders
                      </div>
                      <span className="text-[10px] text-blue-700 font-mono font-bold">
                        ₹{(drawerPerf.totalOrdersValue / 100000).toFixed(1)}L Revenue
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                      <span className="text-[10px] uppercase font-bold text-amber-700 block">
                        Target &amp; Run-Rate
                      </span>
                      <div className="text-sm font-black text-slate-900 mt-1 truncate">
                        {drawerPerf.targetSummary}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full"
                            style={{ width: `${drawerPerf.targetProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 font-mono">
                          {drawerPerf.targetProgress}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Accounts Handled by this Employee */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        Assigned Customer Accounts Portfolio ({drawerPerf.handledCustomersCount})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDrawerUser(null);
                          navigate('/admin/customers');
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        Open Customers Directory →
                      </button>
                    </div>

                    {drawerPerf.handledCustomers.length === 0 ? (
                      <div className="p-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-500 text-[11px]">
                        No direct client accounts assigned to this personnel profile.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-48 overflow-y-auto">
                        {drawerPerf.handledCustomers.map((cust) => {
                          const cCode = cust.code || `CUST-${cust.id.slice(-4).toUpperCase()}`;
                          return (
                            <div
                              key={cust.id}
                              className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-[11px]"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px]">
                                  {cCode}
                                </span>
                                <div>
                                  <span className="font-bold text-slate-900 block">{cust.businessName}</span>
                                  <span className="text-[10px] text-slate-400">
                                    Prop: {cust.name} • <span className="capitalize">{cust.type}</span>
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <span className="font-mono font-bold text-slate-800 block text-[10px]">
                                    Limit: ₹{cust.creditLimit.toLocaleString('en-IN')}
                                  </span>
                                  <span
                                    className={`font-mono text-[10px] ${
                                      cust.currentOutstanding > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'
                                    }`}
                                  >
                                    A/R: ₹{cust.currentOutstanding.toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProfileDrawerUser(null);
                                    navigate(`/admin/customers?search=${cust.businessName}`);
                                  }}
                                  className="p-1 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500"
                                  title="Inspect Customer in Directory"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Recent Quotations & Orders Linked to this Employee */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        Transactions Booked (Orders &amp; Quotations)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDrawerUser(null);
                          navigate('/admin/orders');
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        Open Orders Hub →
                      </button>
                    </div>

                    {drawerPerf.userOrders.length === 0 && drawerPerf.userQuotations.length === 0 ? (
                      <div className="p-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-500 text-[11px]">
                        Zero recent quotations or sales order bookings recorded.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-48 overflow-y-auto">
                        {drawerPerf.userOrders.map((ord) => (
                          <div
                            key={ord.id}
                            className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-[11px]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px]">
                                {ord.orderNumber}
                              </span>
                              <span className="font-semibold text-slate-800">{ord.customerName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">
                                ₹{Math.round(ord.totalAmount).toLocaleString('en-IN')}
                              </span>
                              <Badge size="sm" variant={ord.status === 'dispatched' ? 'success' : 'primary'}>
                                {ord.status.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {drawerPerf.userQuotations.map((quote) => (
                          <div
                            key={quote.id}
                            className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-[11px]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px]">
                                {quote.quotationNo}
                              </span>
                              <span className="font-semibold text-slate-800">{quote.customerName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">
                                ₹{Math.round((quote.subtotal || 0) + (quote.taxTotal || 0)).toLocaleString('en-IN')}
                              </span>
                              <Badge size="sm" variant="warning">
                                {quote.status.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Financial & Wallet Snapshot */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                    <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                      Field Wallet &amp; Operations Balance
                    </span>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Field Wallet Balance</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          ₹{profileDrawerUser.walletBalance?.toLocaleString('en-IN') || 0}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Discounts Authorized</span>
                        <span className="font-mono font-bold text-indigo-700 text-sm">
                          Up to {profileDrawerUser.maxDiscountPercent || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setProfileDrawerUser(null)}>
                Close Profile
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL: ADD NEW EMPLOYEE */}
      {/* -------------------------------------------------------------------------- */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Provision New Employee Profile"
        description="Register an enterprise staff member, assign system role, set department, and allocate territory bounds."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveAdd} className="space-y-3.5 text-xs pt-1">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Full Name *"
              placeholder="e.g. Ramesh Kulkarni"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
            <Input
              label="Employee ID *"
              placeholder="e.g. EMP-SLS-105"
              value={formEmpId}
              onChange={(e) => setFormEmpId(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Corporate Email *"
              type="email"
              placeholder="ramesh@apexflow-erp.com"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              required
            />
            <Input
              label="Phone Number *"
              placeholder="+91 98220 12345"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Department *
              </label>
              <select
                value={formDept}
                onChange={(e) => setFormDept(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Job Designation *"
              placeholder="e.g. Regional Field Officer"
              value={formDesignation}
              onChange={(e) => setFormDesignation(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                System Role *
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              >
                {SYSTEM_ROLES_CATALOG.filter((r) => !isCurrentUserManager || r.id !== 'admin').map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Assigned Region / Territory *
              </label>
              <select
                value={formRegion}
                onChange={(e) => setFormRegion(e.target.value)}
                disabled={formRole === 'admin'}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium disabled:bg-slate-100"
              >
                {formRole === 'admin' ? (
                  <option value="all">National Consolidate (All Regions)</option>
                ) : (
                  regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {formRole === 'store_manager' && (
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Warehouse Depot Assignment *
              </label>
              <select
                value={formWarehouse}
                onChange={(e) => setFormWarehouse(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code} - {w.regionId})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Joining Date *"
              type="date"
              value={formJoiningDate}
              onChange={(e) => setFormJoiningDate(e.target.value)}
              required
            />
            <Input
              label="Reporting Manager *"
              placeholder="e.g. Rajesh Verma"
              value={formReportingManager}
              onChange={(e) => setFormReportingManager(e.target.value)}
              required
            />
          </div>

          <Input
            label="Assigned Responsibilities (Comma-separated)"
            placeholder="e.g. Order Booking, Territory Coverage, Remittance"
            value={formResponsibilities}
            onChange={(e) => setFormResponsibilities(e.target.value)}
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Register Employee
            </Button>
          </div>
        </form>
      </Modal>

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL: EDIT EMPLOYEE INFORMATION */}
      {/* -------------------------------------------------------------------------- */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={selectedTargetUser ? `Edit Employee: ${selectedTargetUser.name}` : 'Edit Employee'}
        description="Update contact information, department, job designation, reporting manager, and assignments."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs pt-1">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Full Name *"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
            <Input
              label="Employee ID *"
              value={formEmpId}
              onChange={(e) => setFormEmpId(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Corporate Email *"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              required
            />
            <Input
              label="Contact Phone *"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Department *
              </label>
              <select
                value={formDept}
                onChange={(e) => setFormDept(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Job Designation *"
              value={formDesignation}
              onChange={(e) => setFormDesignation(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Joining Date *"
              type="date"
              value={formJoiningDate}
              onChange={(e) => setFormJoiningDate(e.target.value)}
              required
            />
            <Input
              label="Reporting Manager *"
              value={formReportingManager}
              onChange={(e) => setFormReportingManager(e.target.value)}
              required
            />
          </div>

          <Input
            label="Assigned Responsibilities (Comma-separated)"
            value={formResponsibilities}
            onChange={(e) => setFormResponsibilities(e.target.value)}
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL: CHANGE SYSTEM ROLE */}
      {/* -------------------------------------------------------------------------- */}
      <Modal
        isOpen={changeRoleModalOpen}
        onClose={() => setChangeRoleModalOpen(false)}
        title={selectedTargetUser ? `Change System Role: ${selectedTargetUser.name}` : 'Change System Role'}
        description="Reassign operational role credentials. Module authorization rules will update accordingly."
        maxWidth="md"
      >
        <form onSubmit={handleSaveChangeRole} className="space-y-4 text-xs pt-1">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Current System Role</span>
            <div className="mt-1 flex items-center gap-2">
              {selectedTargetUser && getRoleBadge(selectedTargetUser.role)}
              <span className="text-slate-700 font-medium">({selectedTargetUser?.department})</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Select New System Role *
            </label>
            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
            >
              {SYSTEM_ROLES_CATALOG.filter((r) => !isCurrentUserManager || r.id !== 'admin').map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.department})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 space-y-1">
            <span className="font-bold block text-[11px]">Role Privilege Impact:</span>
            <p className="text-[10px] text-indigo-800">
              {getRoleInfo(formRole).description}
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setChangeRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Apply Role Change
            </Button>
          </div>
        </form>
      </Modal>

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL: ASSIGN TERRITORY & DEPOT */}
      {/* -------------------------------------------------------------------------- */}
      <Modal
        isOpen={assignTerritoryModalOpen}
        onClose={() => setAssignTerritoryModalOpen(false)}
        title={selectedTargetUser ? `Assign Territory: ${selectedTargetUser.name}` : 'Assign Territory'}
        description="Allocate regional operational bounds and primary storage warehouse depot."
        maxWidth="md"
      >
        <form onSubmit={handleSaveAssignTerritory} className="space-y-4 text-xs pt-1">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Assigned Territory / Region *
            </label>
            <select
              value={formRegion}
              onChange={(e) => setFormRegion(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold cursor-pointer"
            >
              <option value="all">National Consolidate (Executive / All Regions)</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code} - {r.state})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Assigned Warehouse Depot (Optional)
            </label>
            <select
              value={formWarehouse}
              onChange={(e) => setFormWarehouse(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
            >
              <option value="">No Depot Assigned (General Territory Representative)</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code} - {w.regionId})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setAssignTerritoryModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Territory Bounds
            </Button>
          </div>
        </form>
      </Modal>

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL: CONFIRM STATUS CHANGE (DEACTIVATE / ACTIVATE) */}
      {/* -------------------------------------------------------------------------- */}
      <Modal
        isOpen={confirmStatusModalOpen}
        onClose={() => setConfirmStatusModalOpen(false)}
        title={pendingStatusAction === 'active' ? 'Reactivate Employee Account' : 'Deactivate Employee Account'}
        description="Verify status transition and operational impact."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs pt-1">
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-950 text-xs block">
                {pendingStatusAction === 'active'
                  ? `Reactivate ${selectedTargetUser?.name}?`
                  : `Are you sure you want to deactivate ${selectedTargetUser?.name}?`}
              </span>
              <p className="text-[11px] text-amber-800">
                {pendingStatusAction === 'active'
                  ? 'Reactivating this employee will restore their system login privileges, order handling rights, and territory assignments.'
                  : 'Deactivating this employee will immediately revoke access to ERP modules, pending approval queues, and territory order dispatch. Historical records and audits will remain fully intact.'}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Employee ID:</span>
              <span className="font-mono font-bold text-slate-800">{selectedTargetUser?.employeeId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Department:</span>
              <span className="font-bold text-slate-800">{selectedTargetUser?.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">System Role:</span>
              <span className="font-bold text-slate-800">{selectedTargetUser?.role}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setConfirmStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={pendingStatusAction === 'active' ? 'primary' : 'danger'}
              size="sm"
              onClick={handleExecuteStatusChange}
            >
              {pendingStatusAction === 'active' ? 'Confirm Reactivation' : 'Confirm Deactivation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
