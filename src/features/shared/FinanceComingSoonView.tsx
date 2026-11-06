import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Landmark,
  Sparkles,
  ArrowRight,
  Shield,
  FileSpreadsheet,
  Receipt,
  Scale,
  Clock,
  CheckCircle2,
  Lock,
  Building2,
  Calendar,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  CreditCard,
  Layers,
  ChevronRight,
} from 'lucide-react';

export const FinanceComingSoonView: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, switchRole, currentOrganization } = useErpStore();

  const roadmapModules = [
    {
      title: 'General Ledger & Double-Entry Journals',
      icon: <FileSpreadsheet className="w-5 h-5 text-purple-600" />,
      tag: 'Core Accounting',
      description:
        'Standard Chart of Accounts (COA) with automated journal voucher posting for inward inventory receipts, sales dispatches, and expense settlements.',
      milestone: 'Phase 2.4 Alpha',
    },
    {
      title: 'Automated Multi-Depot Bank Reconciliation',
      icon: <Landmark className="w-5 h-5 text-indigo-600" />,
      tag: 'Treasury & Cash',
      description:
        'Direct statement ingestion for ICICI/HDFC/SBI business accounts. Auto-matches customer NEFT/RTGS collections against pending invoice ledgers.',
      milestone: 'Phase 2.4 Beta',
    },
    {
      title: 'GST Compliance & Automated E-Invoicing',
      icon: <Receipt className="w-5 h-5 text-emerald-600" />,
      tag: 'Tax Regulatory',
      description:
        'Government NIC portal gateway for instant Invoice Reference Number (IRN) generation, QR-code stamping, and automated E-Way Bill generation.',
      milestone: 'Phase 2.4 Release',
    },
    {
      title: 'Real-Time P&L & Balance Sheet Audits',
      icon: <Scale className="w-5 h-5 text-amber-600" />,
      tag: 'Executive Reporting',
      description:
        'Depot-level gross margin analytics, automated COGS computation based on actual batch inward costs, and instant monthly trial balance generation.',
      milestone: 'Phase 2.5 Roadmap',
    },
    {
      title: 'A/R Debtor Aging & Credit Risk Freezes',
      icon: <CreditCard className="w-5 h-5 text-rose-600" />,
      tag: 'Credit Governance',
      description:
        'Granular 30/60/90+ day accounts receivable aging schedules with automated credit freeze triggers when customer limits or invoice terms expire.',
      milestone: 'Phase 2.5 Roadmap',
    },
    {
      title: 'Fixed Asset Depreciation & Capex Ledger',
      icon: <Layers className="w-5 h-5 text-blue-600" />,
      tag: 'Asset Accounting',
      description:
        'Straight-line and written-down value (WDV) depreciation engines for warehouse capital equipment, storage bays, and transport vehicles.',
      milestone: 'Phase 2.5 Roadmap',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1.5 text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 font-bold">
            <Landmark className="w-3.5 h-3.5" /> Finance Role Portal
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-800">Accounting &amp; Treasury</span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="purple" size="sm">
            <Sparkles className="w-3 h-3 mr-1 inline" /> Scheduled Release: v2.4 Enterprise
          </Badge>
          <span className="text-xs text-slate-400 font-mono">Tenant: {currentOrganization?.teamId || 'APEX-2026'}</span>
        </div>
      </div>

      {/* Hero Showcase Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white p-8 sm:p-10 shadow-2xl border border-purple-900/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-bold">
            <Clock className="w-3.5 h-3.5 text-purple-300" />
            <span>Architecture Preview • Role Experience</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
              <Landmark className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Finance &amp; Treasury Control Center
              </h1>
              <p className="text-xs sm:text-sm text-purple-200/80 font-medium mt-0.5">
                Multi-Tenant Financial Ledgers, Bank Reconciliations &amp; Statutory GST Filings
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
            The dedicated Finance Portal is currently undergoing end-to-end architecture development. 
            When activated, this workspace will provide corporate controllers and accounts personnel with 
            double-entry general ledger management, automated multi-depot cash reconciliation, direct tax 
            invoice certification, and real-time balance sheet auditing synchronized with physical warehouse goods.
          </p>

          <div className="pt-3 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/dashboard')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer"
            >
              Return to Executive Overview
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                switchRole('sales');
                navigate('/sales/dashboard');
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30 cursor-pointer"
            >
              <span>Explore Sales Workspace</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                switchRole('store_manager');
                navigate('/store-manager/overview');
              }}
              className="text-purple-200 hover:bg-white/10 cursor-pointer"
            >
              <span>Store Keeper Hub</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Sneak Peek Architectural Simulation Metrics */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Upcoming Architecture Metric Previews
            </h3>
            <p className="text-[11px] text-slate-500">
              Interactive ledger indicators scheduled for real-time live ingestion in release v2.4.
            </p>
          </div>
          <span className="text-[10px] font-mono text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md font-bold">
            Simulated Snapshot
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4 space-y-1 border border-purple-100 bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Liquid Operating Cash Reserves
            </span>
            <div className="text-xl font-black text-slate-900 font-mono">
              ₹1,42,80,000
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
              <TrendingUp className="w-3 h-3" /> Across 4 Central Depots
            </div>
          </div>

          <div className="glass-card p-4 space-y-1 border border-indigo-100 bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Projected Monthly Billing
            </span>
            <div className="text-xl font-black text-slate-900 font-mono">
              ₹86,45,200
            </div>
            <div className="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold">
              <Receipt className="w-3 h-3" /> 148 Invoices Cleared
            </div>
          </div>

          <div className="glass-card p-4 space-y-1 border border-amber-100 bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Accounts Receivable Aging (A/R)
            </span>
            <div className="text-xl font-black text-amber-700 font-mono">
              ₹31,24,500
            </div>
            <div className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold">
              <Clock className="w-3 h-3" /> Average DSO: 24 Days
            </div>
          </div>

          <div className="glass-card p-4 space-y-1 border border-emerald-100 bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Statutory GST Provisioning
            </span>
            <div className="text-xl font-black text-slate-900 font-mono">
              ₹14,82,600
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3 h-3" /> GSTR-1 &amp; GSTR-3B Sync
            </div>
          </div>
        </div>
      </div>

      {/* Future Roadmap Modules */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900">
            Enterprise Finance Modules in Development
          </h2>
          <p className="text-xs text-slate-500">
            Detailed specifications of functional capabilities planned for the Finance &amp; Accounting role.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roadmapModules.map((mod, idx) => (
            <Card key={idx} className="border-slate-200/90 hover:border-purple-300 transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                    {mod.icon}
                  </div>
                  <Badge variant="purple" size="sm">
                    {mod.milestone}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold text-slate-900">{mod.title}</CardTitle>
                <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mt-0.5">
                  {mod.tag}
                </div>
              </CardHeader>
              <div className="px-6 pb-5 pt-0">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {mod.description}
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Module In Engineering
                  </span>
                  <span className="text-purple-600 font-semibold">Preview Ready</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Security & Audit Compliance Statement */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-indigo-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-slate-900 block">Enterprise Security &amp; RBAC Control</span>
            <span>
              All financial statements, tax rates, and ledger entries require multi-signature authorization and cryptographic audit logging before production ledger commit.
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin/audit-logs')}
          className="shrink-0 text-xs"
        >
          View System Logs
        </Button>
      </div>
    </div>
  );
};
