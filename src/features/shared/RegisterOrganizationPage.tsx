import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import { SubscriptionPlan, PLAN_TIERS } from '../../types';
import {
  Boxes,
  Shield,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  CreditCard,
  Layers,
  ArrowLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface RegisterOrganizationPageProps {
  isAdminMode?: boolean;
}

export const RegisterOrganizationPage: React.FC<RegisterOrganizationPageProps> = ({
  isAdminMode = false,
}) => {
  const navigate = useNavigate();
  const { organizations, registerOrganizationWithAdmin } = useErpStore();

  // Plan Selection
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('Professional');

  // Organization Identity
  const [teamId, setTeamId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxGstNumber, setTaxGstNumber] = useState('');
  const [industry, setIndustry] = useState('Chemicals, Industrial Coatings & Construction');
  const [currency, setCurrency] = useState('INR (₹)');

  // Executive Admin Account
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Errors
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate Team ID from Company Name
  const handleCompanyNameChange = (val: string) => {
    setCompanyName(val);
    if (!teamId || teamId === generateSlug(companyName)) {
      setTeamId(generateSlug(val));
    }
  };

  const generateSlug = (text: string) => {
    const clean = text
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .split(/\s+/)
      .slice(0, 2)
      .join('-');
    return clean ? `${clean}-2026` : '';
  };

  // Availability validation
  const cleanTeamId = teamId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const isTeamIdTaken = organizations.some((o) => o.teamId.toUpperCase() === cleanTeamId);
  const isTeamIdValid = cleanTeamId.length >= 3 && !isTeamIdTaken;

  const currentPlanLimits = PLAN_TIERS[selectedPlan];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cleanTeamId) {
      setError('Please provide a unique Team ID / Code.');
      return;
    }
    if (isTeamIdTaken) {
      setError(`Team ID "${cleanTeamId}" is already registered. Please choose another code.`);
      return;
    }
    if (!companyName.trim()) {
      setError('Please enter the Organization trade name.');
      return;
    }
    if (!adminName.trim()) {
      setError('Please provide the Executive Administrator full name.');
      return;
    }
    if (!adminEmail.trim()) {
      setError('Please provide the Executive Administrator corporate email.');
      return;
    }
    if (password.length < 6) {
      setError('Master password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your confirmation password.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const res = registerOrganizationWithAdmin({
        organization: {
          teamId: cleanTeamId,
          name: companyName.trim(),
          legalName: legalName.trim() || companyName.trim(),
          taxGstNumber: taxGstNumber.trim(),
          industry,
          currency,
          plan: selectedPlan,
        },
        adminUser: {
          name: adminName.trim(),
          email: adminEmail.trim().toLowerCase(),
          password,
          phone: adminPhone.trim() || '+91 98000 00000',
          assignedRegionId: 'all',
        },
        autoLogin: !isAdminMode,
      });

      setIsSubmitting(false);

      if (!res.success) {
        setError(res.message);
        return;
      }

      if (isAdminMode) {
        navigate('/admin/users');
      } else {
        navigate('/admin/dashboard');
      }
    }, 450);
  };

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900 font-sans selection:bg-lime-300 selection:text-slate-900 relative overflow-x-hidden">
      {/* Light Ambient Mesh Background, 3D Floating Geometry & Grid */}
      <div className="mesh-gradient-bg">
        <div className="mesh-orb-1" />
        <div className="mesh-orb-2" />
        <div className="mesh-orb-3" />
        <div className="grid-overlay" />

        {/* 3D Floating Glass Torus */}
        <div className="absolute top-[12%] right-[4%] w-48 h-48 float-3d-1 opacity-55 pointer-events-none">
          <div className="w-full h-full glass-torus" />
        </div>

        {/* 3D Floating Glass Sphere */}
        <div className="absolute top-[45%] left-[-20px] w-52 h-52 float-3d-2 opacity-50 pointer-events-none">
          <div className="w-full h-full glass-sphere" />
        </div>
      </div>

      {/* Top Navigation Bar */}
      <header className="h-16 px-4 sm:px-8 bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/login" className="flex items-center gap-2.5 text-slate-900 hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <Boxes className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="font-bold text-lg tracking-tight block leading-tight">
                Tzmicha <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-500 bg-clip-text text-transparent">ERP</span>
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Enterprise Multi-Tenant ERP
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {isAdminMode ? (
            <Link
              to="/admin/users"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Directory</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 hidden sm:inline">Already registered your team?</span>
              <Link
                to="/login"
                className="font-bold text-slate-900 hover:text-slate-700 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-2xs transition-all"
              >
                Sign In →
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Title Header */}
        <div className="mb-8 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-lime-100 to-emerald-50 text-lime-900 border border-lime-200/80 text-xs font-semibold mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-lime-600" />
            <span>Dedicated Multi-Tenant Organization Provisioning</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight">
            Create Your Enterprise Team Workspace
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-3 leading-relaxed">
            Register your organization with a unique Team ID. Your operational quotas, employee seats, regional territories, and warehouse hubs are provisioned automatically according to your selected plan.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold">Registration Verification Error</div>
              <div className="text-xs mt-0.5">{error}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Steps (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Step 1: Plan Selection Cards */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_40px_80px_-60px_rgba(15,23,42,0.4)]">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-lime-400 via-emerald-400 to-cyan-400" />
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Step 1 of 3
                    </span>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">Choose Subscription Plan & Quotas</h2>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    <Shield className="w-3.5 h-3.5" />
                    Enforces Authentic RBAC Limits
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['Standard', 'Professional', 'Enterprise'] as SubscriptionPlan[]).map((planKey) => {
                    const p = PLAN_TIERS[planKey];
                    const isSelected = selectedPlan === planKey;

                    return (
                      <button
                        type="button"
                        key={planKey}
                        onClick={() => setSelectedPlan(planKey)}
                        className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white shadow-[0_40px_60px_-40px_rgba(15,23,42,0.9)]'
                            : 'border-slate-200/80 bg-white hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_40px_60px_-50px_rgba(15,23,42,0.6)]'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-lime-400 via-emerald-400 to-cyan-400" />
                        )}
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${
                              isSelected ? 'bg-lime-400 text-slate-950' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {p.title}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-lime-400" />}
                        </div>
                        <div className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>{p.price}</div>
                        <p className={`mt-1 text-[11px] leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          {p.description}
                        </p>
                        <div className={`mt-4 space-y-1.5 border-t pt-3 text-[11px] ${isSelected ? 'border-white/10' : 'border-slate-100'}`}>
                          <div className="flex items-center justify-between">
                            <span className={isSelected ? 'text-slate-300' : 'text-slate-500'}>Seat Limit</span>
                            <span className={`font-semibold ${isSelected ? 'text-lime-300' : 'text-slate-900'}`}>
                              {p.maxEmployees >= 999 ? 'Unlimited' : `${p.maxEmployees} Reps & Staff`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={isSelected ? 'text-slate-300' : 'text-slate-500'}>Territories</span>
                            <span className={`font-semibold ${isSelected ? 'text-lime-300' : 'text-slate-900'}`}>
                              {p.maxRegions >= 999 ? 'Unlimited' : `${p.maxRegions} Regions`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={isSelected ? 'text-slate-300' : 'text-slate-500'}>Depot Hubs</span>
                            <span className={`font-semibold ${isSelected ? 'text-lime-300' : 'text-slate-900'}`}>
                              {p.maxWarehouses >= 999 ? 'Unlimited' : `${p.maxWarehouses} Warehouses`}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 2: Organization & Team Identity */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_40px_80px_-60px_rgba(15,23,42,0.4)]">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Step 2 of 3
                  </span>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">Organization & Team Workspace Identity</h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-800">
                        Unique Team ID / Code <span className="text-rose-500">*</span>
                      </label>
                      {cleanTeamId && (
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${isTeamIdValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isTeamIdValid ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          <span>{isTeamIdValid ? 'Available' : 'Already in use'}</span>
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={teamId}
                        onChange={(e) => setTeamId(e.target.value.toUpperCase())}
                        placeholder="e.g. APEX-2026, TITAN-IND, GLOBAL-MFG"
                        className="w-full pl-10 pr-4 py-2.5 text-sm font-mono uppercase tracking-widest bg-white/80 border border-slate-200/80 rounded-xl text-slate-900 placeholder:text-slate-400 placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        required
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      Used by all personnel to sign in to their portals.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-800">
                        Company Brand / Trade Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => handleCompanyNameChange(e.target.value)}
                        placeholder="e.g. ApexFlow Industries"
                        className="w-full px-4 py-2.5 text-sm bg-white/80 border border-slate-200/80 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-800">
                        Registered Legal Entity Name
                      </label>
                      <input
                        type="text"
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="e.g. ApexFlow Speciality Materials Pvt Ltd"
                        className="w-full px-4 py-2.5 text-sm bg-white/80 border border-slate-200/80 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-800">
                        GSTIN / Corporate Tax ID
                      </label>
                      <input
                        type="text"
                        value={taxGstNumber}
                        onChange={(e) => setTaxGstNumber(e.target.value.toUpperCase())}
                        placeholder="07AAACA1234F1Z5"
                        className="w-full px-4 py-2.5 text-sm font-mono bg-white/80 border border-slate-200/80 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-800">
                        Industry Domain
                      </label>
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm bg-white/80 border border-slate-200/80 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      >
                        <option value="Chemicals, Industrial Coatings & Construction">Chemicals & Coatings</option>
                        <option value="Construction & Precast Materials">Construction & Precast</option>
                        <option value="Polymers, Synthetics & Solvents">Polymers & Solvents</option>
                        <option value="Consumer Goods & Retail Distribution">Consumer Goods & FMCG</option>
                        <option value="Heavy Machinery & Engineering">Heavy Engineering</option>
                        <option value="Automotive & Spare Parts">Automotive & Spare Parts</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-800">
                        Operational Currency
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm font-mono bg-white/80 border border-slate-200/80 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      >
                        <option value="INR (₹)">INR (₹)</option>
                        <option value="USD ($)">USD ($)</option>
                        <option value="EUR (€)">EUR (€)</option>
                        <option value="AED (د.إ)">AED (د.إ)</option>
                        <option value="GBP (£)">GBP (£)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Executive Administrator Account */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_40px_80px_-60px_rgba(15,23,42,0.4)]">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-lime-400 to-teal-400" />
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Step 3 of 3
                  </span>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">Primary Executive Administrator Account</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    This user receives complete system administrator rights, user provisioning access, and financial report authority.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-800">
                        Admin Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          placeholder="e.g. Sunil Mehta"
                          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/80 border border-slate-200/80 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-800">
                        Corporate Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="admin@yourcompany.com"
                          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/80 border border-slate-200/80 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-800">
                        Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={adminPhone}
                          onChange={(e) => setAdminPhone(e.target.value)}
                          placeholder="+91 98220 12345"
                          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/80 border border-slate-200/80 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-800">
                        Admin Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-10 pr-10 py-2.5 text-sm bg-white/80 border border-slate-200/80 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-800">
                        Confirm Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/80 border border-slate-200/80 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <Link
                to="/login"
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Login</span>
              </Link>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting}
                className="px-8 shadow-[0_30px_60px_-30px_rgba(79,70,229,0.9)]"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Provisioning...</span>
                  </>
                ) : (
                  <>
                    <span>Activate Organization & Launch Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
            <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-[#a3e635] via-[#84cc16] to-[#65a30d] text-slate-950 shadow-[0_60px_100px_-60px_rgba(101,163,13,0.9)]">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/25 blur-3xl" />
              <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-lime-200/30 blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-8">
                  <div className="inline-flex h-10 w-14 items-center justify-center rounded-xl bg-slate-950/10">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em]">{selectedPlan} Edition</span>
                </div>
                <div className="mb-6">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-slate-950/70">Tenant Team ID</span>
                  <div className="mt-1 font-mono text-2xl font-bold tracking-[0.4em]">
                    {cleanTeamId || 'TEAM-ID'}
                  </div>
                </div>
                <div className="flex items-end justify-between border-t border-slate-950/15 pt-4">
                  <div>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.4em] text-slate-950/70">Organization</span>
                    <div className="mt-1 text-sm font-bold truncate max-w-[170px]">{companyName || 'Enterprise Company'}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.4em] text-slate-950/70">Admin</span>
                    <div className="mt-1 text-sm font-bold truncate max-w-[140px]">{adminName || 'Admin Lead'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Quotas Summary Card */}
            <div className="rounded-3xl border border-slate-200/80 bg-white shadow-[0_40px_80px_-60px_rgba(15,23,42,0.4)]">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-lime-100 text-lime-700">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{selectedPlan} Plan Quotas</h3>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{currentPlanLimits.price}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Max Personnel Seats</span>
                    <span className="font-medium text-slate-900">
                      {currentPlanLimits.maxEmployees >= 999 ? 'Unlimited' : currentPlanLimits.maxEmployees}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Authorized Territories</span>
                    <span className="font-medium text-slate-900">
                      {currentPlanLimits.maxRegions >= 999 ? 'Unlimited' : currentPlanLimits.maxRegions}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Warehouse Hubs</span>
                    <span className="font-medium text-slate-900">
                      {currentPlanLimits.maxWarehouses >= 999 ? 'Unlimited' : currentPlanLimits.maxWarehouses}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Operating Currency</span>
                    <span className="font-medium text-slate-900">{currency}</span>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-900">Included Capabilities</p>
                  <ul className="mt-2 space-y-1.5">
                    {currentPlanLimits.features.slice(0, 4).map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Multi-Tenant Security Note */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 text-xs text-slate-600">
              <div className="flex items-center gap-2 text-slate-900">
                <Lock className="w-4 h-4 text-slate-400" />
                <span className="font-medium">Strict tenant isolation</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                All data is partitioned by Team ID with role-based access control.
              </p>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default RegisterOrganizationPage;