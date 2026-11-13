import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import {
  Boxes,
  Shield,
  ArrowRight,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Briefcase,
  Warehouse,
  Compass,
  Loader2,
  HelpCircle,
  X,
  Building2,
  PlusCircle,
  Sparkles,
  Check,
  Landmark,
  Headset,
  Users,
  Megaphone,
  Target,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PLAN_TIERS } from '../../types';

interface DemoAccount {
  name: string;
  roleTitle: string;
  email: string;
  passwordHint: string;
  roleBadge: string;
  teamId: string;
  teamName: string;
  icon: React.ReactNode;
  bgGradient: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: 'Rajesh Verma',
    roleTitle: 'Executive Administrator',
    email: 'rajesh.verma@apexflow-erp.com',
    passwordHint: 'admin@2026',
    roleBadge: 'Executive Admin',
    teamId: 'APEX-2026',
    teamName: 'Tzmicha ERP & Manufacturing Ltd',
    icon: <Shield className="w-4 h-4 text-purple-600" />,
    bgGradient: 'from-purple-50 to-indigo-50 border-purple-200',
  },
  {
    name: 'Ananya Roy',
    roleTitle: 'Head of Commercial Sales & Distribution',
    email: 'ananya.roy@apexflow-erp.com',
    passwordHint: 'sales@2026',
    roleBadge: 'Sales Manager (L1)',
    teamId: 'APEX-2026',
    teamName: 'Tzmicha ERP & Manufacturing Ltd',
    icon: <Briefcase className="w-4 h-4 text-purple-600" />,
    bgGradient: 'from-purple-50 to-indigo-50 border-purple-200',
  },
  {
    name: 'Sneha Patil',
    roleTitle: 'Regional Sales Coordinator (Deccan)',
    email: 'sneha.patil@apexflow-erp.com',
    passwordHint: 'sales@2026',
    roleBadge: 'Sales Coordinator (L2)',
    teamId: 'APEX-2026',
    teamName: 'Tzmicha ERP & Manufacturing Ltd',
    icon: <Briefcase className="w-4 h-4 text-blue-600" />,
    bgGradient: 'from-blue-50 to-indigo-50 border-blue-200',
  },
  {
    name: 'Vikram Mehta',
    roleTitle: 'Senior Sales Representative (Territory A)',
    email: 'vikram.mehta@apexflow-erp.com',
    passwordHint: 'sales@2026',
    roleBadge: 'Senior Sales Exec (L3)',
    teamId: 'APEX-2026',
    teamName: 'Tzmicha ERP & Manufacturing Ltd',
    icon: <Briefcase className="w-4 h-4 text-emerald-600" />,
    bgGradient: 'from-emerald-50 to-teal-50 border-emerald-200',
  },
  {
    name: 'Aditya Joshi',
    roleTitle: 'Junior Sales Associate (Field Leads)',
    email: 'aditya.joshi@apexflow-erp.com',
    passwordHint: 'sales@2026',
    roleBadge: 'Junior Sales Exec (L4)',
    teamId: 'APEX-2026',
    teamName: 'Tzmicha ERP & Manufacturing Ltd',
    icon: <Briefcase className="w-4 h-4 text-amber-600" />,
    bgGradient: 'from-amber-50 to-orange-50 border-amber-200',
  },
  {
    name: 'Devendra Rawat',
    roleTitle: 'Store Keeper & Warehouse Hub Manager',
    email: 'devendra.r@apexflow-erp.com',
    passwordHint: 'store@2026',
    roleBadge: 'Store Keeper Hub',
    teamId: 'APEX-2026',
    teamName: 'Tzmicha ERP & Manufacturing Ltd',
    icon: <Warehouse className="w-4 h-4 text-amber-600" />,
    bgGradient: 'from-amber-50 to-orange-50 border-amber-200',
  },
  {
    name: 'Deepak Chawla',
    roleTitle: 'Customer Care & Service Lead',
    email: 'service@apexflow-erp.com',
    passwordHint: 'service@2026',
    roleBadge: 'Customer Service Desk',
    teamId: 'APEX-2026',
    teamName: 'Tzmicha ERP & Manufacturing Ltd',
    icon: <Headset className="w-4 h-4 text-sky-600" />,
    bgGradient: 'from-sky-50 to-blue-50 border-sky-200',
  },
  {
    name: 'Meera Iyer',
    roleTitle: 'Head of Marketing & Strategy (Tier 1)',
    email: 'meera.iyer@apexflow-erp.com',
    passwordHint: 'marketing@2026',
    roleBadge: 'Marketing Manager (M1)',
    teamId: 'APEX-2026',
    teamName: 'Tzmicha ERP & Manufacturing Ltd',
    icon: <Megaphone className="w-4 h-4 text-purple-600" />,
    bgGradient: 'from-purple-50 to-indigo-50 border-purple-200',
  },
  {
    name: 'Rohit Menon',
    roleTitle: 'Senior Marketing Executive & Sector Lead (Tier 2)',
    email: 'rohit.menon@apexflow-erp.com',
    passwordHint: 'marketing@2026',
    roleBadge: 'Senior Marketing Exec (M2)',
    teamId: 'APEX-2026',
    teamName: 'Tzmicha ERP & Manufacturing Ltd',
    icon: <Compass className="w-4 h-4 text-indigo-600" />,
    bgGradient: 'from-indigo-50 to-blue-50 border-indigo-200',
  },
  {
    name: 'Ananya Rao',
    roleTitle: 'Junior Marketing Executive & Field Outreach (Tier 3)',
    email: 'ananya.rao@apexflow-erp.com',
    passwordHint: 'marketing@2026',
    roleBadge: 'Junior Marketing Exec (M3)',
    teamId: 'APEX-2026',
    teamName: 'Tzmicha ERP & Manufacturing Ltd',
    icon: <Target className="w-4 h-4 text-emerald-600" />,
    bgGradient: 'from-emerald-50 to-teal-50 border-emerald-200',
  },
  {
    name: 'Suresh Singhania',
    roleTitle: 'Finance & Treasury Controller',
    email: 'cfo@apexflow-erp.com',
    passwordHint: 'finance@2026',
    roleBadge: 'Finance Hub & Treasury',
    teamId: 'APEX-2026',
    teamName: 'Tzmicha ERP & Manufacturing Ltd',
    icon: <Landmark className="w-4 h-4 text-purple-600" />,
    bgGradient: 'from-purple-50 to-indigo-50 border-purple-200',
  },
  {
    name: 'Aisha Bello',
    roleTitle: 'Head of Human Resources & People Operations',
    email: 'aisha.bello@apexflow-erp.com',
    passwordHint: 'hr@2026',
    roleBadge: 'Human Resources Hub',
    teamId: 'APEX-2026',
    teamName: 'Tzmicha ERP & Manufacturing Ltd',
    icon: <Users className="w-4 h-4 text-rose-600" />,
    bgGradient: 'from-rose-50 to-pink-50 border-rose-200',
  },
];

