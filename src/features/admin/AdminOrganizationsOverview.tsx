import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Building2,
  Users,
  CheckCircle2,
  Shield,
  Layers,
  MapPin,
  Warehouse,
  Check,
  Calendar,
  Mail,
  FileText,
  Lock,
  CreditCard,
  History,
  Phone,
  Landmark,
  ShieldCheck,
  Award,
  Globe,
  ExternalLink,
} from 'lucide-react';

export const AdminOrganizationsOverview: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentOrganization,
    users,
    regions,
    warehouses,
    products,
  } = useErpStore();

  const activeOrg = currentOrganization || {
    id: 'org-apex',
    teamId: 'APEX-2026',
    name: 'Tzmicha ERP & Manufacturing Ltd',
    legalName: 'Tzmicha Speciality Industrial Solutions India Pvt Ltd',
    taxGstNumber: '07AAACA1234F1Z5',
    industry: 'Chemicals, Industrial Coatings & Construction',
    currency: 'INR (₹)',
    plan: 'Enterprise',
    maxEmployees: 999,
    maxRegions: 999,
    maxWarehouses: 999,
    registeredAt: '2024-01-15',
    adminEmail: 'rajesh.verma@apexflow-erp.com',
    adminName: 'Rajesh Verma',
  };

  const totalEmployees = users.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Organization &amp; Corporate Profile
            </h1>
            <Badge variant="purple" size="sm">
              Code: {activeOrg.teamId}
            </Badge>
            <Badge variant="success" size="sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse inline-block" />
              Primary Authorized Organization
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official enterprise credentials, tax registrations, operational capacity limits, and registered regional depot infrastructure for Tzmicha ERP.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/audit-logs')}
            className="text-xs cursor-pointer"
          >
            <History className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Audit Logs
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/admin/subscription')}
            className="text-xs cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <CreditCard className="w-3.5 h-3.5 mr-1" />
            Subscription &amp; Recharge
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 space-y-1.5 border border-indigo-100/80">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Company Identity
            </span>
            <Building2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 truncate">
            {activeOrg.name}
          </div>
          <p className="text-[11px] text-slate-500 font-medium font-mono">Team ID: {activeOrg.teamId}</p>
        </div>

        <div className="glass-card p-4 space-y-1.5 border border-purple-100/80">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active License Tier
            </span>
            <Shield className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {activeOrg.plan || 'Enterprise'}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Unlimited Regional Depots &amp; Audits</p>
        </div>

        <div className="glass-card p-4 space-y-1.5 border border-emerald-100/80">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Allocated Personnel
            </span>
            <Users className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {totalEmployees} Members
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Across Admin, Sales &amp; Store Keepers</p>
        </div>

        <div className="glass-card p-4 space-y-1.5 border border-amber-100/80">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Operating Footprint
            </span>
            <Warehouse className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {warehouses.length} Depots
          </div>
          <p className="text-[11px] text-slate-500 font-medium">{regions.length} Active Sales Territories</p>
        </div>
      </div>

      {/* Main Corporate Profile Card */}
      <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 shadow-sm overflow-hidden">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200">
                  {activeOrg.teamId}
                </span>
                <Badge variant="purple" size="sm">
                  {activeOrg.plan} Subscription Tier
                </Badge>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Check className="w-3 h-3" /> Fully Verified Legal Entity
                </span>
              </div>
              <CardTitle className="text-xl mt-1.5">{activeOrg.name}</CardTitle>
              {activeOrg.legalName && (
                <CardDescription className="text-xs text-slate-600 font-medium mt-0.5">
                  Registered Legal Name: {activeOrg.legalName}
                </CardDescription>
              )}
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/admin/subscription')}
              className="cursor-pointer text-xs bg-indigo-600 hover:bg-indigo-700 text-white self-start md:self-auto shrink-0 shadow-sm"
            >
              <CreditCard className="w-3.5 h-3.5 mr-1" />
              Manage Subscription &amp; Recharge
            </Button>
          </div>
        </CardHeader>

        <div className="px-6 pb-6 pt-0 space-y-4">
          {/* Detailed Corporate Identifiers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-4 px-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GSTIN / Tax ID</span>
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mt-0.5 inline-block">
                {activeOrg.taxGstNumber || '07AAACA1234F1Z5'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Corporate ID (CIN)</span>
              <span className="text-xs font-mono font-bold text-slate-900 mt-0.5 block">U24290DL2024PTC398214</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Industry Domain</span>
              <span className="text-xs font-semibold text-slate-900 truncate block mt-0.5">{activeOrg.industry || 'Chemicals & Materials'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Base Operating Currency</span>
              <span className="text-xs font-mono font-bold text-slate-900 mt-0.5 block">{activeOrg.currency || 'INR (₹)'}</span>
            </div>
          </div>

          {/* Registered Address & Incorporation Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Corporate Office</span>
              <span className="font-semibold text-slate-800 mt-1 block leading-relaxed">
                Plot 42, Okhla Industrial Area Phase III, New Delhi 110020, India
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Executive Admin Contact</span>
              <span className="font-semibold text-slate-800 mt-1 block">
                {activeOrg.adminName || 'Rajesh Verma'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono block">
                {activeOrg.adminEmail || 'rajesh.verma@apexflow-erp.com'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Incorporation &amp; Setup Date</span>
              <span className="font-semibold text-slate-800 mt-1 block flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {activeOrg.registeredAt || '15 Jan 2024'}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">
                Status: In Good Standing (MCA Verified)
              </span>
            </div>
          </div>

          {/* Operational Capacity Quotas Progress */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Operational License Quotas &amp; Capacity Utilization
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" /> Employee Seats
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {totalEmployees} / Unlimited
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '28%' }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Operating Regions
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {regions.length} / Unlimited
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: '40%' }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                    <Warehouse className="w-3.5 h-3.5 text-amber-600" /> Regional Depots
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {warehouses.length} / Unlimited
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-amber-600 h-1.5 rounded-full" style={{ width: '35%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Connected Regional Depot Infrastructure */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-indigo-600" />
                Registered Operational Warehouses &amp; Depot Network ({warehouses.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Authoritative logistics nodes and storage hubs commissioned under {activeOrg.name}.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/regions')}
              className="text-xs"
            >
              <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Manage Territories
            </Button>
          </div>
        </CardHeader>

        <div className="p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {warehouses.map((wh) => {
            const assignedRegion = regions.find((r) => r.id === wh.regionId);
            return (
              <div
                key={wh.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {wh.code}
                  </span>
                  <Badge variant="success" size="sm">Active</Badge>
                </div>
                <h4 className="font-bold text-xs text-slate-900 leading-tight">
                  {wh.name}
                </h4>
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{assignedRegion?.name || 'Assigned Region'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {wh.address}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Statutory Compliance, Security & Banking Profile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
            <Landmark className="w-4 h-4" />
            <span>Corporate Banking &amp; Virtual Account</span>
          </div>
          <div className="text-xs text-slate-600 leading-relaxed">
            Registered ICICI &amp; HDFC Treasury settlement routing active. Virtual billing collection reference ID: <strong className="font-mono text-slate-900">TZM9920194012</strong>.
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
            <Award className="w-4 h-4" />
            <span>Statutory Tax &amp; E-Way Integration</span>
          </div>
          <div className="text-xs text-slate-600 leading-relaxed">
            Direct NIC E-Way Bill &amp; GST E-Invoicing live API integration configured for interstate dispatches under GSTIN <strong className="font-mono text-slate-900">{activeOrg.taxGstNumber || '07AAACA1234F1Z5'}</strong>.
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Cryptographic Security &amp; Audit SLA</span>
          </div>
          <div className="text-xs text-slate-600 leading-relaxed">
            256-bit encryption active with immutable user audit log archival. All stock movements and remittances are cryptographically traceable.
          </div>
        </div>
      </div>
    </div>
  );
};
