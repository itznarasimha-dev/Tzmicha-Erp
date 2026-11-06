import React, { useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { StoreProvider, ThemeProvider, useStore } from './store';
import { ToastViewport } from './components/ui';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeProfile from './pages/EmployeeProfile';
import Attendance from './pages/Attendance';
import Leave from './pages/Leave';
import Recruitment from './pages/Recruitment';
import Onboarding from './pages/Onboarding';
import Payroll from './pages/Payroll';
import Contracts from './pages/Contracts';
import ContractDetail from './pages/ContractDetail';
import DailyPayments from './pages/DailyPayments';
import Performance from './pages/Performance';
import Requests from './pages/Requests';
import Offboarding from './pages/Offboarding';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import './hr.css';

import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  BriefcaseBusiness,
  UserPlus,
  Target,
  Wallet,
  FileSignature,
  Coins,
  MessageSquareText,
  UserMinus,
  BarChart3,
  Settings2,
  Sparkles,
} from 'lucide-react';

interface HRTabItem {
  id: string;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'people' | 'talent' | 'finance' | 'ops' | 'insights';
  badgeKey?: 'leaves' | 'payments' | 'requests';
}

const HR_TABS: HRTabItem[] = [
  { id: 'dashboard', path: '/hr', label: 'Dashboard', icon: LayoutDashboard, group: 'people' },
  { id: 'employees', path: '/hr/employees', label: 'Employees', icon: Users, group: 'people' },
  { id: 'attendance', path: '/hr/attendance', label: 'Attendance', icon: CalendarCheck, group: 'people' },
  { id: 'leave', path: '/hr/leave', label: 'Leave', icon: CalendarDays, group: 'people', badgeKey: 'leaves' },

  { id: 'recruitment', path: '/hr/recruitment', label: 'Recruitment', icon: BriefcaseBusiness, group: 'talent' },
  { id: 'onboarding', path: '/hr/onboarding', label: 'Onboarding', icon: UserPlus, group: 'talent' },
  { id: 'performance', path: '/hr/performance', label: 'Performance', icon: Target, group: 'talent' },

  { id: 'payroll', path: '/hr/payroll', label: 'Payroll', icon: Wallet, group: 'finance' },
  { id: 'contracts', path: '/hr/contracts', label: 'Contracts', icon: FileSignature, group: 'finance' },
  { id: 'payments', path: '/hr/payments', label: 'Daily Payments', icon: Coins, group: 'finance', badgeKey: 'payments' },

  { id: 'requests', path: '/hr/requests', label: 'Requests', icon: MessageSquareText, group: 'ops', badgeKey: 'requests' },
  { id: 'offboarding', path: '/hr/offboarding', label: 'Offboarding', icon: UserMinus, group: 'ops' },

  { id: 'reports', path: '/hr/reports', label: 'Reports', icon: BarChart3, group: 'insights' },
  { id: 'settings', path: '/hr/settings', label: 'HR Settings', icon: Settings2, group: 'insights' },
];

function HRNavigationHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { db } = useStore();

  const pendingLeave = (db.leaves || []).filter((l) => l.status === 'Pending').length;
  const pendingPayments = (db.payments || []).filter(
    (p) => p.approvalStatus === 'Pending' || p.paymentStatus === 'Pending' || p.paymentStatus === 'Overdue'
  ).length;
  const openRequests = (db.requests || []).filter((r) => r.status === 'Open' || r.status === 'In Progress').length;

  const getBadgeCount = (key?: 'leaves' | 'payments' | 'requests') => {
    if (key === 'leaves') return pendingLeave;
    if (key === 'payments') return pendingPayments;
    if (key === 'requests') return openRequests;
    return 0;
  };

  const currentTabId = useMemo(() => {
    const p = location.pathname;
    if (p.includes('/employees')) return 'employees';
    if (p.includes('/attendance')) return 'attendance';
    if (p.includes('/leave')) return 'leave';
    if (p.includes('/recruitment')) return 'recruitment';
    if (p.includes('/onboarding')) return 'onboarding';
    if (p.includes('/payroll')) return 'payroll';
    if (p.includes('/contracts')) return 'contracts';
    if (p.includes('/payments')) return 'payments';
    if (p.includes('/performance')) return 'performance';
    if (p.includes('/requests')) return 'requests';
    if (p.includes('/offboarding')) return 'offboarding';
    if (p.includes('/reports')) return 'reports';
    if (p.includes('/settings')) return 'settings';
    return 'dashboard';
  }, [location.pathname]);

  return (
    <div className="hr-portal-workspace bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Human Resources &amp; Talent Hub
            </span>
            <span className="text-xs text-slate-400 font-medium">14 Integrated Modules Active</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            HR Management Portal
            <Sparkles className="w-5 h-5 text-indigo-500" />
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Workforce directory, attendance recording, leaves, recruitment Kanban, automated onboarding, payroll disbursement, contracts, and compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Total Headcount: <strong className="text-slate-900">{(db.employees || []).length}</strong></span>
          </div>
        </div>
      </div>

      {/* Horizontal Nav Ribbon */}
      <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-slate-100">
        {HR_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTabId === tab.id;
          const badgeCount = getBadgeCount(tab.badgeKey);

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-slate-950 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {badgeCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-indigo-500 text-white'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export const HRPortalLayout: React.FC = () => {
  return (
    <ThemeProvider>
      <StoreProvider>
        <div className="hr-portal-workspace w-full max-w-[1600px] mx-auto pb-12 space-y-6">
          <HRNavigationHeader />

          {/* HR Sub-Routes Content */}
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="employees/:id" element={<EmployeeProfile />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave" element={<Leave />} />
            <Route path="recruitment" element={<Recruitment />} />
            <Route path="onboarding" element={<Onboarding />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="contracts/:id" element={<ContractDetail />} />
            <Route path="payments" element={<DailyPayments />} />
            <Route path="performance" element={<Performance />} />
            <Route path="requests" element={<Requests />} />
            <Route path="offboarding" element={<Offboarding />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>

          <ToastViewport />
        </div>
      </StoreProvider>
    </ThemeProvider>
  );
};

export default HRPortalLayout;
