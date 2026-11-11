import { useState, useMemo } from 'react';
import MetricCard from '../components/common/MetricCard';
import StatusBadge from '../components/common/StatusBadge';
import SalesTrendChart from '../components/charts/SalesTrendChart';
import UpdateActivityProgressModal from '../components/modals/UpdateActivityProgressModal';
import { useSales } from '../context/SalesContext';
import { formatINR, formatDate } from '../utils/formatters';
import {
  DollarSign,
  ShoppingCart,
  FileText,
  CreditCard,
  Target,
  Truck,
  Clock,
  Eye,
  AlertCircle,
  Plus,
  PhoneCall,
  Receipt,
  Download,
  Calendar,
  MapPin,
  User,
  Users,
  UserPlus,
  CheckCircle2,
  ChevronRight,
  Briefcase,
  Award,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  CalendarDays,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react';
import { downloadInvoiceDocument } from '../utils/documentGenerator';

// ============================================================================
// 1. SALES MANAGER DASHBOARD VIEW (Organizational Authority)
// ============================================================================
function ManagerDashboardView({
  metrics,
  orders,
  quotations,
  customers,
  activities,
  userProfile,
  navigateTo,
  onOpenNewQuotation,
  onOpenNewExpense,
  onViewQuote,
  onViewOrder,
}) {
  const [managerViewMode, setManagerViewMode] = useState('team'); // 'team' | 'my'
  const [selectedActivity, setSelectedActivity] = useState(null);

  // High-value pending quotations requiring Manager action
  const managerPendingQuotes = useMemo(() => {
    return quotations
      .filter((q) =>
        ['Pending Approval', 'Awaiting Approval', 'Draft'].includes(q.status) ||
        (q.grandTotal > 500000 && q.status !== 'Approved') ||
        q.downloadApprovalStatus === 'Pending Admin Approval'
      )
      .slice(0, 5);
  }, [quotations]);

  // High-value recent orders
  const highValueOrders = useMemo(() => {
    return [...orders].sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0)).slice(0, 5);
  }, [orders]);

  // Today's team activities across regions
  const todayTeamActivities = useMemo(() => {
    return activities.filter((a) => a.scheduledDate === '2026-10-30' || a.scheduledDate === '2026-10-26');
  }, [activities]);

  // Manager's own executive activities
  const managerMyActivities = useMemo(() => {
    return activities.filter(
      (a) =>
        a.assignedEmployeeId === 'APX-EMP-1002' ||
        a.assignedEmployeeName?.toLowerCase().includes('ananya')
    );
  }, [activities]);

  // Team members roster and status
  const teamMembers = [
    { id: 'APX-EMP-3044', name: 'Sneha Patil', role: 'Sales Coordinator', region: 'Hyderabad & Deccan', attendance: 'Present • In Office', activeTasks: 6, targetPct: 82 },
    { id: 'APX-EMP-4091', name: 'Vikram Mehta', role: 'Sales Representative', region: 'Territory A (Kukatpally)', attendance: 'Present • On Field', activeTasks: 5, targetPct: 74 },
    { id: 'APX-EMP-4092', name: 'Rohan Sharma', role: 'Sales Representative', region: 'Territory B (Uppal)', attendance: 'Present • On Field', activeTasks: 4, targetPct: 72 },
    { id: 'APX-EMP-4093', name: 'Priya Nair', role: 'Sales Representative', region: 'Territory C (ECIL)', attendance: 'Present • In Office', activeTasks: 3, targetPct: 68 },
    { id: 'APX-EMP-5011', name: 'Aditya Joshi', role: 'Junior Sales Employee', region: 'Territory A (Field)', attendance: 'Present • On Field', activeTasks: 5, targetPct: 65 },
    { id: 'APX-EMP-5012', name: 'Neha Kulkarni', role: 'Junior Sales Employee', region: 'Territory B (Field)', attendance: 'Present • On Field', activeTasks: 4, targetPct: 60 },
  ];

  return (
    <div className="dashboard-page">
      {/* Header Bar */}
      <div className="dashboard-intro-bar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="dashboard-heading">Sales Manager Executive Dashboard</h2>
            <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              National Scope
            </span>
          </div>
          <p className="dashboard-subheading">
            Executive oversight of nationwide revenue, team performance, quota achievements, and high-value deal approvals
          </p>
        </div>

        {/* Dual View Toggle & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'inline-flex', background: '#e2e8f0', padding: '2px', borderRadius: '6px' }}>
            <button
              type="button"
              className={`btn btn-sm ${managerViewMode === 'team' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '11.5px', padding: '4px 10px' }}
              onClick={() => setManagerViewMode('team')}
            >
              <Users size={13} className="mr-1" /> Team &amp; Org Overview
            </button>
            <button
              type="button"
              className={`btn btn-sm ${managerViewMode === 'my' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '11.5px', padding: '4px 10px' }}
              onClick={() => setManagerViewMode('my')}
            >
              <User size={13} className="mr-1" /> My Executive Overview
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm btn-icon-text"
            onClick={onOpenNewQuotation}
          >
            <Plus size={14} />
            <span>+ Quotation</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-icon-text"
            onClick={() => navigateTo('marketing-leads')}
            title="Review inbound Marketing Leads forwarded to Sales"
          >
            <UserPlus size={14} />
            <span>Marketing Leads ({metrics.newMarketingLeadsCount || 0} New)</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-icon-text"
            onClick={() => navigateTo('team-schedule')}
          >
            <Calendar size={14} />
            <span>Team Schedule</span>
          </button>
        </div>
      </div>

      {managerViewMode === 'team' ? (
        <>
          {/* Organization-wide Sales KPIs */}
          <div className="metrics-grid">
            <MetricCard
              title="Total Organization Revenue"
              value={formatINR(metrics.netSalesMonth || 11540000)}
              subtitle="Validated order book value"
              icon={DollarSign}
              variant="primary"
              onClick={() => navigateTo('targets-reports')}
            />
            <MetricCard
              title="Total Sales Orders"
              value={metrics.totalOrdersCount || orders.length}
              subtitle="Active enterprise bookings"
              icon={ShoppingCart}
              onClick={() => navigateTo('sales-orders')}
            />
            <MetricCard
              title="Overall Pipeline Value"
              value={formatINR(metrics.pipelineValue || 34500000)}
              subtitle="Active weighted pipeline"
              icon={TrendingUp}
              variant="primary"
              onClick={() => navigateTo('sales-pipeline')}
            />
            <MetricCard
              title="Quarterly Target Achievement"
              value={`${metrics.targetPercentage || 78}%`}
              subtitle={`₹${((metrics.targetRemaining || 4500000) / 100000).toFixed(1)}L remaining to goal`}
              icon={Target}
              variant="success"
              onClick={() => navigateTo('targets-reports')}
            />
            <MetricCard
              title="Team Win Rate"
              value="68%"
              subtitle="Closed-Won vs Proposals"
              icon={Award}
              variant="success"
              onClick={() => navigateTo('sales-pipeline')}
            />
          </div>

          {/* Middle Row: Team Overview & Revenue by Region */}
          <div className="dashboard-grid-2col">
            {/* Team Overview & Current Status */}
            <div className="dashboard-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-title">Sales Team Roster &amp; Live Status</h3>
                  <p className="card-subtitle">Attendance, field deployment, and monthly quota achievement</p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigateTo('attendance')}
                >
                  Attendance &rarr;
                </button>
              </div>

              <div className="table-responsive">
                <table className="enterprise-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Role &amp; Region</th>
                      <th>Today&apos;s Status</th>
                      <th style={{ textAlign: 'center' }}>Active Tasks</th>
                      <th style={{ textAlign: 'right' }}>Target %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <strong style={{ color: '#0f172a' }}>{m.name}</strong>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>{m.id}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, color: '#334155' }}>{m.role}</div>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>{m.region}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '10.5px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            {m.attendance}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#2563eb' }}>
                          {m.activeTasks}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: m.targetPct >= 70 ? '#16a34a' : '#d97706' }}>
                          {m.targetPct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sales Performance: Regional Distribution & Chart */}
            <div className="dashboard-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-title">Sales Performance by Region</h3>
                  <p className="card-subtitle">Regional revenue contributions across active territories</p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigateTo('targets-reports')}
                >
                  Analytics &rarr;
                </button>
              </div>

              {/* Regional Summary Pills */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10.5px', color: '#1e40af', fontWeight: 600 }}>Hyderabad &amp; Deccan</div>
                  <strong style={{ fontSize: '13px', color: '#1e3a8a' }}>₹68,50,000</strong>
                  <div style={{ fontSize: '10px', color: '#3b82f6' }}>82% Target Achieved</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10.5px', color: '#475569', fontWeight: 600 }}>Bangalore &amp; South</div>
                  <strong style={{ fontSize: '13px', color: '#1e293b' }}>₹28,20,000</strong>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>74% Target Achieved</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10.5px', color: '#475569', fontWeight: 600 }}>Chennai &amp; Coastal</div>
                  <strong style={{ fontSize: '13px', color: '#1e293b' }}>₹18,70,000</strong>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>68% Target Achieved</div>
                </div>
              </div>

              <SalesTrendChart compact hideHeader />
            </div>
          </div>

          {/* Customer & Order Overview & Pending Approvals */}
          <div className="dashboard-grid-2col" style={{ marginTop: '20px' }}>
            {/* High-Value Recent Orders */}
            <div className="dashboard-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-title">High-Value Enterprise Orders</h3>
                  <p className="card-subtitle">Major commercial accounts and delivery milestones</p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigateTo('sales-orders')}
                >
                  All Orders &rarr;
                </button>
              </div>

              <div className="table-responsive">
                <table className="enterprise-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {highValueOrders.map((o) => (
                      <tr key={o.id}>
                        <td className="font-semibold text-primary">{o.orderNo}</td>
                        <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {o.customerName}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatINR(o.totalAmount)}</td>
                        <td>
                          <StatusBadge status={o.fulfilmentStatus || o.status} size="small" />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="table-action-icon-btn"
                            onClick={() => onViewOrder && onViewOrder(o)}
                            title="View order details"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pending Approvals Requiring Manager Action */}
            <div className="dashboard-card">
              <div className="card-header-flex">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} className="text-warning" />
                    <h3 className="card-title">Pending Approvals Requiring Manager Action</h3>
                  </div>
                  <p className="card-subtitle">Discount exceptions, high-value quotes, and margin approvals</p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigateTo('quotations')}
                >
                  Review All &rarr;
                </button>
              </div>

              <div className="table-responsive">
                <table className="enterprise-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Quote #</th>
                      <th>Customer</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th>Approval Type</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managerPendingQuotes.map((q) => (
                      <tr key={q.id}>
                        <td className="font-semibold text-primary">{q.quotationNo}</td>
                        <td style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.customerName}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(q.grandTotal)}</td>
                        <td>
                          <span style={{ fontSize: '10.5px', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            {q.grandTotal > 500000 ? 'Executive Threshold' : 'Margin Review'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-xs btn-outline-primary"
                            onClick={() => onViewQuote && onViewQuote(q)}
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Action Plan / Schedule Widget */}
          <div className="dashboard-card" style={{ marginTop: '20px' }}>
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">Today&apos;s Field Schedule &amp; Team Visits Across Regions</h3>
                <p className="card-subtitle">Active customer visits and milestone meetings scheduled for today</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => navigateTo('team-schedule')}
              >
                Full Action Plan Calendar &rarr;
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {todayTeamActivities.slice(0, 4).map((act) => (
                <div
                  key={act.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedActivity(act)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '11.5px' }}>
                      <Clock size={11} style={{ display: 'inline', marginRight: '3px' }} />
                      {act.scheduledTime}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px' }}>
                      {act.status}
                    </span>
                  </div>
                  <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>{act.customerName}</strong>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                    {act.activityType} • {act.customerDisplayId || act.customerId}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '3px' }}>
                    Assigned: <strong>{act.assignedEmployeeName}</strong> ({act.assignedEmployeeRole === 'junior_sales' ? 'Junior Sales' : 'Sales Rep'})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Manager's Personal Executive Overview */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="metrics-grid">
            <MetricCard
              title="Personal Key Accounts"
              value={customers.filter((c) => c.priorityLevel === 'Strategic' || c.priorityLevel === 'Tier-1').length || 8}
              subtitle="Strategic enterprise accounts"
              icon={Building2}
              variant="primary"
            />
            <MetricCard
              title="Executive Deals in Progress"
              value="₹1,85,00,000"
              subtitle="Major tenders & annual contracts"
              icon={TrendingUp}
              variant="success"
            />
            <MetricCard
              title="Upcoming Executive Visits"
              value={managerMyActivities.length}
              subtitle="Customer reviews & alignment"
              icon={Calendar}
              variant="primary"
              onClick={() => navigateTo('team-schedule')}
            />
          </div>

          <div className="dashboard-card">
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">Ananya Roy — Personal Executive Action Plan</h3>
                <p className="card-subtitle">Scheduled key account reviews, distributor alignments, and executive negotiations</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => navigateTo('team-schedule')}
              >
                Open My Schedule &rarr;
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {managerMyActivities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af' }}>{act.scheduledDate} • {act.scheduledTime}</span>
                    <StatusBadge status={act.status} size="small" />
                  </div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>{act.customerName}</strong>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{act.activityType}</div>
                  <div style={{ fontSize: '11px', color: '#334155', marginTop: '4px' }}>{act.purpose}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedActivity && (
        <UpdateActivityProgressModal
          isOpen={!!selectedActivity}
          onClose={() => setSelectedActivity(null)}
          activity={selectedActivity}
        />
      )}
    </div>
  );
}