export const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginUser, organizations, registerOrganization } = useErpStore();

  const [teamId, setTeamId] = useState('APEX-2026');
  const [email, setEmail] = useState('rajesh.verma@apexflow-erp.com');
  const [password, setPassword] = useState('admin@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);

  // New Organization Registration Form State
  const [regTeamCode, setRegTeamCode] = useState('');
  const [regOrgName, setRegOrgName] = useState('');
  const [regIndustry, setRegIndustry] = useState('Chemicals & Manufacturing');
  const [regCurrency, setRegCurrency] = useState('INR (₹)');
  const [regPlan, setRegPlan] = useState<'Enterprise' | 'Professional' | 'Standard'>('Enterprise');

  const handleSelectDemoAccount = (acc: DemoAccount) => {
    setTeamId(acc.teamId);
    setEmail(acc.email);
    setPassword(acc.passwordHint);
    setErrorMessage(null);
  };

  const handleRegisterNewOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regTeamCode.trim() || !regOrgName.trim()) {
      return;
    }
    const cleanCode = regTeamCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    const limits = PLAN_TIERS[regPlan] || PLAN_TIERS.Standard;
    registerOrganization({
      teamId: cleanCode,
      name: regOrgName.trim(),
      industry: regIndustry,
      currency: regCurrency,
      plan: regPlan,
      maxEmployees: limits.maxEmployees,
      maxRegions: limits.maxRegions,
      maxWarehouses: limits.maxWarehouses,
      registeredAt: new Date().toISOString().split('T')[0],
      memberCount: 1,
    });
    setTeamId(cleanCode);
    setShowNewOrgModal(false);
    setRegTeamCode('');
    setRegOrgName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!teamId.trim()) {
      setErrorMessage('Please enter or select a Team / Organization ID to access your workspace.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter your corporate email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    setIsLoading(true);

    // Simulate authentic network latency and verify server-backed role
    setTimeout(() => {
      const res = loginUser(email, password, teamId);
      setIsLoading(false);

      if (!res.success) {
        setErrorMessage(res.message || 'Authentication failed. Please verify your credentials.');
        return;
      }

      // Authoritative server-determined role redirection
      if (res.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (res.role === 'sales') {
        navigate('/sales/dashboard');
      } else if (res.role === 'store_manager') {
        navigate('/store-manager/overview');
      } else if (res.role === 'marketing') {
        navigate('/marketing/workspace/dashboard');
      } else if (res.role === 'service') {
        navigate('/service');
      } else if (res.role === 'finance') {
        navigate('/finance');
      } else if (res.role === 'hr') {
        navigate('/hr');
      } else {
        navigate('/admin/dashboard');
      }
    }, 450);
  };

  // Find currently active organization details
  const activeOrgInfo = organizations.find(
    (o) => o.teamId.toUpperCase() === teamId.trim().toUpperCase()
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#f7f9fc] text-slate-900 relative overflow-x-hidden overflow-y-auto font-sans">
      {/* Light Ambient Mesh Background, 3D Floating Geometry & Grid */}
      <div className="mesh-gradient-bg">
        <div className="mesh-orb-1" />
        <div className="mesh-orb-2" />
        <div className="mesh-orb-3" />
        <div className="grid-overlay" />

        {/* 3D Floating Glass Torus */}
        <div className="absolute top-[8%] right-[6%] w-48 h-48 float-3d-1 opacity-60">
          <div className="w-full h-full glass-torus" />
        </div>

        {/* 3D Floating Glass Sphere */}
        <div className="absolute bottom-[10%] left-[5%] w-52 h-52 float-3d-2 opacity-60">
          <div className="w-full h-full glass-sphere" />
        </div>

        {/* 3D Floating Frosted Capsule */}
        <div className="absolute top-[25%] left-[8%] w-36 h-20 float-3d-4 opacity-40 rotate-12">
          <div className="w-full h-full rounded-full bg-gradient-to-r from-lime-300/30 via-emerald-400/20 to-sky-400/30 backdrop-blur-md border border-white/60 shadow-xl" />
        </div>
      </div>

      {/* Main Glassmorphic Login Card */}
      <div className="w-full max-w-xl relative z-10 animate-in fade-in zoom-in-95 duration-500 my-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 backdrop-blur-2xl shadow-[0_60px_120px_-60px_rgba(79,70,229,0.25)]">
          {/* Subtle top iridescent highlight */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-lime-400 via-emerald-400 to-indigo-500" />
          <div className="absolute -top-40 right-[-20%] h-80 w-80 rounded-full bg-gradient-to-br from-lime-400/10 to-emerald-400/10 blur-3xl" />
          <div className="absolute -bottom-48 left-[-10%] h-80 w-80 rounded-full bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 blur-3xl" />

          <div className="relative p-6 sm:p-10">
            {/* Brand Header */}
            <div className="text-center space-y-3.5 mb-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-slate-200/90 bg-white/80 shadow-xs text-[11px] font-normal text-slate-600 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Enterprise Design System</span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-slate-500">v2.4</span>
              </div>
              <div className="space-y-1.5">
                <h1 className="editorial-title text-3xl sm:text-4xl tracking-tight text-slate-900">
                  Tzmicha <span className="font-normal text-slate-700">ERP</span>
                </h1>
                <p className="editorial-subtitle text-sm text-slate-500 max-w-sm mx-auto">
                  A selection of complimentary enterprise operations, supply chain, regional stock and financial governance.
                </p>
              </div>
            </div>

          {/* Organization Concept Info Banner */}
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-indigo-100/80 bg-gradient-to-r from-indigo-50/80 via-white to-white px-4 py-3">
            <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-900">Tzmicha Enterprise ERP</span> — authorized access for organization team <span className="font-mono font-bold text-indigo-600">APEX-2026</span>. Strict role-based isolation active.
            </div>
          </div>

          {/* Quick-Fill Sample Accounts for Evaluation */}
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-900">Quick demo access</p>
                <p className="text-[11px] text-slate-500">Prefill credentials for testing roles</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                <Sparkles className="w-3 h-3" />
                Demo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const isSelected = email.toLowerCase() === acc.email.toLowerCase();
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleSelectDemoAccount(acc)}
                    className={`group relative overflow-hidden rounded-xl border p-2.5 text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-indigo-400 bg-gradient-to-r from-indigo-50/90 to-white shadow-[0_10px_30px_-15px_rgba(99,102,241,0.5)] ring-1 ring-indigo-300'
                      : 'border-slate-200/80 bg-white/70 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_15px_30px_-20px_rgba(99,102,241,0.3)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ring-1 shrink-0 ${isSelected ? 'bg-white text-slate-900 ring-indigo-200 shadow-xs' : 'bg-slate-50 text-slate-600 ring-slate-200'}`}>
                        {acc.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{acc.roleBadge}</p>
                        <p className="text-[11px] text-slate-500 truncate">{acc.name}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="text-xs leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Team / Organization ID Field with Quick Selectors */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Team / Organization ID
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="text-[11px] font-medium text-slate-900 hover:text-slate-700 flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Create organization</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value.toUpperCase())}
                  placeholder="e.g. APEX-2026"
                  className="w-full pl-10 pr-4 py-2.5 text-sm font-mono uppercase tracking-widest bg-white/80 border border-slate-200/80 rounded-xl text-slate-900 placeholder:text-slate-400 placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-500/5 transition-all"
                  required
                />
              </div>

              {/* Quick Select Organization Badges */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Quick Teams:</span>
                {organizations.map((org) => {
                  const isActive = org.teamId.toUpperCase() === teamId.trim().toUpperCase();
                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => setTeamId(org.teamId)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border font-mono font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                      title={org.name}
                    >
                      {isActive && <Check className="w-2.5 h-2.5" />}
                      <span>{org.teamId}</span>
                      <span className="font-sans text-[9px] opacity-80 hidden sm:inline">
                        ({org.name.split(' ')[0]})
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeOrgInfo && (
                <div className="mt-1.5 text-[10px] text-slate-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-700">{activeOrgInfo.name}</span>
                  <span className="text-slate-300">•</span>
                  <span>{activeOrgInfo.industry || 'Enterprise'}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-indigo-600 font-medium">{activeOrgInfo.plan || 'Enterprise'}</span>
                </div>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-800">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/80 border border-slate-200/80 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-500/5 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] font-medium text-slate-500 hover:text-indigo-600"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white/80 border border-slate-200/80 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-500/5 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full py-2.5 text-sm font-semibold bg-slate-900 hover:bg-slate-800 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.9)]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                <span>Sign in</span>
                <ArrowRight className="w-4 h-4 text-lime-400" />
                </>
              )}
            </Button>
          </form>

          {/* Security Footer */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-emerald-500" />
              <span>Secure authentication</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-lime-600" />
              <span>Tenant isolated</span>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-slate-500">
            <span>Don't have an organization?</span>{' '}
            <Link to="/register" className="font-medium text-slate-900 hover:text-slate-700">
              Register here
            </Link>
          </div>
          </div>
        </div>
      </div>

      {/* Register New Organization / Team Modal */}
      {showNewOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-600">
                <Building2 className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900">Register New Organization / Team</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewOrgModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Create an isolated organization workspace. Once registered, all users belonging to this Team ID can access their respective Admin, Sales, or Store Keeper portals.
            </p>

            <form onSubmit={handleRegisterNewOrg} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Unique Team ID / Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={regTeamCode}
                  onChange={(e) => setRegTeamCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ACME-CORP, APEX-SOUTH"
                  className="w-full px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Used by all team members to log into this organization workspace.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Organization / Company Legal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={regOrgName}
                  onChange={(e) => setRegOrgName(e.target.value)}
                  placeholder="e.g. Acme Industrial Technologies Pvt Ltd"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Industry Sector
                  </label>
                  <select
                    value={regIndustry}
                    onChange={(e) => setRegIndustry(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white"
                  >
                    <option value="Chemicals & Manufacturing">Chemicals & Manufacturing</option>
                    <option value="Construction & Precast">Construction & Precast</option>
                    <option value="Consumer Goods & Retail">Consumer Goods & Retail</option>
                    <option value="Heavy Machinery">Heavy Machinery</option>
                    <option value="Logistics & Freight">Logistics & Freight</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operating Currency
                  </label>
                  <select
                    value={regCurrency}
                    onChange={(e) => setRegCurrency(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white font-mono"
                  >
                    <option value="INR (₹)">INR (₹) - Indian Rupee</option>
                    <option value="USD ($)">USD ($) - US Dollar</option>
                    <option value="EUR (€)">EUR (€) - Euro</option>
                    <option value="AED (د.إ)">AED (د.إ) - UAE Dirham</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewOrgModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Register & Activate Team</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600">
                <HelpCircle className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900">Credential Assistance</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tzmicha ERP password policies are managed via enterprise single sign-on (SSO) and central Active Directory.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-semibold text-slate-800">Demo Environment Access:</div>
              <div className="text-slate-500">
                You can select any of the 4 quick-fill demo accounts above to sign in as Administrator, Sales Lead, Store Keeper, or Field Marketing with Team ID <span className="font-mono font-bold text-indigo-700">APEX-2026</span>.
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowForgotModal(false)}
            >
              Understood
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
