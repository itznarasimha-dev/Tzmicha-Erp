import React, { useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { DemoRoleProvider, useDemoRole } from './context/DemoRoleContext';
import { DemoDataProvider } from './context/DemoDataContext';
import { RoleWorkspaceProvider } from './context/RoleWorkspaceContext';
import { MarketingDepartmentProvider } from './context/MarketingDepartmentContext';
import { RoleWorkspacePage } from './pages/RoleWorkspacePage';
import { MarketingDashboard } from './pages/MarketingDashboard';
import { MarketingModulePage } from './pages/MarketingModulePage';
import { FieldMarketingDashboard } from '../field-marketing/FieldMarketingDashboard';
import { VisitPlanner } from '../field-marketing/VisitPlanner';
import { MarketSurveys } from '../field-marketing/MarketSurveys';
import { DealerProspectDirectory } from '../field-marketing/DealerProspectDirectory';
import { MarketingWalletAndExpenses } from '../field-marketing/MarketingWalletAndExpenses';
import { MarketingTargets } from '../field-marketing/MarketingTargets';
import { RoleQueriesChatView } from '../shared/RoleQueriesChatView';
import { getRoleNavigation, roleWorkspacePath } from './config/roleNavigation';
import type { DemoRoleId } from './types/workflow';
import { useErpStore } from '../../store/useErpStore';
import './styles/index.css';

import {
  ShieldCheck,
  Building2,
  Users,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  UserCheck,
  Compass,
  MapPin,
  ClipboardList,
  Wallet,
  Target,
  MessageSquare,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';

const MARKETING_SUB_ROLES: {
  id: DemoRoleId;
  level: string;
  title: string;
  person: string;
  employeeId: string;
  badge: string;
  badgeClass: string;
  desc: string;
}[] = [
  {
    id: 'manager',
    level: 'Tier 1',
    title: 'Marketing Manager',
    person: 'Meera Iyer',
    employeeId: 'TOT-MKT-0087',
    badge: 'Department-wide Oversight',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    desc: 'Department structure, sector budgets, planning approvals, team performance & campaigns',
  },
  {
    id: 'senior',
    level: 'Tier 2',
    title: 'Senior Marketing Executive',
    person: 'Rohit Menon',
    employeeId: 'TOT-MKT-0218',
    badge: 'Sector Lead & Reviewer',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    desc: 'Sector ownership, junior team assignment, lead qualification, and campaign delivery',
  },
  {
    id: 'junior',
    level: 'Tier 3',
    title: 'Junior Marketing Executive',
    person: 'Ananya Rao',
    employeeId: 'TOT-MKT-0142',
    badge: 'Field & Outreach Specialist',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    desc: 'Daily task execution, lead capture, customer follow-up calls, and expense logging',
  },
];

function MarketingHeaderRibbon() {
  const { roleId, setRoleId } = useDemoRole();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useErpStore((s) => s.currentUser);
  const switchUser = useErpStore((s) => s.switchUser);

  const roleNavItems = useMemo(() => getRoleNavigation(roleId), [roleId]);

  const activeSubRole = useMemo(() => {
    return MARKETING_SUB_ROLES.find((r) => r.id === roleId) || MARKETING_SUB_ROLES[0];
  }, [roleId]);

  const handleSelectRole = (targetId: DemoRoleId) => {
    setRoleId(targetId);
    if (targetId === 'manager') {
      switchUser('usr-mkt-mgr');
    } else if (targetId === 'senior') {
      switchUser('usr-mkt-senior');
    } else {
      switchUser('usr-mkt-junior');
    }
    navigate(roleWorkspacePath('dashboard'));
  };

  const activeSection = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts[1] === 'workspace' && parts[2]) return parts[2];
    if (parts[1] === 'dashboard') return 'dept-dashboard';
    if (parts[1] === 'visits') return 'visits';
    if (parts[1] === 'surveys') return 'surveys';
    if (parts[1] === 'dealers') return 'dealers';
    if (parts[1] === 'wallet') return 'wallet';
    if (parts[1] === 'targets') return 'targets';
    if (parts[1] === 'queries' || parts[1] === 'chat') return 'queries';
    return roleNavItems[0]?.id || 'dashboard';
  }, [location.pathname, roleNavItems]);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
      {/* ─── 1. TOP TITLE BANNER & ACTIVE ROLE IDENTITY ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Marketing Department Workspace
            </span>
            <span className="text-xs text-slate-400 font-normal">
              Logged in as <strong className="text-slate-800 font-semibold">{currentUser?.name || activeSubRole.person}</strong> ({activeSubRole.title})
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            {activeSubRole.title} Command Desk
            <Sparkles className="w-5 h-5 text-emerald-500" />
          </h1>
          <p className="text-slate-500 text-sm font-normal mt-0.5 max-w-3xl">
            {activeSubRole.desc}. Your sidebar navigation, dashboard KPIs, work assignments, and permissions are strictly isolated to this role.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/marketing/dashboard')}
            className={`px-3 py-1.5 rounded-2xl text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              location.pathname.startsWith('/marketing/dashboard')
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Overview Dashboard</span>
          </button>

          <button
            onClick={() => navigate('/marketing/visits')}
            className={`px-3 py-1.5 rounded-2xl text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              location.pathname.startsWith('/marketing/visits') || location.pathname.startsWith('/marketing/surveys')
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Field Visits</span>
          </button>
        </div>
      </div>

      {/* ─── 2. ISOLATED SUB-ROLE DESKS (3 SEPARATE MARKETING ROLES) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {MARKETING_SUB_ROLES.map((r) => {
          const isSelected = roleId === r.id;
          return (
            <button
              key={r.id}
              onClick={() => handleSelectRole(r.id)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 border-indigo-400 shadow-md ring-2 ring-indigo-500/20'
                  : 'bg-slate-50/70 hover:bg-slate-50 border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
                      {r.level}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${r.badgeClass}`}>
                      {r.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mt-1">
                    {r.title}
                  </h3>
                  <div className="text-xs text-slate-600 font-medium">
                    {r.person} <span className="text-[10px] text-slate-400 font-mono">({r.employeeId})</span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-300 bg-white text-transparent'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 font-normal mt-2 line-clamp-2 leading-relaxed">
                {r.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* ─── 3. DYNAMIC ROLE NAVIGATION RIBBON ─── */}
      <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-slate-100">
        {roleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(roleWorkspacePath(item.id))}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-slate-950 text-white font-semibold shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={item.description}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-lime-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Auxiliary Ground Tabs */}
        <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />
        <button
          onClick={() => navigate('/marketing/visits')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeSection === 'visits'
              ? 'bg-slate-950 text-white font-semibold shadow-2xs'
              : 'bg-slate-50 text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>Visits</span>
        </button>
        <button
          onClick={() => navigate('/marketing/surveys')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeSection === 'surveys'
              ? 'bg-slate-950 text-white font-semibold shadow-2xs'
              : 'bg-slate-50 text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
          <span>Surveys</span>
        </button>
        <button
          onClick={() => navigate('/marketing/dealers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeSection === 'dealers'
              ? 'bg-slate-950 text-white font-semibold shadow-2xs'
              : 'bg-slate-50 text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Dealers</span>
        </button>
        <button
          onClick={() => navigate('/marketing/queries')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeSection === 'queries'
              ? 'bg-slate-950 text-white font-semibold shadow-2xs'
              : 'bg-slate-50 text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
          <span>Queries</span>
        </button>
      </nav>
    </div>
  );
}

export const MarketingPortalLayout: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <DemoRoleProvider>
          <DemoDataProvider>
            <RoleWorkspaceProvider>
              <MarketingDepartmentProvider>
                <div className="marketing-portal-workspace w-full max-w-[1600px] mx-auto pb-12 space-y-6">
                  <MarketingHeaderRibbon />

                  {/* Dynamic Marketing Sub-Routes */}
                  <Routes>
                    <Route index element={<RoleWorkspacePage />} />
                    <Route path="workspace" element={<RoleWorkspacePage />} />
                    <Route path="workspace/:section" element={<RoleWorkspacePage />} />
                    <Route path="dashboard" element={<MarketingDashboard />} />
                    <Route path="dashboard/:tab" element={<Navigate to="/marketing/dashboard" replace />} />

                    {/* Field & Ground Operations */}
                    <Route path="field-ops" element={<FieldMarketingDashboard />} />
                    <Route path="overview" element={<FieldMarketingDashboard />} />
                    <Route path="visits" element={<VisitPlanner />} />
                    <Route path="surveys" element={<MarketSurveys />} />
                    <Route path="dealers" element={<DealerProspectDirectory />} />
                    <Route path="wallet" element={<MarketingWalletAndExpenses />} />
                    <Route path="targets" element={<MarketingTargets />} />
                    <Route path="queries" element={<RoleQueriesChatView roleContext="marketing" />} />
                    <Route path="chat" element={<RoleQueriesChatView roleContext="marketing" />} />

                    {/* Standalone Marketing Modules */}
                    <Route path=":moduleId" element={<MarketingModulePage />} />
                    <Route path=":moduleId/:tab" element={<MarketingModulePage />} />

                    <Route path="*" element={<Navigate to="workspace" replace />} />
                  </Routes>
                </div>
              </MarketingDepartmentProvider>
            </RoleWorkspaceProvider>
          </DemoDataProvider>
        </DemoRoleProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default MarketingPortalLayout;