// ============================================================================
// 2. SALES COORDINATOR DASHBOARD VIEW (Regional Operations Authority)
// ============================================================================
function CoordinatorDashboardView({
  metrics,
  orders,
  quotations,
  customers,
  activities,
  userProfile,
  navigateTo,
  onOpenNewQuotation,
  onOpenNewExpense,
  onViewQuote,
  onViewOrder,
}) {
  const [coordViewMode, setCoordViewMode] = useState('team'); // 'team' | 'my'
  const [selectedActivity, setSelectedActivity] = useState(null);

  // Regional orders (Hyderabad & Deccan)
  const regionalOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.regionId === 'REG-HYD' ||
        ['APX-EMP-4091', 'APX-EMP-4092', 'APX-EMP-4093', 'APX-EMP-5011', 'APX-EMP-5012'].includes(o.assignedEmployeeId)
    );
  }, [orders]);

  // Quotations awaiting coordinator approval
  const coordPendingQuotes = useMemo(() => {
    return quotations
      .filter((q) =>
        ['Pending Approval', 'Awaiting Approval', 'Draft'].includes(q.status) ||
        q.createdByRole === 'junior_sales' ||
        q.createdByRole === 'sales_rep'
      )
      .slice(0, 5);
  }, [quotations]);

  // Regional team members
  const regionalTeam = [
    { id: 'APX-EMP-4091', name: 'Vikram Mehta', role: 'Sales Representative', territory: 'Territory A (Kukatpally)', attendance: 'Present • Field', todayVisits: 2, completionRate: '85%' },
    { id: 'APX-EMP-4092', name: 'Rohan Sharma', role: 'Sales Representative', territory: 'Territory B (Uppal)', attendance: 'Present • Field', todayVisits: 2, completionRate: '80%' },
    { id: 'APX-EMP-4093', name: 'Priya Nair', role: 'Sales Representative', territory: 'Territory C (ECIL)', attendance: 'Present • Office', todayVisits: 1, completionRate: '90%' },
    { id: 'APX-EMP-5011', name: 'Aditya Joshi', role: 'Junior Sales Employee', territory: 'Territory A (Field)', attendance: 'Present • Field', todayVisits: 2, completionRate: '75%' },
    { id: 'APX-EMP-5012', name: 'Neha Kulkarni', role: 'Junior Sales Employee', territory: 'Territory B (Field)', attendance: 'Present • Field', todayVisits: 2, completionRate: '80%' },
  ];

  // Coordinator's own activities
  const coordinatorMyActivities = useMemo(() => {
    return activities.filter(
      (a) =>
        a.assignedEmployeeId === 'APX-EMP-3044' ||
        a.assignedEmployeeName?.toLowerCase().includes('sneha')
    );
  }, [activities]);

  // Regional team activities today
  const regionalTeamActivities = useMemo(() => {
    return activities.filter((a) =>
      ['APX-EMP-4091', 'APX-EMP-4092', 'APX-EMP-4093', 'APX-EMP-5011', 'APX-EMP-5012'].includes(a.assignedEmployeeId)
    );
  }, [activities]);

  return (
    <div className="dashboard-page">
      {/* Header Bar */}
      <div className="dashboard-intro-bar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="dashboard-heading">Sales Coordinator Regional Operations Dashboard</h2>
            <span style={{ fontSize: '11px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              Hyderabad &amp; Deccan Region
            </span>
          </div>
          <p className="dashboard-subheading">
            Regional operations oversight for Territory A (Kukatpally), Territory B (Uppal), and Territory C (ECIL)
          </p>
        </div>

        {/* Dual View Toggle & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'inline-flex', background: '#e2e8f0', padding: '2px', borderRadius: '6px' }}>
            <button
              type="button"
              className={`btn btn-sm ${coordViewMode === 'team' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '11.5px', padding: '4px 10px' }}
              onClick={() => setCoordViewMode('team')}
            >
              <Users size={13} className="mr-1" /> Regional Team Overview
            </button>
            <button
              type="button"
              className={`btn btn-sm ${coordViewMode === 'my' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '11.5px', padding: '4px 10px' }}
              onClick={() => setCoordViewMode('my')}
            >
              <User size={13} className="mr-1" /> My Overview
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm btn-icon-text"
            onClick={onOpenNewQuotation}
          >
            <Plus size={14} />
            <span>+ Quotation</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-icon-text"
            onClick={() => navigateTo('marketing-leads')}
            title="Review inbound Marketing Leads forwarded to Sales"
          >
            <UserPlus size={14} />
            <span>Marketing Leads ({metrics.newMarketingLeadsCount || 0} New)</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-icon-text"
            onClick={() => navigateTo('team-schedule')}
          >
            <Calendar size={14} />
            <span>Assign Visit</span>
          </button>
        </div>
      </div>

      {coordViewMode === 'team' ? (
        <>
          {/* Regional Sales KPIs */}
          <div className="metrics-grid">
            <MetricCard
              title="Regional Total Revenue"
              value="₹68,50,000"
              subtitle="Hyderabad & Deccan Region"
              icon={DollarSign}
              variant="primary"
              onClick={() => navigateTo('targets-reports')}
            />
            <MetricCard
              title="Regional Target Achievement"
              value="82%"
              subtitle="₹14.5L remaining to regional target"
              icon={Target}
              variant="success"
              onClick={() => navigateTo('targets-reports')}
            />
            <MetricCard
              title="Regional Pipeline Value"
              value="₹2,10,00,000"
              subtitle="Deals in active pipeline"
              icon={TrendingUp}
              variant="primary"
              onClick={() => navigateTo('sales-pipeline')}
            />
            <MetricCard
              title="Active Regional Orders"
              value={regionalOrders.length || 18}
              subtitle="Fulfilment & dispatch tracking"
              icon={ShoppingCart}
              onClick={() => navigateTo('sales-orders')}
            />
          </div>

          {/* Middle Row: Regional Team Overview & Territory Performance */}
          <div className="dashboard-grid-2col">
            {/* Regional Team Overview */}
            <div className="dashboard-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-title">Regional Field Team (Reps &amp; Junior Staff)</h3>
                  <p className="card-subtitle">Field visits scheduled, attendance, and task completion rate</p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigateTo('attendance')}
                >
                  View Attendance &rarr;
                </button>
              </div>

              <div className="table-responsive">
                <table className="enterprise-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Territory</th>
                      <th>Today&apos;s Status</th>
                      <th style={{ textAlign: 'center' }}>Today Visits</th>
                      <th style={{ textAlign: 'right' }}>Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regionalTeam.map((emp) => (
                      <tr key={emp.id}>
                        <td>
                          <strong style={{ color: '#0f172a' }}>{emp.name}</strong>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>{emp.role}</div>
                        </td>
                        <td style={{ fontSize: '11px', color: '#475569' }}>{emp.territory}</td>
                        <td>
                          <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '2px 5px', borderRadius: '4px', fontWeight: 600 }}>
                            {emp.attendance}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#2563eb' }}>
                          {emp.todayVisits}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                          {emp.completionRate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Territory Performance Breakdown */}
            <div className="dashboard-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-title">Territory Achievement Comparison</h3>
                  <p className="card-subtitle">Monthly sales quota tracking across regional sub-territories</p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigateTo('targets-reports')}
                >
                  Territory Report &rarr;
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>Territory A — Kukatpally &amp; Industrial Estate</strong>
                    <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '12px' }}>₹28,50,000 (95%)</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Staff: Vikram Mehta (Rep) &amp; Aditya Joshi (Junior)</div>
                  <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                    <div style={{ width: '95%', height: '100%', background: '#16a34a' }} />
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>Territory B — Uppal &amp; East Corridor</strong>
                    <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '12px' }}>₹22,00,000 (88%)</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Staff: Rohan Sharma (Rep) &amp; Neha Kulkarni (Junior)</div>
                  <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                    <div style={{ width: '88%', height: '100%', background: '#2563eb' }} />
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>Territory C — ECIL &amp; Northern Suburbs</strong>
                    <span style={{ fontWeight: 700, color: '#d97706', fontSize: '12px' }}>₹18,00,000 (75%)</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Staff: Priya Nair (Rep)</div>
                  <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                    <div style={{ width: '75%', height: '100%', background: '#d97706' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Regional Orders & Quotations Awaiting Approval */}
          <div className="dashboard-grid-2col" style={{ marginTop: '20px' }}>
            {/* Regional Orders */}
            <div className="dashboard-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-title">Recent Regional Sales Orders</h3>
                  <p className="card-subtitle">Orders registered in Hyderabad &amp; Deccan</p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigateTo('sales-orders')}
                >
                  All Orders &rarr;
                </button>
              </div>

              <div className="table-responsive">
                <table className="enterprise-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th>Fulfilment</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regionalOrders.slice(0, 5).map((o) => (
                      <tr key={o.id}>
                        <td className="font-semibold text-primary">{o.orderNo}</td>
                        <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {o.customerName}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(o.totalAmount)}</td>
                        <td>
                          <StatusBadge status={o.fulfilmentStatus} size="small" />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="table-action-icon-btn"
                            onClick={() => onViewOrder && onViewOrder(o)}
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quotations Awaiting Coordinator Approval */}
            <div className="dashboard-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-title">Quotations Awaiting Regional Review</h3>
                  <p className="card-subtitle">Proposals submitted by Sales Reps and Juniors</p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigateTo('quotations')}
                >
                  All Quotations &rarr;
                </button>
              </div>

              <div className="table-responsive">
                <table className="enterprise-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Quote #</th>
                      <th>Customer</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th>Submitted By</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coordPendingQuotes.map((q) => (
                      <tr key={q.id}>
                        <td className="font-semibold text-primary">{q.quotationNo}</td>
                        <td style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.customerName}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(q.grandTotal)}</td>
                        <td style={{ fontSize: '11px', color: '#475569' }}>
                          {q.createdByName || q.raisedBy || 'Sales Rep'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-xs btn-outline-primary"
                            onClick={() => onViewQuote && onViewQuote(q)}
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Regional Team Schedule Overview Widget */}
          <div className="dashboard-card" style={{ marginTop: '20px' }}>
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">Regional Team Schedule &amp; Customer Visits</h3>
                <p className="card-subtitle">Territory A, B, and C field visit execution across Sales Reps and Juniors</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => navigateTo('team-schedule')}
              >
                Team Schedule &rarr;
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {regionalTeamActivities.slice(0, 4).map((act) => (
                <div
                  key={act.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedActivity(act)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '11.5px' }}>
                      <Clock size={11} style={{ display: 'inline', marginRight: '3px' }} />
                      {act.scheduledTime}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px' }}>
                      {act.status}
                    </span>
                  </div>
                  <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>{act.customerName}</strong>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                    {act.activityType} • {act.customerDisplayId || act.customerId}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '3px' }}>
                    Assigned: <strong>{act.assignedEmployeeName}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Coordinator's Personal Overview */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="metrics-grid">
            <MetricCard
              title="Regional Distributor Hubs"
              value="3"
              subtitle="Kukatpally, Uppal, ECIL Hubs"
              icon={Building2}
              variant="primary"
            />
            <MetricCard
              title="Assigned Regional Tasks"
              value={coordinatorMyActivities.length}
              subtitle="Distributor audits & reviews"
              icon={CheckSquare}
              variant="success"
              onClick={() => navigateTo('team-schedule')}
            />
            <MetricCard
              title="Field Visits Supervised"
              value="18"
              subtitle="This month in Deccan region"
              icon={Calendar}
              variant="primary"
            />
          </div>

          <div className="dashboard-card">
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">Sneha Patil — Personal Operations Action Plan</h3>
                <p className="card-subtitle">Distributor visits, logistics alignment, and regional operational reviews</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => navigateTo('team-schedule')}
              >
                Open My Schedule &rarr;
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {coordinatorMyActivities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af' }}>{act.scheduledDate} • {act.scheduledTime}</span>
                    <StatusBadge status={act.status} size="small" />
                  </div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>{act.customerName}</strong>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{act.activityType}</div>
                  <div style={{ fontSize: '11px', color: '#334155', marginTop: '4px' }}>{act.purpose}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedActivity && (
        <UpdateActivityProgressModal
          isOpen={!!selectedActivity}
          onClose={() => setSelectedActivity(null)}
          activity={selectedActivity}
        />
      )}
    </div>
  );
}

