import React, { useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { RoleProvider, useRole } from './context/RoleContext';
import { ScheduleProvider, useSchedule } from './context/ScheduleContext';
import RoleGuard from './components/RoleGuard';
import { useErpStore } from '../../store/useErpStore';
import { RoleQueriesChatView } from '../shared/RoleQueriesChatView';
import './service.css';

// Submodule Page Components
import Dashboard from './pages/Dashboard/Dashboard';
import Customers from './pages/Customers/Customers';
import SpareParts from './pages/SpareParts/SpareParts';
import ServiceRequests from './pages/ServiceRequests/ServiceRequests';
import ServiceExecution from './pages/ServiceExecution/ServiceExecution';
import WarrantyAMC from './pages/WarrantyAMC/WarrantyAMC';
import ServiceBilling from './pages/ServiceBilling/ServiceBilling';
import ServiceHistory from './pages/ServiceHistory/ServiceHistory';
import WorkAssignment from './pages/WorkAssignment/WorkAssignment';
import MySchedulePage from './pages/ActionPlan/MySchedulePage';
import TeamSchedulePage from './pages/ActionPlan/TeamSchedulePage';
import AttendancePage from './pages/ActionPlan/AttendancePage';
import Reports from './pages/Reports/Reports';

import {
  Wrench,
  ShieldCheck,
  UserCheck,
  Users,
  Briefcase,
  AlertTriangle,
  Clock,
  ClipboardList,
  CheckCircle2,
  CalendarCheck,
  Package,
  Receipt,
  History,
  BarChart3,
  MessageSquare,
} from 'lucide-react';

export interface ServiceSubRoleInfo {
  id: 'manager' | 'coordinator' | 'engineer' | 'employee';
  userId: string;
  level: string;
  title: string;
  person: string;
  badge: string;
  badgeClass: string;
  desc: string;
}

export const SERVICE_SUB_ROLES: ServiceSubRoleInfo[] = [
  {
    id: 'manager',
    userId: 'usr-svc-mgr',
    level: 'Tier 1',
    title: 'Service Manager',
    person: 'Ramesh Kulkarni',
    badge: 'Company-wide Authority',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    desc: 'Full operations visibility • Request approvals & closure • Service Billing & Finance sign-off • Escalations',
  },
  {
    id: 'coordinator',
    userId: 'usr-svc-coord',
    level: 'Tier 2',
    title: 'Service Coordinator',
    person: 'Priya Sharma',
    badge: 'Regional Dispatch Operations',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    desc: 'Request intake & triage • Technician allocation & reassignment • Dispatch scheduling & monitoring',
  },
  {
    id: 'engineer',
    userId: 'usr-svc-01',
    level: 'Tier 3',
    title: 'Service Engineer',
    person: 'Deepak Chawla',
    badge: 'Field Technical Specialist',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    desc: 'Personal assigned jobs • On-site technical diagnostics • Parts consumption logging • Customer sign-off',
  },
  {
    id: 'employee',
    userId: 'usr-svc-emp',
    level: 'Tier 4',
    title: 'Service Employee',
    person: 'Alex Taylor',
    badge: 'Field Support Associate',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    desc: 'Supporting maintenance tasks • Daily work update submissions • Material requisitions & attendance',
  },
];

const ServicePortalInner: React.FC = () => {
  const roleContext = (useRole as any)();
  const { roleId, setRole } = roleContext;
  const { currentUser, switchUser } = useErpStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Sync ERP currentUser serviceSubRole with Service RoleContext
  useEffect(() => {
    if (currentUser?.serviceSubRole && currentUser.serviceSubRole !== roleId) {
      setRole(currentUser.serviceSubRole);
    }
  }, [currentUser?.serviceSubRole, roleId, setRole]);

  const handleSubRoleSwitch = (subRoleId: 'manager' | 'coordinator' | 'engineer' | 'employee', userId: string) => {
    setRole(subRoleId);
    if (userId) {
      switchUser(userId);
    }
  };

  const activeSubRoleInfo = useMemo(() => {
    return SERVICE_SUB_ROLES.find((r) => r.id === roleId) || SERVICE_SUB_ROLES[0];
  }, [roleId]);

  return (
    <div className="service-portal-workspace w-full max-w-[1600px] mx-auto pb-16 space-y-4 font-sans">
      {/* ─── Service Role & Hierarchy Indicator Banner ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Customer Service & Field Engineering Department
                </h2>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${activeSubRoleInfo.badgeClass}`}>
                  {activeSubRoleInfo.level}: {activeSubRoleInfo.title}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Active Persona: <strong className="text-slate-800 font-semibold">{currentUser?.name || activeSubRoleInfo.person}</strong></span>
                <span>•</span>
                <span>Role Scope: <span className="font-mono text-sky-700 font-semibold">{activeSubRoleInfo.badge}</span></span>
                <span>•</span>
                <span className="text-slate-400">{activeSubRoleInfo.desc}</span>
              </p>
            </div>
          </div>

          {/* Sub-role Selector Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/70 overflow-x-auto shrink-0">
            {SERVICE_SUB_ROLES.map((r) => {
              const isActive = roleId === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSubRoleSwitch(r.id, r.userId)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-sky-700 shadow-xs border border-slate-200 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                  title={`${r.level}: ${r.title} (${r.person}) - ${r.desc}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-sky-600' : 'bg-slate-300'}`} />
                  <span>{r.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Service Department Routes ─── */}
      <div className="service-content-viewport">
        <Routes>
          <Route path="" element={<Navigate to="dashboard" replace />} />

          {/* 1. Dashboard */}
          <Route
            path="dashboard"
            element={
              <RoleGuard path="/dashboard">
                <Dashboard />
              </RoleGuard>
            }
          />

          {/* 2. Customers Module (Customer Directory & Warranty-AMC subpage) */}
          <Route
            path="customers"
            element={
              <RoleGuard path="/customers">
                <Customers />
              </RoleGuard>
            }
          />
          <Route path="customers/directory" element={<Navigate to="/service/customers" replace />} />
          <Route
            path="customers/warranty-amc"
            element={
              <RoleGuard path="/customers/warranty-amc">
                <WarrantyAMC />
              </RoleGuard>
            }
          />
          <Route path="warranty-amc" element={<Navigate to="/service/customers/warranty-amc" replace />} />

          {/* 3. Inventory & Spare Parts */}
          <Route
            path="inventory"
            element={
              <RoleGuard path="/inventory">
                <SpareParts />
              </RoleGuard>
            }
          />
          <Route path="spare-parts" element={<Navigate to="/service/inventory" replace />} />

          {/* 4. Service Requests Module (Service Requests & Work Assignment subpage) */}
          <Route
            path="service-requests"
            element={
              <RoleGuard path="/service-requests">
                <ServiceRequests />
              </RoleGuard>
            }
          />
          <Route
            path="service-requests/work-assignment"
            element={
              <RoleGuard path="/service-requests/work-assignment">
                <WorkAssignment />
              </RoleGuard>
            }
          />
          <Route path="work-assignment" element={<Navigate to="/service/service-requests/work-assignment" replace />} />

          {/* 5. Service Execution */}
          <Route
            path="service-execution"
            element={
              <RoleGuard path="/service-execution">
                <ServiceExecution />
              </RoleGuard>
            }
          />

          {/* 6. Service Billing */}
          <Route
            path="service-billing"
            element={
              <RoleGuard path="/service-billing">
                <ServiceBilling />
              </RoleGuard>
            }
          />

          {/* 7. Service History */}
          <Route
            path="service-history"
            element={
              <RoleGuard path="/service-history">
                <ServiceHistory />
              </RoleGuard>
            }
          />

          {/* 8. Action Plan Module & Subpages */}
          <Route path="action-plan" element={<Navigate to="/service/action-plan/my-schedule" replace />} />
          <Route
            path="action-plan/my-schedule"
            element={
              <RoleGuard path="/action-plan/my-schedule">
                <MySchedulePage />
              </RoleGuard>
            }
          />
          <Route
            path="action-plan/team-schedule"
            element={
              <RoleGuard path="/action-plan/team-schedule">
                <TeamSchedulePage />
              </RoleGuard>
            }
          />
          <Route
            path="action-plan/attendance"
            element={
              <RoleGuard path="/action-plan/attendance">
                <AttendancePage />
              </RoleGuard>
            }
          />
          <Route path="my-scheduled" element={<Navigate to="/service/action-plan/my-schedule" replace />} />
          <Route path="my-schedule" element={<Navigate to="/service/action-plan/my-schedule" replace />} />
          <Route path="team-schedule" element={<Navigate to="/service/action-plan/team-schedule" replace />} />

          {/* 9. Reports & Analytics */}
          <Route
            path="reports"
            element={
              <RoleGuard path="/reports">
                <Reports />
              </RoleGuard>
            }
          />

          {/* 10. Service Queries & Inter-Departmental Chat */}
          <Route path="queries" element={<RoleQueriesChatView roleContext="service" />} />
          <Route path="chat" element={<Navigate to="/service/queries" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export const ServicePortalLayout: React.FC = () => {
  return (
    <RoleProvider>
      <ScheduleProvider>
        <ServicePortalInner />
      </ScheduleProvider>
    </RoleProvider>
  );
};

export default ServicePortalLayout;
