import { useState, useMemo } from 'react';
import {
  Plus,
  Eye,
  MapPin,
  Calendar,
  FileImage,
  Info,
  Receipt,
  Wallet,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import SearchFilterBar from '../components/common/SearchFilterBar';
import AddExpenseModal from '../components/modals/AddExpenseModal';
import ExpenseDetailModal from '../components/modals/ExpenseDetailModal';
import { useSales } from '../context/SalesContext';
import { formatINR, formatDate } from '../utils/formatters';
import { isEmployeeInRoleScope } from '../utils/roleScoping';

// Base verified payroll & incentive records for the logged-in sales representative
const BASE_PAYROLL_CREDITS = [
  {
    id: 'SAL-2026-10-01',
    date: '2026-10-01',
    description: 'Monthly Net Salary Credit - September 2026',
    category: 'Salary',
    amount: 85000,
    flow: 'credit',
    status: 'Credited',
    paymentMethod: 'Bank Direct Deposit',
    paymentDetails: 'HDFC Corporate Payroll • A/c ...4091 • UTR: HDFC991204192',
    notes: 'Monthly fixed compensation credited on 1st of month per company payroll calendar.',
  },
  {
    id: 'INC-2026-10-05',
    date: '2026-10-05',
    description: 'Q2 Performance Target Milestone Incentive',
    category: 'Bonus / Incentive',
    amount: 25000,
    flow: 'credit',
    status: 'Credited',
    paymentMethod: 'Bank Direct Deposit',
    paymentDetails: 'HDFC Corporate Payroll • A/c ...4091 • UTR: HDFC-INC-889104',
    notes: 'Approved quarterly quota accelerator bonus for exceeding Western region targets in Q2.',
  },
  {
    id: 'REIMB-2026-10-10',
    date: '2026-10-10',
    description: 'Expense Reimbursement Payout (October Batch 1)',
    category: 'Reimbursement Payout',
    amount: 9800,
    flow: 'credit',
    status: 'Credited',
    paymentMethod: 'Corporate Bank Transfer',
    paymentDetails: 'Apex Finance Disbursal • UTR: APX-REIMB-20261010-01',
    notes: 'Disbursement of approved field claims EXP-2026-051, EXP-2026-052, and EXP-2026-053.',
  },
  {
    id: 'SAL-2026-09-01',
    date: '2026-09-01',
    description: 'Monthly Net Salary Credit - August 2026',
    category: 'Salary',
    amount: 85000,
    flow: 'credit',
    status: 'Credited',
    paymentMethod: 'Bank Direct Deposit',
    paymentDetails: 'HDFC Corporate Payroll • A/c ...4091 • UTR: HDFC881029481',
    notes: 'Monthly fixed compensation credited on 1st of month.',
  },
  {
    id: 'REIMB-2026-10-01',
    date: '2026-10-01',
    description: 'Expense Reimbursement Payout (September Batch)',
    category: 'Reimbursement Payout',
    amount: 4050,
    flow: 'credit',
    status: 'Credited',
    paymentMethod: 'Corporate Bank Transfer',
    paymentDetails: 'Apex Finance Disbursal • BatchRef: PAYROLL-REIMB-SEP2026-B1',
    notes: 'Disbursement of September travel claims EXP-2026-048 and EXP-2026-049.',
  },
];

export default function ExpensesPage({ preselectedFilter = null }) {
  const { expenses, userProfile, userRole, employeeBudgets = [] } = useSales();

  // Three Tabs: 'expenses' (Expense Claims), 'budgets' (Employee Budgets & Utilization), 'wallet' (Employee Wallet)
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'budgets' | 'wallet'

  // Budgets Tab State
  const [budgetSearch, setBudgetSearch] = useState('');

  // Expenses Tab State
  const [selectedMonth, setSelectedMonth] = useState('2026-10'); // '2026-10' | '2026-09' | 'all'
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({
    approvalStatus: preselectedFilter || 'all',
    category: 'all',
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Wallet Tab State
  const [walletSearch, setWalletSearch] = useState('');
  const [walletFilterValues, setWalletFilterValues] = useState({
    type: 'all',
    category: 'all',
    status: 'all',
  });

  const expenseFilters = [
    {
      key: 'approvalStatus',
      label: 'Approval Status',
      options: [
        { value: 'Draft', label: 'Draft Claims' },
        { value: 'Submitted', label: 'Submitted (Pending Review)' },
        { value: 'Approved', label: 'Approved by Manager' },
        { value: 'Reimbursed', label: 'Reimbursed / Paid' },
        { value: 'Rejected', label: 'Rejected' },
      ],
    },
    {
      key: 'category',
      label: 'Category',
      options: [
        { value: 'Daily Field Allowance', label: 'Daily Field Allowance (₹800)' },
        { value: 'Local Travel Allowance', label: 'Local Travel Allowance (₹500)' },
        { value: 'Food Allowance', label: 'Food Allowance (₹450)' },
        { value: 'Fuel', label: 'Fuel & Mileage' },
        { value: 'Cab/Taxi', label: 'Cab / Local Transit' },
        { value: 'Accommodation', label: 'Hotel & Lodging (GST Bill)' },
        { value: 'Meals', label: 'Client Meals & Hospitality' },
        { value: 'Intercity Travel', label: 'Inter-City Travel' },
        { value: 'Tolls', label: 'Tolls & Parking' },
        { value: 'Miscellaneous', label: 'Miscellaneous' },
      ],
    },
  ];

  const walletFilters = [
    {
      key: 'type',
      label: 'Transaction Type',
      options: [
        { value: 'credit', label: 'Credits / Payouts (+₹)' },
        { value: 'claim_personal', label: 'Out-of-Pocket Claims' },
        { value: 'claim_card', label: 'Company Card Claims' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'Credited', label: 'Credited to Bank' },
        { value: 'Reimbursed', label: 'Reimbursed / Settled' },
        { value: 'Approved', label: 'Approved (Pending Payout)' },
        { value: 'Submitted', label: 'Pending Approval' },
        { value: 'Rejected', label: 'Rejected' },
        { value: 'Draft', label: 'Draft' },
      ],
    },
  ];

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSearch('');
    setFilterValues({ approvalStatus: 'all', category: 'all' });
  };

  const handleWalletFilterChange = (key, value) => {
    setWalletFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleWalletReset = () => {
    setWalletSearch('');
    setWalletFilterValues({ type: 'all', category: 'all', status: 'all' });
  };

  // Role-Scoped base list for expenses
  const scopedExpenses = useMemo(() => {
    return expenses.filter((e) =>
      isEmployeeInRoleScope(e.employeeId || e.employeeName, userRole, userProfile)
    );
  }, [expenses, userRole, userProfile]);

  // Role-Scoped base list for employee budgets
  const scopedBudgets = useMemo(() => {
    return employeeBudgets.filter((b) =>
      isEmployeeInRoleScope(b, userRole, userProfile)
    );
  }, [employeeBudgets, userRole, userProfile]);

  // Filtered employee budgets
  const filteredBudgets = useMemo(() => {
    if (!budgetSearch.trim()) return scopedBudgets;
    const s = budgetSearch.toLowerCase();
    return scopedBudgets.filter(
      (b) =>
        b.employeeName?.toLowerCase().includes(s) ||
        b.employeeId?.toLowerCase().includes(s) ||
        b.assignedArea?.toLowerCase().includes(s) ||
        b.roleLabel?.toLowerCase().includes(s)
    );
  }, [scopedBudgets, budgetSearch]);

  // Budgets KPI summary
  const budgetMetrics = useMemo(() => {
    const totalAllocated = scopedBudgets.reduce((sum, b) => sum + Number(b.allocatedBudget || 0), 0);
    const totalUsed = scopedBudgets.reduce((sum, b) => sum + Number(b.amountUsed || 0), 0);
    const totalRemaining = scopedBudgets.reduce((sum, b) => sum + Number(b.remainingBudget || 0), 0);
    const totalRequested = scopedBudgets.reduce((sum, b) => sum + Number(b.additionalAmountRequested || 0), 0);
    return {
      totalAllocated,
      totalUsed,
      totalRemaining,
      totalRequested,
      count: scopedBudgets.length,
    };
  }, [scopedBudgets]);

  // Month-filtered base list for expenses
  const monthExpenses = useMemo(() => {
    if (selectedMonth === 'all') return scopedExpenses;
    return scopedExpenses.filter(
      (e) => (e.expenseMonth === selectedMonth) || (e.tripDate && e.tripDate.startsWith(selectedMonth))
    );
  }, [scopedExpenses, selectedMonth]);

  // Metrics for selected expense month
  const metrics = useMemo(() => {
    const totalSubmitted = monthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const approved = monthExpenses.filter(
      (e) => e.approvalStatus === 'Approved' || e.reimbursementStatus === 'Paid'
    );
    const approvedVal = approved.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const pending = monthExpenses.filter((e) => e.approvalStatus === 'Submitted');
    const pendingVal = pending.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const reimbursed = monthExpenses.filter((e) => e.reimbursementStatus === 'Paid');
    const reimbursedVal = reimbursed.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    return {
      totalCount: monthExpenses.length,
      totalVal: totalSubmitted,
      approvedVal,
      pendingCount: pending.length,
      pendingVal,
      reimbursedVal,
    };
  }, [monthExpenses]);

  // Filtered rows for Expense Claims DataTable
  const filteredExpenses = useMemo(() => {
    return monthExpenses.filter((e) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search.trim() ||
        e.id?.toLowerCase().includes(searchLower) ||
        e.destination?.toLowerCase().includes(searchLower) ||
        e.purpose?.toLowerCase().includes(searchLower) ||
        e.customerName?.toLowerCase().includes(searchLower) ||
        e.category?.toLowerCase().includes(searchLower);

      const matchesStatus =
        filterValues.approvalStatus === 'all' ||
        (filterValues.approvalStatus === 'Reimbursed'
          ? e.reimbursementStatus === 'Paid'
          : e.approvalStatus === filterValues.approvalStatus);

      const matchesCat =
        filterValues.category === 'all' || e.category === filterValues.category;

      return matchesSearch && matchesStatus && matchesCat;
    });
  }, [monthExpenses, search, filterValues]);

  // Construct dynamic Wallet transactions combining verified payroll credits and live expense claims
  const walletTransactions = useMemo(() => {
    // 1. Static/Verified Payroll credits
    const credits = BASE_PAYROLL_CREDITS.map((c) => ({
      ...c,
      isExpense: false,
      rawExpense: null,
    }));

    // 2. Dynamic Expense Claims from active state
    const expenseTxns = expenses.map((e) => {
      const isCard = e.paymentMethod === 'Company Card';
      let derivedStatus = e.approvalStatus;
      if (e.reimbursementStatus === 'Paid' || e.approvalStatus === 'Reimbursed') {
        derivedStatus = 'Reimbursed';
      } else if (e.approvalStatus === 'Approved') {
        derivedStatus = 'Approved'; // Approved, pending payout
      } else if (e.approvalStatus === 'Submitted') {
        derivedStatus = 'Submitted';
      }

      return {
        id: e.id,
        date: e.tripDate || e.submissionDate || '2026-10-15',
        description: `${e.category}: ${e.purpose}${e.customerName ? ` (${e.customerName})` : ''}`,
        category: e.category || 'Expense Claim',
        amount: Number(e.amount || 0),
        flow: isCard ? 'claim_card' : 'claim_personal',
        status: derivedStatus,
        paymentMethod: e.paymentMethod || 'Personal UPI',
        paymentDetails: isCard
          ? 'Corporate Card (Direct Company Billed)'
          : `Out-of-Pocket (${e.paymentMethod || 'Personal UPI'})${e.referenceNo ? ` • Ref: ${e.referenceNo}` : ''}`,
        notes: e.reviewerRemark || (e.destination ? `Route: ${e.origin || 'HQ'} → ${e.destination}` : ''),
        isExpense: true,
        rawExpense: e,
      };
    });

    // Combine and sort chronologically descending (newest first)
    return [...credits, ...expenseTxns].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses]);

  // Filtered Wallet transactions
  const filteredWalletTransactions = useMemo(() => {
    return walletTransactions.filter((t) => {
      const searchLower = walletSearch.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        t.id?.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower) ||
        t.category?.toLowerCase().includes(searchLower) ||
        t.paymentDetails?.toLowerCase().includes(searchLower) ||
        t.paymentMethod?.toLowerCase().includes(searchLower) ||
        t.notes?.toLowerCase().includes(searchLower);

      const matchesType =
        walletFilterValues.type === 'all' ||
        (walletFilterValues.type === 'credit' && t.flow === 'credit') ||
        (walletFilterValues.type === 'claim_personal' && t.flow === 'claim_personal') ||
        (walletFilterValues.type === 'claim_card' && t.flow === 'claim_card');

      const matchesStatus =
        walletFilterValues.status === 'all' || t.status === walletFilterValues.status;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [walletTransactions, walletSearch, walletFilterValues]);

  // Wallet KPI metrics
  const walletMetrics = useMemo(() => {
    // Total Credits received (salary + bonuses + reimbursements)
    const totalCredits = BASE_PAYROLL_CREDITS.reduce((sum, c) => sum + c.amount, 0);

    // Actual reimbursements received
    const reimbursementsReceived = BASE_PAYROLL_CREDITS
      .filter((c) => c.category === 'Reimbursement Payout')
      .reduce((sum, c) => sum + c.amount, 0);

    // Personal out-of-pocket claims
    const personalExpenses = expenses.filter((e) => e.paymentMethod !== 'Company Card');

    // Approved out-of-pocket claims not yet paid (Outstanding Payable to Employee)
    const approvedUnpaidPersonal = personalExpenses
      .filter((e) => e.approvalStatus === 'Approved' && e.reimbursementStatus !== 'Paid')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // Submitted claims pending manager approval
    const pendingApprovalPersonal = personalExpenses
      .filter((e) => e.approvalStatus === 'Submitted')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // Total claims under review (pending approval)
    const allPendingApproval = expenses
      .filter((e) => e.approvalStatus === 'Submitted')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // Total out-of-pocket recoverable by employee (Approved + Pending)
    const totalOutstandingOwedToEmployee = approvedUnpaidPersonal + pendingApprovalPersonal;

    return {
      totalCredits,
      reimbursementsReceived,
      approvedPayable: approvedUnpaidPersonal,
      pendingApproval: allPendingApproval,
      outstandingOwed: totalOutstandingOwedToEmployee,
      claimCount: expenses.length,
    };
  }, [expenses]);

  const handleExportWalletCSV = () => {
    if (filteredWalletTransactions.length === 0) return;
    const headers = ['Txn ID', 'Date', 'Description', 'Category', 'Type', 'Amount (INR)', 'Status', 'Payment Details', 'Notes'];
    const rows = filteredWalletTransactions.map((t) => [
      t.id,
      t.date,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.category,
      t.flow === 'credit' ? 'Credit (+)' : 'Claim (-)',
      t.amount,
      t.status,
      `"${(t.paymentDetails || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Employee_Wallet_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Category badge styling helper for Expense Claims
  const getCategoryBadgeStyle = (cat) => {
    switch (cat) {
      case 'Fuel':
        return { bg: '#fffbeb', text: '#b45309', border: '#fde68a' };
      case 'Meals':
        return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' };
      case 'Accommodation':
        return { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' };
      case 'Cab/Taxi':
      case 'Intercity Travel':
        return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' };
      case 'Tolls':
        return { bg: '#f8fafc', text: '#334155', border: '#cbd5e1' };
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  };

  const columns = [
    {
      header: 'Claim ID',
      key: 'id',
      width: '135px',
      minWidth: '125px',
      render: (e) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => setSelectedExpense(e)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '13px',
              fontWeight: '700',
              color: '#1d4ed8',
              whiteSpace: 'nowrap',
            }}
          >
            {e.id}
          </button>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#64748b', whiteSpace: 'nowrap' }}>
            <Calendar size={12} style={{ flexShrink: 0, color: '#94a3b8' }} />
            {formatDate(e.tripDate)}
          </span>
        </div>
      ),
    },
    ...(userRole !== 'sales_rep' && userRole !== 'junior_sales'
      ? [
          {
            header: 'Employee',
            key: 'employeeName',
            width: '150px',
            minWidth: '135px',
            render: (e) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>
                  {e.employeeName || 'Vikram Mehta'}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                  {e.employeeId || 'APX-EMP-4091'}
                </span>
              </div>
            ),
          },
        ]
      : []),
    {
      header: 'Expense Month',
      key: 'expenseMonth',
      width: '120px',
      minWidth: '115px',
      align: 'center',
      render: (e) => (
        <span
          style={{
            display: 'inline-block',
            padding: '3px 9px',
            borderRadius: '6px',
            fontSize: '11.5px',
            fontWeight: '600',
            backgroundColor: '#f1f5f9',
            color: '#334155',
            border: '1px solid #e2e8f0',
            whiteSpace: 'nowrap',
          }}
        >
          {e.expenseMonth || (e.tripDate ? e.tripDate.substring(0, 7) : '2026-10')}
        </span>
      ),
    },
    {
      header: 'Category',
      key: 'category',
      width: '145px',
      minWidth: '135px',
      align: 'center',
      render: (e) => {
        const style = getCategoryBadgeStyle(e.category);
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: '9999px',
              fontSize: '11.5px',
              fontWeight: '600',
              backgroundColor: style.bg,
              color: style.text,
              border: `1px solid ${style.border}`,
              whiteSpace: 'nowrap',
            }}
          >
            {e.category}
          </span>
        );
      },
    },
    {
      header: 'Purpose / Linked Customer',
      width: '240px',
      minWidth: '200px',
      render: (e) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', lineHeight: '1.4', wordBreak: 'break-word' }}>
            {e.purpose}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#64748b', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <MapPin size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span>{e.destination}</span>
            </span>
            {e.customerName && (
              <>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span style={{ color: '#475569', fontWeight: '500' }}>{e.customerName}</span>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Amount (₹)',
      key: 'amount',
      width: '130px',
      minWidth: '115px',
      align: 'right',
      render: (e) => (
        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              fontSize: '13.5px',
              fontWeight: '700',
              color: '#0f172a',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
              display: 'block',
            }}
          >
            {formatINR(e.amount)}
          </span>
          <span
            style={{
              display: 'inline-block',
              fontSize: '10.5px',
              color: '#64748b',
              marginTop: '2px',
              whiteSpace: 'nowrap',
            }}
          >
            {e.paymentMethod || 'Out-of-Pocket'}
          </span>
        </div>
      ),
    },
    {
      header: 'Budget Scope',
      key: 'claimType',
      width: '125px',
      minWidth: '115px',
      align: 'center',
      render: (e) => {
        const isAdditional = e.claimType === 'Additional Request';
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2.5px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '700',
              backgroundColor: isAdditional ? '#fffbeb' : '#f0fdf4',
              color: isAdditional ? '#b45309' : '#15803d',
              border: isAdditional ? '1px solid #fde68a' : '1px solid #bbf7d0',
              whiteSpace: 'nowrap',
            }}
          >
            {isAdditional ? 'Additional Req' : 'Within Budget'}
          </span>
        );
      },
    },
    {
      header: 'Receipt',
      key: 'receipt',
      width: '110px',
      minWidth: '100px',
      align: 'center',
      render: (e) =>
        e.receiptAttached || e.receiptPreview || e.receiptFileName ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: '#0369a1',
              backgroundColor: '#e0f2fe',
              border: '1px solid #bae6fd',
              padding: '2.5px 8px',
              borderRadius: '4px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
            }}
          >
            <FileImage size={12} style={{ flexShrink: 0 }} /> Attached
          </span>
        ) : (
          <span
            style={{
              display: 'inline-block',
              fontSize: '11px',
              color: '#64748b',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '2.5px 8px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            Manual Entry
          </span>
        ),
    },
    {
      header: 'Approval Status',
      key: 'approvalStatus',
      width: '135px',
      minWidth: '125px',
      align: 'center',
      render: (e) => <StatusBadge status={e.approvalStatus} size="small" />,
    },
    {
      header: 'Reimbursement & Payroll Batch',
      key: 'reimbursement',
      width: '210px',
      minWidth: '190px',
      render: (e) => {
        const isCurrentMonth = (e.expenseMonth === '2026-10') || (e.tripDate && e.tripDate.startsWith('2026-10'));
        const isPaid = e.reimbursementStatus === 'Paid';
        const batchDesc = e.reimbursementBatch
          ? e.reimbursementBatch
          : isPaid
          ? 'Paid in Oct 2026 Payroll Batch'
          : isCurrentMonth
          ? 'Scheduled: Nov 2026 Payroll Batch'
          : 'Pending Next Payroll Cycle';

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  whiteSpace: 'nowrap',
                  backgroundColor: isPaid ? '#ecfdf5' : '#fffbeb',
                  color: isPaid ? '#065f46' : '#92400e',
                  border: isPaid ? '1px solid #a7f3d0' : '1px solid #fde68a',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: isPaid ? '#10b981' : '#f59e0b',
                    flexShrink: 0,
                  }}
                />
                {isPaid ? 'Reimbursed' : 'Pending Payroll'}
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: '1.35', wordBreak: 'break-word' }}>
              {batchDesc}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Action',
      width: '70px',
      minWidth: '65px',
      align: 'center',
      render: (e) => (
        <button
          type="button"
          className="table-action-icon-btn"
          onClick={() => setSelectedExpense(e)}
          title="Inspect expense claim details"
        >
          <Eye size={15} />
        </button>
      ),
    },
  ];

  // Employee Budgets & Utilization Columns
  const budgetColumns = [
    {
      header: 'Employee',
      key: 'employeeName',
      width: '200px',
      minWidth: '180px',
      render: (b) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
            {b.employeeName}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {b.roleLabel} • <code style={{ fontSize: '10.5px' }}>{b.employeeId}</code>
          </span>
        </div>
      ),
    },
    {
      header: 'Assigned Territory / Area',
      key: 'assignedArea',
      width: '240px',
      minWidth: '200px',
      render: (b) => (
        <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: '500' }}>
          {b.assignedArea}
        </span>
      ),
    },
    {
      header: 'Budget Period',
      key: 'budgetPeriod',
      width: '130px',
      minWidth: '120px',
      align: 'center',
      render: (b) => (
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
          {b.budgetPeriod}
        </span>
      ),
    },
    {
      header: 'Allocated Budget',
      key: 'allocatedBudget',
      width: '140px',
      minWidth: '130px',
      align: 'right',
      render: (b) => (
        <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
          {formatINR(b.allocatedBudget)}
        </span>
      ),
    },
    {
      header: 'Amount Used / %',
      key: 'amountUsed',
      width: '170px',
      minWidth: '150px',
      render: (b) => {
        const pct = b.allocatedBudget > 0 ? Math.round((b.amountUsed / b.allocatedBudget) * 100) : 0;
        const barColor = pct > 90 ? '#dc2626' : pct > 65 ? '#d97706' : '#2563eb';
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
              <span style={{ fontWeight: '600', color: '#0f172a' }}>{formatINR(b.amountUsed)}</span>
              <span style={{ fontSize: '11px', color: barColor, fontWeight: '700' }}>{pct}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', backgroundColor: barColor, borderRadius: '9999px' }} />
            </div>
          </div>
        );
      },
    },
    {
      header: 'Remaining Available',
      key: 'remainingBudget',
      width: '150px',
      minWidth: '130px',
      align: 'right',
      render: (b) => (
        <span style={{ fontSize: '13.5px', fontWeight: '700', color: b.remainingBudget > 0 ? '#16a34a' : '#dc2626' }}>
          {formatINR(b.remainingBudget)}
        </span>
      ),
    },
    {
      header: 'Additional Requested',
      key: 'additionalAmountRequested',
      width: '160px',
      minWidth: '140px',
      align: 'right',
      render: (b) => (
        b.additionalAmountRequested > 0 ? (
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#d97706', backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '4px' }}>
            +{formatINR(b.additionalAmountRequested)}
          </span>
        ) : (
          <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
        )
      ),
    },
    {
      header: 'Status',
      key: 'approvalStatus',
      width: '130px',
      minWidth: '120px',
      align: 'center',
      render: (b) => <StatusBadge status={b.approvalStatus} size="small" />,
    },
  ];

  // Wallet Transaction History Columns
  const walletColumns = [
    {
      header: 'Date & Ref',
      key: 'date',
      width: '135px',
      minWidth: '125px',
      render: (t) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
            {formatDate(t.date)}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#64748b',
              backgroundColor: '#f1f5f9',
              padding: '1px 6px',
              borderRadius: '3px',
              width: 'fit-content',
              whiteSpace: 'nowrap',
            }}
          >
            {t.id}
          </span>
        </div>
      ),
    },
    {
      header: 'Description & Memo',
      key: 'description',
      width: '280px',
      minWidth: '240px',
      render: (t) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', lineHeight: '1.4', wordBreak: 'break-word' }}>
            {t.description}
          </div>
          {t.notes && (
            <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: '1.35', wordBreak: 'break-word' }}>
              {t.notes}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Category',
      key: 'category',
      width: '140px',
      minWidth: '130px',
      align: 'center',
      render: (t) => {
        const isSalary = t.category === 'Salary';
        const isIncentive = t.category === 'Bonus / Incentive';
        const isPayout = t.category === 'Reimbursement Payout';
        const bg = isSalary ? '#eff6ff' : isIncentive ? '#faf5ff' : isPayout ? '#ecfdf5' : '#f1f5f9';
        const color = isSalary ? '#1d4ed8' : isIncentive ? '#7e22ce' : isPayout ? '#047857' : '#334155';
        const border = isSalary ? '#bfdbfe' : isIncentive ? '#e9d5ff' : isPayout ? '#a7f3d0' : '#cbd5e1';

        return (
          <span
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: '9999px',
              fontSize: '11.5px',
              fontWeight: '600',
              backgroundColor: bg,
              color: color,
              border: `1px solid ${border}`,
              whiteSpace: 'nowrap',
            }}
          >
            {t.category}
          </span>
        );
      },
    },
    {
      header: 'Payment / Credit Details',
      key: 'paymentDetails',
      width: '240px',
      minWidth: '220px',
      render: (t) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
            {t.paymentMethod}
          </span>
          <span
            style={{
              fontSize: '11px',
              color: '#64748b',
              lineHeight: '1.35',
              fontFamily: t.paymentDetails?.includes('UTR') || t.paymentDetails?.includes('••••') ? 'monospace' : 'inherit',
              wordBreak: 'break-word',
            }}
          >
            {t.paymentDetails}
          </span>
        </div>
      ),
    },
    {
      header: 'Amount (₹)',
      key: 'amount',
      width: '150px',
      minWidth: '140px',
      align: 'right',
      render: (t) => {
        const isCredit = t.flow === 'credit';
        return (
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: '700',
                color: isCredit ? '#16a34a' : '#0f172a',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {isCredit ? `+${formatINR(t.amount)}` : formatINR(t.amount)}
            </span>
            <span
              style={{
                display: 'inline-block',
                fontSize: '10.5px',
                fontWeight: '500',
                color: isCredit ? '#15803d' : '#64748b',
                backgroundColor: isCredit ? '#f0fdf4' : '#f8fafc',
                border: isCredit ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                padding: '1px 6px',
                borderRadius: '3px',
                marginTop: '2px',
                whiteSpace: 'nowrap',
              }}
            >
              {isCredit ? 'Direct Credit' : t.flow === 'claim_card' ? 'Company Card' : 'Personal Out-of-Pocket'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      key: 'status',
      width: '135px',
      minWidth: '125px',
      align: 'center',
      render: (t) => {
        if (t.status === 'Credited') {
          return (
            <span className="status-badge badge-success badge-sm">
              <span className="badge-dot" aria-hidden="true"></span>
              Credited
            </span>
          );
        }
        return <StatusBadge status={t.status} size="small" />;
      },
    },
    {
      header: 'Action',
      width: '70px',
      minWidth: '65px',
      align: 'center',
      render: (t) =>
        t.isExpense && t.rawExpense ? (
          <button
            type="button"
            className="table-action-icon-btn"
            onClick={() => setSelectedExpense(t.rawExpense)}
            title="View original expense receipt & claim details"
          >
            <Eye size={15} />
          </button>
        ) : (
          <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
        ),
    },
  ];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row mb-4">
        <div>
          <h2 className="page-title">Expenses &amp; Wallet</h2>
          <p className="page-description">
            Track sales travel claims, payroll reimbursements, monthly salary history, and employee wallet balance
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'wallet' && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-icon-text"
              onClick={handleExportWalletCSV}
              title="Download Wallet statement as CSV"
            >
              <FileSpreadsheet size={15} />
              <span>Export Statement</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary btn-sm btn-icon-text"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={15} />
            <span>New Expense Claim</span>
          </button>
        </div>
      </div>

      {/* Three Clean View Tabs */}
      <div className="tab-navigation-bar mb-4">
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('expenses');
            handleReset();
          }}
        >
          <Receipt size={16} />
          <span>Expense Claims ({filteredExpenses.length})</span>
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'budgets' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('budgets');
            setBudgetSearch('');
          }}
        >
          <Users size={16} />
          <span>Employee Budgets &amp; Utilization ({scopedBudgets.length})</span>
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'wallet' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('wallet');
            handleWalletReset();
          }}
        >
          <Wallet size={16} />
          <span>Wallet &amp; Financial Ledger</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: EXPENSE CLAIMS (Preserved Existing Functionality) */}
      {/* ============================================================== */}
      {activeTab === 'expenses' && (
        <>
          {/* Month Selector & Policy Notice */}
          <div
            className="card mb-4"
            style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                Expense Accounting Month:
              </span>
              <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedMonth('2026-10')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: selectedMonth === '2026-10' ? '#ffffff' : 'transparent',
                    color: selectedMonth === '2026-10' ? '#2563eb' : '#64748b',
                    boxShadow: selectedMonth === '2026-10' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  October 2026 (Current)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMonth('2026-09')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: selectedMonth === '2026-09' ? '#ffffff' : 'transparent',
                    color: selectedMonth === '2026-09' ? '#2563eb' : '#64748b',
                    boxShadow: selectedMonth === '2026-09' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  September 2026
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMonth('all')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: selectedMonth === 'all' ? '#ffffff' : 'transparent',
                    color: selectedMonth === 'all' ? '#2563eb' : '#64748b',
                    boxShadow: selectedMonth === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  All Periods
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px' }}>
              <Info size={14} color="#3b82f6" />
              <span>
                <strong>Reimbursement Rule:</strong> Expenses incurred in Month M are reimbursed in Month M+1 salary batch.
              </span>
            </div>
          </div>

          {/* Compact Summary KPI Cards for Selected Month */}
          <div className="summary-kpi-grid">
            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
              <div className="summary-kpi-label">Total Claims ({selectedMonth === 'all' ? 'All Time' : selectedMonth})</div>
              <div className="summary-kpi-value">{formatINR(metrics.totalVal)}</div>
              <div className="summary-kpi-sub">{metrics.totalCount} expense line items</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
              <div className="summary-kpi-label">Pending Approval</div>
              <div className="summary-kpi-value text-warning">{formatINR(metrics.pendingVal)}</div>
              <div className="summary-kpi-sub">{metrics.pendingCount} claims awaiting sign-off</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
              <div className="summary-kpi-label">Approved for Settlement</div>
              <div className="summary-kpi-value text-success">{formatINR(metrics.approvedVal)}</div>
              <div className="summary-kpi-sub">Cleared by Sales Manager</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #059669' }}>
              <div className="summary-kpi-label">Reimbursed to Salary</div>
              <div className="summary-kpi-value" style={{ color: '#059669' }}>{formatINR(metrics.reimbursedVal)}</div>
              <div className="summary-kpi-sub">Paid via bank payroll batch</div>
            </div>
          </div>

          <SearchFilterBar
            searchPlaceholder="Search expenses by ID, destination, purpose, or customer..."
            searchValue={search}
            onSearchChange={setSearch}
            filters={expenseFilters}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />

          <DataTable
            columns={columns}
            data={filteredExpenses}
            keyField="id"
            emptyMessage="No expense claims found for the selected criteria"
            pageSize={8}
            minWidth="1180px"
          />
        </>
      )}

      {/* ============================================================== */}
      {/* TAB 2: EMPLOYEE BUDGETS & UTILIZATION */}
      {/* ============================================================== */}
      {activeTab === 'budgets' && (
        <>
          {/* Header Policy Notice */}
          <div
            className="card mb-4"
            style={{
              padding: '14px 18px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#2563eb" />
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  Pre-Assigned Employee Budgets &amp; Territory Allocations
                </h3>
                <span className="badge-primary text-xs px-2 py-0.5 rounded">
                  Scope: {userRole === 'sales_manager' ? 'All Sales Org' : userRole === 'sales_coordinator' ? 'Regional Team' : 'Individual'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
                Budgets are pre-assigned based on territory assignments and planned customer visits. Claims exceeding budget require dual Manager &amp; Finance approval.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Active Period: <strong>October 2026</strong>
              </span>
            </div>
          </div>

          {/* Budget KPI Summary Cards */}
          <div className="summary-kpi-grid">
            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
              <div className="summary-kpi-label">Total Allocated Budget</div>
              <div className="summary-kpi-value">{formatINR(budgetMetrics.totalAllocated)}</div>
              <div className="summary-kpi-sub">{budgetMetrics.count} authorized employees</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #d97706' }}>
              <div className="summary-kpi-label">Budget Utilized</div>
              <div className="summary-kpi-value" style={{ color: '#d97706' }}>{formatINR(budgetMetrics.totalUsed)}</div>
              <div className="summary-kpi-sub">
                {budgetMetrics.totalAllocated > 0
                  ? `${Math.round((budgetMetrics.totalUsed / budgetMetrics.totalAllocated) * 100)}% overall utilization`
                  : '0%'}
              </div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #16a34a' }}>
              <div className="summary-kpi-label">Remaining Available</div>
              <div className="summary-kpi-value text-success">{formatINR(budgetMetrics.totalRemaining)}</div>
              <div className="summary-kpi-sub">Available for current cycle</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #dc2626' }}>
              <div className="summary-kpi-label">Additional Requests Pending</div>
              <div className="summary-kpi-value" style={{ color: budgetMetrics.totalRequested > 0 ? '#dc2626' : '#64748b' }}>
                {formatINR(budgetMetrics.totalRequested)}
              </div>
              <div className="summary-kpi-sub">
                {budgetMetrics.totalRequested > 0 ? 'Requires Manager & Finance review' : 'No pending excess claims'}
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <input
              type="text"
              className="form-input"
              placeholder="Search budgets by employee name, ID, territory, or role..."
              value={budgetSearch}
              onChange={(e) => setBudgetSearch(e.target.value)}
              style={{ maxWidth: '400px' }}
            />
            {budgetSearch && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setBudgetSearch('')}
              >
                Clear
              </button>
            )}
          </div>

          <DataTable
            columns={budgetColumns}
            data={filteredBudgets}
            keyField="employeeId"
            emptyMessage="No employee budget records found for your current role scope"
            pageSize={10}
            minWidth="1100px"
          />
        </>
      )}

      {/* ============================================================== */}
      {/* TAB 3: WALLET & EMPLOYEE FINANCIAL LEDGER */}
      {/* ============================================================== */}
      {activeTab === 'wallet' && (
        <>
          {/* Employee Header & Financial Summary Cards */}
          <div
            className="card mb-4"
            style={{
              padding: '16px 20px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={18} color="#2563eb" />
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  {userProfile?.fullName || 'Vikram Mehta'}&apos;s Official Employee Wallet
                </h3>
                <span className="badge-primary text-xs px-2 py-0.5 rounded">
                  {userProfile?.employeeId || 'APX-EMP-4091'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
                Consolidated ledger of monthly salary credits, sales incentives, expense reimbursements, and outstanding claim balances.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span className="text-xs text-muted">
                Salary Account: <strong>HDFC Bank ••••4091 (Active)</strong>
              </span>
            </div>
          </div>

          {/* Wallet Summary KPI Cards */}
          <div className="summary-kpi-grid">
            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
              <div className="summary-kpi-label">Total Credits (FY YTD)</div>
              <div className="summary-kpi-value">{formatINR(walletMetrics.totalCredits)}</div>
              <div className="summary-kpi-sub">Salary, bonuses &amp; payouts</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
              <div className="summary-kpi-label">Reimbursements Received</div>
              <div className="summary-kpi-value text-success">{formatINR(walletMetrics.reimbursementsReceived)}</div>
              <div className="summary-kpi-sub">Paid out to bank account</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #059669' }}>
              <div className="summary-kpi-label">Approved (Pending Payout)</div>
              <div className="summary-kpi-value text-success">{formatINR(walletMetrics.approvedPayable)}</div>
              <div className="summary-kpi-sub">Queued for next payroll cycle</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
              <div className="summary-kpi-label">Pending Approval</div>
              <div className="summary-kpi-value text-warning">{formatINR(walletMetrics.pendingApproval)}</div>
              <div className="summary-kpi-sub">Claims under manager review</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #8b5cf6' }}>
              <div className="summary-kpi-label">Outstanding Owed to Rep</div>
              <div className="summary-kpi-value" style={{ color: '#7c3aed' }}>
                {formatINR(walletMetrics.outstandingOwed)}
              </div>
              <div className="summary-kpi-sub">Approved + Submitted claims</div>
            </div>
          </div>

          <SearchFilterBar
            searchPlaceholder="Search wallet by description, category, claim ID, or UTR reference..."
            searchValue={walletSearch}
            onSearchChange={setWalletSearch}
            filters={walletFilters}
            filterValues={walletFilterValues}
            onFilterChange={handleWalletFilterChange}
            onReset={handleWalletReset}
          />

          <DataTable
            columns={walletColumns}
            data={filteredWalletTransactions}
            keyField="id"
            emptyMessage="No wallet transactions match your filter criteria"
            pageSize={10}
            minWidth="1140px"
          />
        </>
      )}

      {/* Add Expense Modal with 2 Entry Methods: Upload vs Manual */}
      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        isOpen={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
      />
    </div>
  );
}