// ============================================================================
// 3. SALES REPRESENTATIVE DASHBOARD VIEW (Strictly Individual Performance)
// ============================================================================
function RepresentativeDashboardView({
  metrics,
  orders,
  quotations,
  customers,
  activities,
  userProfile,
  navigateTo,
  onOpenNewQuotation,
  onOpenNewExpense,
  onViewQuote,
  onViewOrder,
}) {
  const [selectedActivity, setSelectedActivity] = useState(null);

  const repId = userProfile?.employeeId || 'APX-EMP-4091';
  const repName = userProfile?.fullName || 'Vikram Mehta';

  // Strictly individual data
  const myOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.assignedEmployeeId === repId ||
        (o.salesOwner && o.salesOwner.toLowerCase().includes(repName.toLowerCase()))
    );
  }, [orders, repId, repName]);

  const myQuotes = useMemo(() => {
    return quotations.filter(
      (q) =>
        q.assignedEmployeeId === repId ||
        (q.createdByName && q.createdByName.toLowerCase().includes(repName.toLowerCase())) ||
        (q.raisedBy && q.raisedBy.toLowerCase().includes(repName.toLowerCase()))
    );
  }, [quotations, repId, repName]);

  const myActivities = useMemo(() => {
    return activities.filter(
      (a) =>
        a.assignedEmployeeId === repId ||
        (a.assignedEmployeeName && a.assignedEmployeeName.toLowerCase().includes(repName.toLowerCase()))
    );
  }, [activities, repId, repName]);

  // Today's scheduled activities
  const myTodayActivities = useMemo(() => {
    return myActivities.filter((a) => a.scheduledDate === '2026-10-30' || a.scheduledDate === '2026-10-26');
  }, [myActivities]);

  const nextUpcomingActivity = myTodayActivities[0] || myActivities[0];

  // Assigned customers
  const myCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.assignedStaffId === repId ||
        c.assignedTerritoryId === 'TERR-HYD-A' ||
        ['CUS-000001', 'CUS-000002', 'CUS-000003'].includes(c.customerId)
    ).slice(0, 5);
  }, [customers, repId]);

  // Revenue & Commission metrics
  const myRevenue = 1850000; // ₹18.5L achieved
  const myTarget = 2500000; // ₹25L quota
  const myAchievementPct = Math.round((myRevenue / myTarget) * 100);
  const myRemaining = myTarget - myRevenue;
  const myCommission = Math.round(myRevenue * 0.025); // 2.5% incentive = ₹46,250
  const myPipelineVal = 4800000;

  return (
    <div className="dashboard-page">
      {/* Header Bar */}
      <div className="dashboard-intro-bar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="dashboard-heading">My Sales Representative Dashboard</h2>
            <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              {repName} • Territory A
            </span>
          </div>
          <p className="dashboard-subheading">
            Personal sales performance, monthly quota tracking, today&apos;s customer visits, and assigned accounts
          </p>
        </div>

        <div className="dashboard-quick-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm btn-icon-text"
            onClick={onOpenNewQuotation}
          >
            <Plus size={14} />
            <span>+ Quotation</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-icon-text"
            onClick={onOpenNewExpense}
          >
            <Plus size={14} />
            <span>Claim Expense</span>
          </button>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => navigateTo('marketing-leads')}
            title="View Marketing Leads assigned to you"
          >
            <UserPlus size={14} className="mr-1" /> My Marketing Leads
          </button>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => navigateTo('team-schedule')}
          >
            <Calendar size={14} className="mr-1" /> My Action Plan
          </button>
        </div>
      </div>

      {/* Personal Sales KPIs (Strictly Individual — NO Team Controls) */}
      <div className="metrics-grid">
        <MetricCard
          title="Monthly Quota Achievement"
          value={`${myAchievementPct}%`}
          subtitle={`₹${(myRemaining / 100000).toFixed(1)}L remaining to goal`}
          icon={Target}
          variant="primary"
          onClick={() => navigateTo('targets-reports')}
        />
        <MetricCard
          title="Revenue Generated (Oct)"
          value={formatINR(myRevenue)}
          subtitle={`Target: ${formatINR(myTarget)}`}
          icon={DollarSign}
          variant="success"
          onClick={() => navigateTo('targets-reports')}
        />
        <MetricCard
          title="Active Quotations"
          value={myQuotes.length || 6}
          subtitle={`Pipeline: ${formatINR(myPipelineVal)}`}
          icon={FileText}
          onClick={() => navigateTo('quotations')}
        />
        <MetricCard
          title="Orders Closed (Oct)"
          value={myOrders.length || 8}
          subtitle="Validated client purchase orders"
          icon={ShoppingCart}
          onClick={() => navigateTo('sales-orders')}
        />
        <MetricCard
          title="Commission / Incentive"
          value={formatINR(myCommission)}
          subtitle="2.5% performance incentive"
          icon={Award}
          variant="success"
        />
      </div>

      {/* Middle Row: Action Plan Widget & Next Upcoming Activity */}
      <div className="dashboard-grid-2col">
        {/* Action Plan Widget: Today's Scheduled Visits */}
        <div className="dashboard-card">
          <div className="card-header-flex">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarDays size={16} className="text-primary" />
                <h3 className="card-title">Today&apos;s Field Action Plan</h3>
              </div>
              <p className="card-subtitle">Scheduled customer visits and client negotiations from your weekly calendar</p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigateTo('team-schedule')}
            >
              Full Calendar &rarr;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {myActivities.slice(0, 3).map((act) => (
              <div
                key={act.id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '11.5px' }}>{act.scheduledTime}</span>
                    <span style={{ fontSize: '10px', background: '#eff6ff', color: '#1d4ed8', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                      {act.activityType}
                    </span>
                  </div>
                  <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', marginTop: '2px' }}>
                    {act.customerName}
                  </strong>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {act.customerDisplayId || act.customerId} • {act.purpose}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-xs btn-outline-primary"
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                  onClick={() => setSelectedActivity(act)}
                >
                  Update Outcome
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Highlighted Next Upcoming Activity Card */}
        {nextUpcomingActivity && (
          <div
            className="dashboard-card"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)',
              border: '2px solid #93c5fd',
            }}
          >
            <div className="card-header-flex">
              <div>
                <span style={{ fontSize: '10.5px', background: '#2563eb', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                  NEXT UPCOMING VISIT
                </span>
                <h3 className="card-title" style={{ marginTop: '6px' }}>{nextUpcomingActivity.customerName}</h3>
                <p className="card-subtitle">
                  {nextUpcomingActivity.activityType} • Scheduled at <strong>{nextUpcomingActivity.scheduledTime}</strong> ({nextUpcomingActivity.scheduledDate})
                </p>
              </div>
              <StatusBadge status={nextUpcomingActivity.status} />
            </div>

            <div style={{ background: '#ffffff', borderRadius: '6px', padding: '12px', border: '1px solid #bfdbfe', marginBottom: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11.5px' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Customer ID:</span>
                  <strong style={{ color: '#0f172a' }}>{nextUpcomingActivity.customerDisplayId || nextUpcomingActivity.customerId}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Location:</span>
                  <strong style={{ color: '#0f172a' }}>{nextUpcomingActivity.territoryName || 'Kukatpally, Hyderabad'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Contact Person:</span>
                  <strong style={{ color: '#0f172a' }}>{nextUpcomingActivity.contactPerson || 'Srinivas Rao (VP)'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Phone:</span>
                  <strong style={{ color: '#2563eb' }}>{nextUpcomingActivity.contactPhone || '+91 98490 12345'}</strong>
                </div>
              </div>

              {nextUpcomingActivity.purpose && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', fontSize: '11.5px', color: '#334155' }}>
                  <strong>Objective:</strong> {nextUpcomingActivity.purpose}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setSelectedActivity(nextUpcomingActivity)}
              >
                Log Visit Outcome
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Row: My Customers & My Active Quotations & Orders */}
      <div className="dashboard-grid-2col" style={{ marginTop: '20px' }}>
        {/* My Assigned Customers */}
        <div className="dashboard-card">
          <div className="card-header-flex">
            <div>
              <h3 className="card-title">My Assigned Customer Accounts</h3>
              <p className="card-subtitle">Key manufacturing and distributor clients in Territory A</p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigateTo('customers')}
            >
              All Customers &rarr;
            </button>
          </div>

          <div className="table-responsive">
            <table className="enterprise-table" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Customer Name</th>
                  <th>Contact Person</th>
                  <th>City</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {myCustomers.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono text-xs font-semibold text-primary">{c.customerId}</td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{c.name}</strong>
                    </td>
                    <td>{c.contactPerson}</td>
                    <td>{c.city}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        onClick={() => navigateTo('customers')}
                        title="View Customer"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* My Quotations & Orders */}
        <div className="dashboard-card">
          <div className="card-header-flex">
            <div>
              <h3 className="card-title">My Active Quotations &amp; Orders</h3>
              <p className="card-subtitle">Personal commercial proposals and order conversion status</p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigateTo('quotations')}
            >
              Quotations &rarr;
            </button>
          </div>

          <div className="table-responsive">
            <table className="enterprise-table" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>Ref #</th>
                  <th>Customer</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {myQuotes.slice(0, 5).map((q) => (
                  <tr key={q.id}>
                    <td className="font-semibold text-primary">{q.quotationNo}</td>
                    <td style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.customerName}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(q.grandTotal)}</td>
                    <td>
                      <StatusBadge status={q.status} size="small" />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="table-action-icon-btn"
                        onClick={() => onViewQuote && onViewQuote(q)}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedActivity && (
        <UpdateActivityProgressModal
          isOpen={!!selectedActivity}
          onClose={() => setSelectedActivity(null)}
          activity={selectedActivity}
        />
      )}
    </div>
  );
}

// ============================================================================
// 4. JUNIOR SALES EMPLOYEE DASHBOARD VIEW (Strictly Field Execution & Tasks)
// ============================================================================
function JuniorSalesDashboardView({
  metrics,
  customers,
  activities,
  userProfile,
  navigateTo,
  onOpenNewExpense,
}) {
  const [selectedActivity, setSelectedActivity] = useState(null);

  const juniorId = userProfile?.employeeId || 'APX-EMP-5011';
  const juniorName = userProfile?.fullName || 'Aditya Joshi';

  // Strictly individual activities
  const juniorActivities = useMemo(() => {
    return activities.filter(
      (a) =>
        a.assignedEmployeeId === juniorId ||
        (a.assignedEmployeeName && a.assignedEmployeeName.toLowerCase().includes(juniorName.toLowerCase()))
    );
  }, [activities, juniorId, juniorName]);

  // Today's scheduled visits
  const todayJuniorVisits = useMemo(() => {
    return juniorActivities.filter(
      (a) => a.scheduledDate === '2026-10-30' || a.scheduledDate === '2026-10-26'
    );
  }, [juniorActivities]);

  const completedCount = juniorActivities.filter((a) => a.status === 'Completed').length;
  const pendingCount = juniorActivities.filter((a) => a.status === 'Pending' || a.status === 'Planned').length;

  // Assigned territory accounts
  const territoryAccounts = useMemo(() => {
    return customers.filter(
      (c) =>
        c.assignedStaffId === juniorId ||
        c.assignedTerritoryId === 'TERR-HYD-A' ||
        ['CUS-000001', 'CUS-000002', 'CUS-000003'].includes(c.customerId)
    ).slice(0, 4);
  }, [customers, juniorId]);

  return (
    <div className="dashboard-page">
      {/* Header Bar */}
      <div className="dashboard-intro-bar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="dashboard-heading">Junior Sales Field Execution Dashboard</h2>
            <span style={{ fontSize: '11px', background: '#fdf4ff', color: '#9333ea', border: '1px solid #f0abfc', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              {juniorName} • Territory A Field Operations
            </span>
          </div>
          <p className="dashboard-subheading">
            Day-to-day customer visits, field payment follow-ups, territory account coverage, and shift logs
          </p>
        </div>

        {/* Attendance & Work Update Shortcuts */}
        <div className="dashboard-quick-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm btn-icon-text"
            onClick={() => navigateTo('attendance')}
            title="Punch daily attendance or review shifts"
          >
            <Clock size={14} />
            <span>Punch Attendance</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-icon-text"
            onClick={() => navigateTo('work-updates')}
            title="Submit today's deliverables and notes"
          >
            <CheckSquare size={14} />
            <span>Submit Daily Update</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-text"
            onClick={onOpenNewExpense}
            title="Claim daily field travel or fuel allowance"
          >
            <Plus size={14} />
            <span>Claim Travel</span>
          </button>
        </div>
      </div>

      {/* Personal Task KPIs (Execution-Focused Only — NO Regional/Org Figures) */}
      <div className="metrics-grid">
        <MetricCard
          title="Today's Assigned Visits"
          value={todayJuniorVisits.length || 2}
          subtitle="Field appointments scheduled"
          icon={Calendar}
          variant="primary"
          onClick={() => navigateTo('team-schedule')}
        />
        <MetricCard
          title="Weekly Tasks Completed"
          value={completedCount || 3}
          subtitle="Documented field outcomes"
          icon={CheckCircle2}
          variant="success"
        />
        <MetricCard
          title="Pending Weekly Tasks"
          value={pendingCount || 3}
          subtitle="Awaiting customer visits"
          icon={Clock}
          variant={pendingCount > 0 ? 'warning' : 'default'}
          onClick={() => navigateTo('team-schedule')}
        />
        <MetricCard
          title="Territory Coverage"
          value="Territory A"
          subtitle="Kukatpally & Industrial Estate"
          icon={MapPin}
          variant="primary"
        />
        <MetricCard
          title="Active Field Leads"
          value="5 Leads"
          subtitle="Initial contact & inquiries"
          icon={Briefcase}
        />
      </div>

      {/* Today's Field Schedule — Prominently Displayed */}
      <div className="dashboard-card" style={{ marginTop: '16px' }}>
        <div className="card-header-flex">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CalendarDays size={18} className="text-primary" />
              <h3 className="card-title">Today&apos;s Field Schedule &amp; Customer Tasks</h3>
            </div>
            <p className="card-subtitle">
              Action Plan activities assigned for field execution. Click &quot;Update Outcome&quot; immediately after each visit.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigateTo('team-schedule')}
          >
            Open Full Action Plan &rarr;
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
          {juniorActivities.map((act) => {
            const isCompleted = act.status === 'Completed';

            return (
              <div
                key={act.id}
                style={{
                  background: isCompleted ? '#f0fdf4' : '#ffffff',
                  border: isCompleted ? '1px solid #bbf7d0' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af' }}>
                      <Clock size={13} style={{ display: 'inline', marginRight: '4px' }} />
                      {act.scheduledTime}
                    </span>
                    <StatusBadge status={act.status} size="small" />
                  </div>

                  <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>
                    {act.customerName}
                  </strong>
                  <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                    {act.customerDisplayId || act.customerId}
                  </span>

                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>
                      <MapPin size={12} style={{ display: 'inline', marginRight: '4px', color: '#0284c7' }} />
                      {act.customerAddress || 'Phase II, IDA Kukatpally, Hyderabad'}
                    </div>
                    {act.contactPerson && (
                      <div>
                        <User size={12} style={{ display: 'inline', marginRight: '4px', color: '#64748b' }} />
                        {act.contactPerson} • <Phone size={11} style={{ display: 'inline', margin: '0 2px' }} /> {act.contactPhone || '+91 98490 12345'}
                      </div>
                    )}
                    <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '4px', marginTop: '4px', border: '1px solid #e2e8f0' }}>
                      <strong>Purpose:</strong> {act.purpose || 'Follow-up visit and requirements check'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${isCompleted ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ fontSize: '11.5px' }}
                    onClick={() => setSelectedActivity(act)}
                  >
                    {isCompleted ? 'Review / Edit Outcome' : 'Update Outcome'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Territory Account List */}
      <div className="dashboard-card" style={{ marginTop: '20px' }}>
        <div className="card-header-flex">
          <div>
            <h3 className="card-title">Territory A — Assigned Customers &amp; Accounts</h3>
            <p className="card-subtitle">Active distributor and industrial client accounts in your territory</p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigateTo('customers')}
          >
            All Accounts &rarr;
          </button>
        </div>

        <div className="table-responsive">
          <table className="enterprise-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Account Name</th>
                <th>Contact Person</th>
                <th>Phone</th>
                <th>Territory</th>
              </tr>
            </thead>
            <tbody>
              {territoryAccounts.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs font-semibold text-primary">{c.customerId}</td>
                  <td>
                    <strong style={{ color: '#0f172a' }}>{c.name}</strong>
                  </td>
                  <td>{c.contactPerson}</td>
                  <td>{c.phone || '+91 98490 12345'}</td>
                  <td>
                    <span style={{ fontSize: '11px', color: '#1d4ed8', background: '#eff6ff', padding: '1px 6px', borderRadius: '4px' }}>
                      Territory A
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedActivity && (
        <UpdateActivityProgressModal
          isOpen={!!selectedActivity}
          onClose={() => setSelectedActivity(null)}
          activity={selectedActivity}
        />
      )}
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT (Dynamic Role Adaptor)
// ============================================================================
export default function DashboardPage(props) {
  const salesContext = useSales();
  const { userRole } = salesContext;

  // 1. Sales Manager Dashboard (Ananya Roy)
  if (userRole === 'sales_manager' || userRole === 'admin') {
    return <ManagerDashboardView {...salesContext} {...props} />;
  }

  // 2. Sales Coordinator Dashboard (Sneha Patil)
  if (userRole === 'sales_coordinator') {
    return <CoordinatorDashboardView {...salesContext} {...props} />;
  }

  // 4. Junior Sales Employee Dashboard (Aditya Joshi)
  if (userRole === 'junior_sales') {
    return <JuniorSalesDashboardView {...salesContext} {...props} />;
  }

  // 3. Sales Representative Dashboard (Vikram Mehta - default sales role)
  return <RepresentativeDashboardView {...salesContext} {...props} />;
}
