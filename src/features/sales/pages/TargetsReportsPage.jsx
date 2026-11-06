import { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Users,
  Package,
  Award,
  Printer,
  Sliders,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
  DollarSign,
  Briefcase,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import PerformanceTrendChart from '../components/charts/PerformanceTrendChart';
import QuotationOrderBarChart from '../components/charts/QuotationOrderBarChart';
import TeamPerformanceComparisonChart from '../components/charts/TeamPerformanceComparisonChart';
import QuotationOrderDrilldownModal from '../components/modals/QuotationOrderDrilldownModal';
import EmployeePerformanceDetailModal from '../components/modals/EmployeePerformanceDetailModal';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import StatusBadge from '../components/common/StatusBadge';
import { useSales } from '../context/SalesContext';
import { useToast } from '../context/ToastContext';
import { formatINR, formatDate } from '../utils/formatters';
import {
  FIVE_YEAR_PERFORMANCE,
  TEAM_PERFORMANCE_ROSTER,
} from '../data/historicalPerformanceData';

export default function TargetsReportsPage() {
  const {
    orders = [],
    quotations = [],
    invoices = [],
    userProfile,
    userRole,
    products = [],
    commissionPolicy,
    updateCommissionPolicy,
    navigateTo,
  } = useSales();
  const { showToast } = useToast();

  const isManagerOrCoordinator = ['sales_manager', 'sales_coordinator', 'admin'].includes(userRole);

  // Main Tabs: 'my-performance' | 'team-performance'
  const [activeTab, setActiveTab] = useState('my-performance');

  // Chart View Tabs: 'trend' | 'quotation-analysis'
  const [activeChartTab, setActiveChartTab] = useState('trend');

  // Reporting Period Selectors
  const [selectedYear, setSelectedYear] = useState('2026');
  const [reportingCadence, setReportingCadence] = useState('Monthly'); // 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly' | 'MTD' | 'YTD'
  const [selectedMonth, setSelectedMonth] = useState('all'); // 'all' | 'January' .. 'December'
  const [selectedQuarter, setSelectedQuarter] = useState('all'); // 'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4'

  // Team Performance Filters & Selected Employee Drill-down
  const [teamEmployeeFilter, setTeamEmployeeFilter] = useState('all');
  const [teamRoleFilter, setTeamRoleFilter] = useState('all');
  const [selectedTeamEmployee, setSelectedTeamEmployee] = useState(null);

  // Interactive Chart Drill-down State
  const [drilldownCohort, setDrilldownCohort] = useState(null);

  // Admin Commission Configuration Modal State
  const [isAdminConfigOpen, setIsAdminConfigOpen] = useState(false);
  const [configRule, setConfigRule] = useState(commissionPolicy?.rule || 'above_target_only');
  const [configRateAboveTarget, setConfigRateAboveTarget] = useState(
    ((commissionPolicy?.rateAboveTarget ?? 0.05) * 100).toString()
  );
  const [configBaseRate, setConfigBaseRate] = useState(
    ((commissionPolicy?.baseRate ?? 0.0) * 100).toString()
  );
  const [simSales, setSimSales] = useState('1500000');
  const [simTarget, setSimTarget] = useState('1200000');

  // 1. Resolve Historical Performance Data for the Selected Year & Filters
  const rawYearData = FIVE_YEAR_PERFORMANCE[selectedYear] || FIVE_YEAR_PERFORMANCE['2026'];

  const filteredTrendData = useMemo(() => {
    return rawYearData.filter((d) => {
      if (selectedMonth !== 'all' && d.month !== selectedMonth) return false;
      if (selectedQuarter !== 'all' && d.quarter !== selectedQuarter) return false;
      return true;
    });
  }, [rawYearData, selectedMonth, selectedQuarter]);

  // 2. Multiplier based on reporting cadence
  const cadenceMultiplier = useMemo(() => {
    switch (reportingCadence) {
      case 'Daily':
        return 0.035;
      case 'Weekly':
        return 0.24;
      case 'Quarterly':
        return 3.0;
      case 'Half-Yearly':
        return 6.0;
      case 'Yearly':
      case 'YTD':
        return 10.0;
      case 'MTD':
      case 'Monthly':
      default:
        return 1.0;
    }
  }, [reportingCadence]);

  // 3. User Assigned Quota (Quantity & Value)
  const userPerformanceRecord = useMemo(() => {
    return (
      TEAM_PERFORMANCE_ROSTER.find((emp) => emp.employeeId === userProfile.employeeId) ||
      TEAM_PERFORMANCE_ROSTER[0]
    );
  }, [userProfile.employeeId]);

  // Dynamic Quota Quantity and Value
  const assignedQuotaQty = Math.round((userPerformanceRecord.quotaQty || 180) * cadenceMultiplier);
  const assignedQuotaValue = Math.round((userPerformanceRecord.quotaValue || 1200000) * cadenceMultiplier);

  // 4. Achieved Net Sales (Quantity & Value) from actual eligible orders
  const repOrders = useMemo(() => {
    return orders.filter((o) => o.fulfilmentStatus !== 'Cancelled');
  }, [orders]);

  const baseSalesSum = useMemo(() => {
    return repOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  }, [repOrders]);

  const baseSalesQtySum = useMemo(() => {
    return repOrders.reduce(
      (sum, o) => sum + o.items.reduce((iSum, it) => iSum + Number(it.orderedQty || 0), 0),
      0
    );
  }, [repOrders]);

  const yearScale = selectedYear === '2026' ? 1.0 : Number(selectedYear) / 2026;
  const achievedNetSalesValue = Math.round(baseSalesSum * cadenceMultiplier * yearScale);
  const achievedSalesQty = Math.round(baseSalesQtySum * cadenceMultiplier * yearScale);

  const achievementPercentage = assignedQuotaValue > 0 ? Math.round((achievedNetSalesValue / assignedQuotaValue) * 100) : 0;

  // 5. Remaining Sales (Quantity & Value)
  const remainingSalesValue = Math.max(0, assignedQuotaValue - achievedNetSalesValue);
  const remainingSalesQty = Math.max(0, assignedQuotaQty - achievedSalesQty);

  // 6. Earned Commission (Configured Policy Breakdown)
  const policyRule = commissionPolicy?.rule || 'above_target_only';
  const rateAboveTarget = commissionPolicy?.rateAboveTarget ?? 0.05;
  const baseRate = commissionPolicy?.baseRate ?? 0.0;
  const surplusSales = Math.max(0, achievedNetSalesValue - assignedQuotaValue);

  let earnedCommission = 0;
  if (policyRule === 'above_target_only') {
    earnedCommission = Math.round(surplusSales * rateAboveTarget);
  } else if (policyRule === 'all_sales') {
    earnedCommission = Math.round(achievedNetSalesValue * (baseRate || 0.02));
  } else if (policyRule === 'tiered') {
    const baseAchieved = Math.min(achievedNetSalesValue, assignedQuotaValue);
    earnedCommission = Math.round(baseAchieved * baseRate + surplusSales * rateAboveTarget);
  }

  // Distinction: Paid vs Pending Approval
  const commissionPaid = Math.round(earnedCommission * 0.65);
  const commissionPending = earnedCommission - commissionPaid;

  // 7. Scoped Team Performance Roster for Manager vs Coordinator
  const scopedTeamRoster = useMemo(() => {
    let list = TEAM_PERFORMANCE_ROSTER;
    if (userRole === 'sales_coordinator') {
      // Coordinator sees supervised employees in their regional scope
      list = TEAM_PERFORMANCE_ROSTER.filter(
        (emp) =>
          emp.regionId === 'REG-HYD' ||
          emp.roleKey === 'sales_rep' ||
          emp.roleKey === 'junior_sales' ||
          emp.employeeId === userProfile.employeeId
      );
    }
    // Apply filters
    return list.filter((emp) => {
      const matchEmp = teamEmployeeFilter === 'all' || emp.employeeId === teamEmployeeFilter;
      const matchRole = teamRoleFilter === 'all' || emp.roleKey === teamRoleFilter;
      return matchEmp && matchRole;
    });
  }, [userRole, userProfile.employeeId, teamEmployeeFilter, teamRoleFilter]);

  // Overall Team Efficiency & Cumulative Conversion Calculation
  const overallTeamEfficiency = useMemo(() => {
    const totalQuotesGenerated = scopedTeamRoster.reduce((sum, e) => sum + (e.quotationsGenerated || 0), 0);
    const totalQuotesConverted = scopedTeamRoster.reduce((sum, e) => sum + (e.quotationsConverted || 0), 0);
    const totalOrdersWon = scopedTeamRoster.reduce((sum, e) => sum + (e.ordersWon || 0), 0);
    const totalQuotesLost = scopedTeamRoster.reduce((sum, e) => sum + (e.quotationsLost || 0), 0);
    const totalAchievedQty = scopedTeamRoster.reduce((sum, e) => sum + (e.achievedQty || 0), 0);
    const totalAchievedValue = scopedTeamRoster.reduce((sum, e) => sum + (e.achievedValue || 0), 0);
    const totalQuotaValue = scopedTeamRoster.reduce((sum, e) => sum + (e.quotaValue || 0), 0);
    const totalCommission = scopedTeamRoster.reduce((sum, e) => sum + (e.commissionEarned || 0), 0);

    const overallConversionRate =
      totalQuotesGenerated > 0 ? Math.round((totalQuotesConverted / totalQuotesGenerated) * 100) : 0;

    return {
      totalQuotesGenerated,
      totalQuotesConverted,
      totalOrdersWon,
      totalQuotesLost,
      overallConversionRate,
      totalAchievedQty,
      totalAchievedValue,
      totalQuotaValue,
      totalCommission,
      employeeCount: scopedTeamRoster.length,
    };
  }, [scopedTeamRoster]);

  // 8. Key Customers by Revenue (Renamed from Top Customers)
  const keyCustomersReport = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      if (o.fulfilmentStatus === 'Cancelled') return;
      if (!map[o.customerId]) {
        map[o.customerId] = {
          id: o.customerId,
          name: o.customerName,
          orderCount: 0,
          totalRevenue: 0,
        };
      }
      map[o.customerId].orderCount += 1;
      map[o.customerId].totalRevenue += Math.round(Number(o.totalAmount || 0) * cadenceMultiplier * yearScale);
    });

    const list = Object.values(map);
    const totalRev = list.reduce((sum, c) => sum + c.totalRevenue, 0);

    return list
      .map((c) => ({
        ...c,
        percent: totalRev > 0 ? Math.round((c.totalRevenue / totalRev) * 100) : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [orders, cadenceMultiplier, yearScale]);

  // Commission Modal Handlers
  const handleSaveCommissionPolicy = () => {
    const numAbove = parseFloat(configRateAboveTarget);
    const numBase = parseFloat(configBaseRate);

    if (isNaN(numAbove) || numAbove < 0 || numAbove > 100) {
      showToast('Please enter a valid surplus commission rate (0% - 100%)', 'danger');
      return;
    }

    updateCommissionPolicy({
      rule: configRule,
      rateAboveTarget: numAbove / 100,
      baseRate: isNaN(numBase) ? 0 : numBase / 100,
    });

    setIsAdminConfigOpen(false);
    showToast('Admin Commission Policy updated and applied successfully!', 'success');
  };

  // Scenario Simulator Calculations
  const simNumSales = parseFloat(simSales) || 0;
  const simNumTarget = parseFloat(simTarget) || 0;
  const simSurplus = Math.max(0, simNumSales - simNumTarget);
  const simRate = (parseFloat(configRateAboveTarget) || 5) / 100;
  const simCalculatedCommission =
    configRule === 'above_target_only'
      ? Math.round(simSurplus * simRate)
      : configRule === 'all_sales'
      ? Math.round(simNumSales * ((parseFloat(configBaseRate) || 2) / 100))
      : Math.round(
          Math.min(simNumSales, simNumTarget) * ((parseFloat(configBaseRate) || 1) / 100) +
            simSurplus * simRate
        );

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row mb-4">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="page-title">Sales Performance &amp; Reports</h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '600',
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              Multi-Year Performance Analytics
            </span>
          </div>
          <p className="page-description">
            Sales quota tracking, quotation-to-order conversion analytics, and employee performance reports
          </p>
        </div>

        {/* Global Reporting Controls Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Cadence Selector */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '130px', fontSize: '12px', fontWeight: 600 }}
            value={reportingCadence}
            onChange={(e) => setReportingCadence(e.target.value)}
            title="Reporting Period Cadence"
          >
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Half-Yearly">Half-Yearly</option>
            <option value="Yearly">Yearly</option>
            <option value="MTD">MTD (Month-to-Date)</option>
            <option value="YTD">YTD (Year-to-Date)</option>
          </select>

          {/* 5-Year Historical Filter */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '110px', fontSize: '12px', fontWeight: 600 }}
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            title="Select historical reporting year"
          >
            <option value="2026">2026 (Current)</option>
            <option value="2025">2025 (Historical)</option>
            <option value="2024">2024 (Historical)</option>
            <option value="2023">2023 (Historical)</option>
            <option value="2022">2022 (Historical)</option>
          </select>

          {/* Month Selector */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '110px', fontSize: '12px' }}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            title="Filter by specific month"
          >
            <option value="all">All Months</option>
            <option value="January">January</option>
            <option value="February">February</option>
            <option value="March">March</option>
            <option value="April">April</option>
            <option value="May">May</option>
            <option value="June">June</option>
            <option value="July">July</option>
            <option value="August">August</option>
            <option value="September">September</option>
            <option value="October">October</option>
            {selectedYear !== '2026' && <option value="November">November</option>}
            {selectedYear !== '2026' && <option value="December">December</option>}
          </select>

          {/* Quarter Selector */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '95px', fontSize: '12px' }}
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            title="Filter by Quarter"
          >
            <option value="all">All Qtrs</option>
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
          </select>

          <button
            type="button"
            className="btn btn-secondary btn-sm btn-icon-text"
            onClick={() => window.print()}
            title="Print or export current performance report"
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Main Role-Based Tabs (My Performance vs Team Performance) */}
      <div className="tab-navigation-bar mb-4">
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'my-performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-performance')}
        >
          <TrendingUp size={16} />
          <span>My Performance</span>
        </button>

        {isManagerOrCoordinator && (
          <button
            type="button"
            className={`tab-nav-btn ${activeTab === 'team-performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('team-performance')}
          >
            <Users size={16} />
            <span>Team Performance</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                background: '#eff6ff',
                color: '#1d4ed8',
                padding: '1px 7px',
                borderRadius: '999px',
                marginLeft: '6px',
              }}
            >
              {scopedTeamRoster.length}
            </span>
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* SECTION 1: MY PERFORMANCE (ALL FOUR ROLES) */}
      {/* ============================================================== */}
      {activeTab === 'my-performance' && (
        <>
          {/* Performance Summary Cards (4 Cards with Quantity & Value) */}
          <div className="summary-kpi-grid mb-4">
            {/* 1. Assigned Sales Quota */}
            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
              <div className="summary-kpi-label">Assigned Sales Quota</div>
              <div className="summary-kpi-value">{formatINR(assignedQuotaValue)}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e40af', marginTop: '2px' }}>
                Assigned Quantity: <strong>{assignedQuotaQty} units</strong>
              </div>
              <div className="summary-kpi-sub">
                {userProfile.fullName || 'Vikram Mehta'} • {reportingCadence} ({selectedYear})
              </div>
            </div>

            {/* 2. Achieved Net Sales */}
            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #10b981' }}>
              <div className="summary-kpi-label">Achieved Net Sales</div>
              <div className="summary-kpi-value text-success">{formatINR(achievedNetSalesValue)}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#15803d', marginTop: '2px' }}>
                Achieved Quantity: <strong>{achievedSalesQty} units</strong>
              </div>
              <div className="summary-kpi-sub">
                {achievementPercentage}% of assigned sales quota achieved
              </div>
            </div>

            {/* 3. Remaining Sales (Renamed from Remaining to Target) */}
            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #f59e0b' }}>
              <div className="summary-kpi-label">Remaining Sales</div>
              <div className="summary-kpi-value text-warning">
                {remainingSalesValue === 0 ? 'Quota Met' : formatINR(remainingSalesValue)}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: remainingSalesQty === 0 ? '#16a34a' : '#b45309', marginTop: '2px' }}>
                Remaining Quantity: <strong>{remainingSalesQty} units</strong>
              </div>
              <div className="summary-kpi-sub">
                {remainingSalesValue === 0 ? 'Surplus sales realized!' : 'Remaining to reach 100% quota'}
              </div>
            </div>

            {/* 4. Earned Commission */}
            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #8b5cf6' }}>
              <div className="summary-kpi-label">Earned Commission</div>
              <div className="summary-kpi-value" style={{ color: '#7c3aed' }}>
                {formatINR(earnedCommission)}
              </div>
              <div style={{ fontSize: '11px', color: '#6b21a8', marginTop: '2px' }}>
                Paid: <strong>{formatINR(commissionPaid)}</strong> • Pending: <strong>{formatINR(commissionPending)}</strong>
              </div>
              <div className="summary-kpi-sub">
                {policyRule === 'above_target_only'
                  ? surplusSales > 0
                    ? `5% strictly on ${formatINR(surplusSales)} surplus`
                    : `Surplus unlocks above ${formatINR(assignedQuotaValue)}`
                  : `${(rateAboveTarget * 100).toFixed(1)}% incentive policy`}
              </div>
            </div>
          </div>

          {/* Quota Progress Banner */}
          <div
            className="card mb-4"
            style={{ padding: '16px 20px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                  Personal Sales Quota Progress: {achievementPercentage}%
                </span>
                <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '10px' }}>
                  ({formatINR(achievedNetSalesValue)} of {formatINR(assignedQuotaValue)} • {achievedSalesQty} of {assignedQuotaQty} units)
                </span>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: achievementPercentage >= 100 ? '#166534' : '#2563eb',
                  backgroundColor: achievementPercentage >= 100 ? '#dcfce7' : '#eff6ff',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                }}
              >
                {achievementPercentage >= 100 ? 'Quota Met' : `${100 - achievementPercentage}% Remaining`}
              </span>
            </div>

            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: '#e2e8f0',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, achievementPercentage)}%`,
                  height: '100%',
                  backgroundColor: achievementPercentage >= 100 ? '#10b981' : '#2563eb',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
              <span>Historical Baseline: {selectedYear} Performance Ledger</span>
              <span>Calculation uses confirmed Sales Order conversion data</span>
            </div>
          </div>

          {/* Sales Performance Trend — Two Tabs */}
          <div
            className="card mb-6"
            style={{
              padding: '20px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Sales Performance &amp; Conversion Analytics ({selectedYear})
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Multi-metric performance trendline and quotation-to-order conversion comparison
                </span>
              </div>

              {/* Chart Tab Switcher: Tab 1 (Line Graph) vs Tab 2 (Bar Chart) */}
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', padding: '3px', gap: '2px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${activeChartTab === 'trend' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '12px', padding: '4px 12px' }}
                  onClick={() => setActiveChartTab('trend')}
                >
                  <TrendingUp size={14} className="mr-1" />
                  <span>Tab 1: Performance Trend</span>
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${activeChartTab === 'quotation-analysis' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '12px', padding: '4px 12px' }}
                  onClick={() => setActiveChartTab('quotation-analysis')}
                >
                  <BarChart3 size={14} className="mr-1" />
                  <span>Tab 2: Quotation &amp; Order Analysis</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Performance Trend (Line Graph with 6 Metrics) */}
            {activeChartTab === 'trend' && (
              <PerformanceTrendChart
                data={filteredTrendData}
                year={selectedYear}
                onDrilldown={(cohort) => setDrilldownCohort(cohort)}
              />
            )}

            {/* TAB 2: Quotation & Order Analysis (Vertical Column/Bar Chart) */}
            {activeChartTab === 'quotation-analysis' && (
              <QuotationOrderBarChart
                data={filteredTrendData}
                year={selectedYear}
                onDrilldown={(cohort) => setDrilldownCohort(cohort)}
              />
            )}
          </div>

          {/* Key Customers by Revenue (Renamed from Top Customers) */}
          <div className="dashboard-two-col-grid mb-6">
            <div className="dashboard-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Users size={16} className="text-primary" />
                <h4 className="card-heading">Key Customers by Revenue</h4>
              </div>
              <p className="card-subheading mb-4">
                Ranked customer accounts by confirmed sales order revenue for {selectedYear}
              </p>

              <div className="table-responsive">
                <table className="enterprise-table table-compact">
                  <thead>
                    <tr>
                      <th>Customer Account &amp; ID</th>
                      <th style={{ textAlign: 'center' }}>Confirmed Orders</th>
                      <th style={{ textAlign: 'right' }}>Net Sales (₹)</th>
                      <th style={{ textAlign: 'right' }}>Revenue Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keyCustomersReport.map((cust) => (
                      <tr key={cust.id}>
                        <td>
                          <span className="font-semibold text-xs text-slate-800 block truncate" style={{ maxWidth: '180px' }}>
                            {cust.name}
                          </span>
                          <span className="text-xs text-muted font-mono" style={{ fontSize: '11px' }}>
                            ID: {cust.id}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '600' }}>{cust.orderCount}</td>
                        <td style={{ textAlign: 'right', fontWeight: '700' }}>{formatINR(cust.totalRevenue)}</td>
                        <td style={{ textAlign: 'right', fontSize: '12px' }} className="text-muted">
                          {cust.percent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Commission Incentive Governance Card */}
            <div className="dashboard-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} color="#7c3aed" />
                  <h4 className="card-heading" style={{ margin: 0 }}>Commission Policy Summary</h4>
                </div>
                {(userRole === 'admin' || userRole === 'sales_manager') && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '2px 8px' }}
                    onClick={() => setIsAdminConfigOpen(true)}
                  >
                    <Sliders size={12} className="mr-1" />
                    <span>Configure Policy</span>
                  </button>
                )}
              </div>
              <p className="card-subheading mb-4">Incentive payout rules and status breakdown</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Commission Earned (Total)</span>
                    <strong style={{ fontSize: '13px', color: '#7c3aed' }}>{formatINR(earnedCommission)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Paid Out in Finalized Batches</span>
                    <strong style={{ fontSize: '13px', color: '#16a34a' }}>{formatINR(commissionPaid)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Pending Finance Processing</span>
                    <strong style={{ fontSize: '13px', color: '#b45309' }}>{formatINR(commissionPending)}</strong>
                  </div>
                </div>

                <div style={{ padding: '10px 12px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '6px', fontSize: '11.5px', color: '#6b21a8' }}>
                  <strong>Policy Rule:</strong> Surplus rate of {(rateAboveTarget * 100).toFixed(1)}% applied strictly on sales exceeding the assigned quota. Quotations are only eligible once converted to confirmed Sales Orders.
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* SECTION 2: TEAM PERFORMANCE (MANAGER & COORDINATOR ONLY) */}
      {/* ============================================================== */}
      {isManagerOrCoordinator && activeTab === 'team-performance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Governance Header Banner */}
          <div
            className="card"
            style={{
              padding: '16px 20px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={22} className="text-primary shrink-0" />
              <div>
                <strong style={{ fontSize: '14px', color: '#1e40af' }}>
                  {userRole === 'sales_manager' || userRole === 'admin'
                    ? 'Organizational Team Performance & Conversion Efficiency'
                    : 'Regional Team Performance (Hyderabad & Deccan)'}
                </strong>
                <p style={{ margin: 0, fontSize: '12px', color: '#3b82f6' }}>
                  {userRole === 'sales_manager' || userRole === 'admin'
                    ? 'Review team quota delivery, compare employee-wise conversion efficiency, and track organizational sales revenue.'
                    : 'Review performance metrics for Sales Representatives and Junior Sales Employees across Hyderabad & Deccan.'}
                </p>
              </div>
            </div>

            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#1e40af',
                background: '#dbeafe',
                padding: '4px 10px',
                borderRadius: '6px',
              }}
            >
              {scopedTeamRoster.length} Employee Records
            </span>
          </div>

          {/* Team Filter Toolbar */}
          <div
            className="card"
            style={{
              padding: '12px 16px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              {/* Employee Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Employee:</span>
                <select
                  className="form-select"
                  style={{ fontSize: '12px', padding: '4px 10px', minWidth: '180px' }}
                  value={teamEmployeeFilter}
                  onChange={(e) => setTeamEmployeeFilter(e.target.value)}
                >
                  <option value="all">All Team Employees</option>
                  {TEAM_PERFORMANCE_ROSTER.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.fullName} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Role Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Role:</span>
                <select
                  className="form-select"
                  style={{ fontSize: '12px', padding: '4px 10px', minWidth: '150px' }}
                  value={teamRoleFilter}
                  onChange={(e) => setTeamRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="sales_manager">Sales Manager</option>
                  <option value="sales_coordinator">Sales Coordinator</option>
                  <option value="sales_rep">Sales Representative</option>
                  <option value="junior_sales">Junior Sales Employee</option>
                </select>
              </div>
            </div>

            <div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setTeamEmployeeFilter('all');
                  setTeamRoleFilter('all');
                }}
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Overall Team Efficiency Summary Strip */}
          <div className="section-title mb-2" style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
            Overall Sales Team Efficiency &amp; Execution Summary
          </div>
          <div className="summary-kpi-grid">
            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #2563eb' }}>
              <div className="summary-kpi-label">Team Net Sales Achieved</div>
              <div className="summary-kpi-value text-success">{formatINR(overallTeamEfficiency.totalAchievedValue)}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#15803d', marginTop: '2px' }}>
                Volume: <strong>{overallTeamEfficiency.totalAchievedQty} units</strong>
              </div>
              <div className="summary-kpi-sub">
                Across {overallTeamEfficiency.employeeCount} team member{overallTeamEfficiency.employeeCount === 1 ? '' : 's'}
              </div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #7c3aed' }}>
              <div className="summary-kpi-label">Team Conversion Rate</div>
              <div className="summary-kpi-value" style={{ color: '#7c3aed' }}>
                {overallTeamEfficiency.overallConversionRate}%
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b21a8', marginTop: '2px' }}>
                {overallTeamEfficiency.totalQuotesConverted} converted of {overallTeamEfficiency.totalQuotesGenerated} quotes
              </div>
              <div className="summary-kpi-sub">Cumulative quotation-to-order ratio</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #059669' }}>
              <div className="summary-kpi-label">Orders Won vs Lost</div>
              <div className="summary-kpi-value" style={{ color: '#059669' }}>
                {overallTeamEfficiency.totalOrdersWon} Won
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', marginTop: '2px' }}>
                {overallTeamEfficiency.totalQuotesLost} Quotes Lost
              </div>
              <div className="summary-kpi-sub">Confirmed client purchase orders</div>
            </div>

            <div className="summary-kpi-card" style={{ borderLeft: '3.5px solid #8b5cf6' }}>
              <div className="summary-kpi-label">Total Team Commission</div>
              <div className="summary-kpi-value" style={{ color: '#7c3aed' }}>
                {formatINR(overallTeamEfficiency.totalCommission)}
              </div>
              <div style={{ fontSize: '12px', color: '#6b21a8', marginTop: '2px' }}>
                Based on surplus quota achievement
              </div>
              <div className="summary-kpi-sub">Authorized team incentive pool</div>
            </div>
          </div>

          {/* Mandatory Visual Analytics Graph: Employee Performance Comparison */}
          <TeamPerformanceComparisonChart
            teamData={scopedTeamRoster}
            onSelectEmployee={(emp) => setSelectedTeamEmployee(emp)}
          />

          {/* Employee-wise Team Performance Table */}
          <div
            className="card"
            style={{
              padding: '16px 20px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          >
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
              Employee Performance &amp; Conversion Ledger
            </h4>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
              Comparison of assigned quotas, achieved net sales, quotation conversion efficiency, and earned commission
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table className="enterprise-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Employee Name &amp; ID</th>
                    <th>Role &amp; Territory</th>
                    <th style={{ textAlign: 'right' }}>Assigned Quota</th>
                    <th style={{ textAlign: 'right' }}>Achieved Sales</th>
                    <th style={{ textAlign: 'right' }}>Remaining Sales</th>
                    <th style={{ textAlign: 'center' }}>Quotes</th>
                    <th style={{ textAlign: 'center' }}>Converted</th>
                    <th style={{ textAlign: 'center' }}>Won</th>
                    <th style={{ textAlign: 'center' }}>Lost</th>
                    <th style={{ textAlign: 'center' }}>Conversion %</th>
                    <th style={{ textAlign: 'right' }}>Earned Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {scopedTeamRoster.map((emp) => (
                    <tr key={emp.employeeId}>
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelectedTeamEmployee(emp)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                          title="Click to view detailed employee performance breakdown"
                        >
                          <strong style={{ fontSize: '13px', color: '#1d4ed8', display: 'block', textDecoration: 'underline' }}>
                            {emp.fullName}
                          </strong>
                          <span className="text-xs font-mono text-primary">{emp.employeeId}</span>
                        </button>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#334155', display: 'block' }}>
                          {emp.role}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {emp.territoryName}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '12.5px', color: '#0f172a', display: 'block' }}>
                          {formatINR(emp.quotaValue)}
                        </strong>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{emp.quotaQty} units</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '12.5px', color: '#16a34a', display: 'block' }}>
                          {formatINR(emp.achievedValue)}
                        </strong>
                        <span style={{ fontSize: '11px', color: '#15803d' }}>{emp.achievedQty} units</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '12.5px', color: emp.remainingValue === 0 ? '#16a34a' : '#b45309', display: 'block' }}>
                          {emp.remainingValue === 0 ? 'Quota Met' : formatINR(emp.remainingValue)}
                        </strong>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{emp.remainingQty} units</span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, fontSize: '12px' }}>
                        {emp.quotationsGenerated}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, fontSize: '12px', color: '#2563eb' }}>
                        {emp.quotationsConverted}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, fontSize: '12px', color: '#16a34a' }}>
                        {emp.ordersWon}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, fontSize: '12px', color: '#dc2626' }}>
                        {emp.quotationsLost}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: emp.conversionRate >= 75 ? '#dcfce7' : '#eff6ff',
                            color: emp.conversionRate >= 75 ? '#166534' : '#1d4ed8',
                          }}
                        >
                          {emp.conversionRate}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '12.5px', color: '#7c3aed' }}>
                          {formatINR(emp.commissionEarned)}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Drill-Down Cohort Modal */}
      <QuotationOrderDrilldownModal
        isOpen={Boolean(drilldownCohort)}
        onClose={() => setDrilldownCohort(null)}
        cohortData={drilldownCohort}
      />

      {/* Admin Commission Configuration Modal */}
      <Modal
        isOpen={isAdminConfigOpen}
        onClose={() => setIsAdminConfigOpen(false)}
        size="normal"
        title="Admin Commission Policy Configuration"
        subtitle="Manage sales incentive rules, surplus tiers, and payout parameters"
        footer={
          <div className="modal-actions-bar" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAdminConfigOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveCommissionPolicy}
            >
              Save Policy Rules
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField
            label="Commission Policy Rule"
            id="cfg-rule"
            required
            helperText="Defines which portion of sales is eligible for sales commission"
          >
            <select
              id="cfg-rule"
              className="form-select"
              value={configRule}
              onChange={(e) => setConfigRule(e.target.value)}
            >
              <option value="above_target_only">
                Above Target Only (Calculate strictly on sales exceeding assigned quota — Current Policy)
              </option>
              <option value="tiered">
                Tiered Commission (Base quota rate + Accelerated surplus rate)
              </option>
              <option value="all_sales">
                Flat Rate on All Net Sales (No quota threshold)
              </option>
            </select>
          </FormField>

          <div className="form-grid-2">
            <FormField
              label="Surplus Commission Rate (%)"
              id="cfg-surplus-rate"
              required
              helperText="Rate applied strictly to sales above target (e.g. 5%)"
            >
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                id="cfg-surplus-rate"
                className="form-input"
                value={configRateAboveTarget}
                onChange={(e) => setConfigRateAboveTarget(e.target.value)}
              />
            </FormField>

            <FormField
              label="Base Quota Commission Rate (%)"
              id="cfg-base-rate"
              helperText="Rate for sales below/within target (0% for Above-Target Only)"
            >
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                id="cfg-base-rate"
                className="form-input"
                value={configBaseRate}
                disabled={configRule === 'above_target_only'}
                onChange={(e) => setConfigBaseRate(e.target.value)}
              />
            </FormField>
          </div>

          {/* Simulator Box */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Calculator size={15} color="#2563eb" />
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                Rule Verification Simulator (Live Test)
              </strong>
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
              Test how commission calculates with example figures (e.g. ₹12 lakh target and ₹15 lakh sales).
            </p>

            <div className="form-grid-2 mb-3">
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Assigned Target (₹)
                </label>
                <input
                  type="number"
                  className="form-input text-xs"
                  value={simTarget}
                  onChange={(e) => setSimTarget(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Eligible Net Sales (₹)
                </label>
                <input
                  type="number"
                  className="form-input text-xs"
                  value={simSales}
                  onChange={(e) => setSimSales(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            >
              <div>
                <span style={{ color: '#64748b' }}>Surplus Above Target:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{formatINR(simSurplus)}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Calculated Commission:</span>{' '}
                <strong style={{ color: '#7c3aed', fontSize: '14px' }}>
                  {formatINR(simCalculatedCommission)}
                </strong>
                <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>
                  ({configRateAboveTarget}% on surplus)
                </span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Individual Employee Performance Detail Modal */}
      <EmployeePerformanceDetailModal
        isOpen={Boolean(selectedTeamEmployee)}
        onClose={() => setSelectedTeamEmployee(null)}
        employee={selectedTeamEmployee}
        reportingPeriod={selectedYear}
      />
    </div>
  );
}
