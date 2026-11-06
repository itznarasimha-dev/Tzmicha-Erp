import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Headset,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Wrench,
  Clock,
  CheckCircle2,
  Lock,
  ChevronRight,
  Truck,
  Star,
  Activity,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';

export const ServiceComingSoonView: React.FC = () => {
  const navigate = useNavigate();
  const { switchRole, currentOrganization } = useErpStore();

  const roadmapModules = [
    {
      title: 'Customer RMA Claims & Inward Return Intake',
      icon: <RotateCcw className="w-5 h-5 text-sky-600" />,
      tag: 'Returns Management',
      description:
        'Standard Return Merchandise Authorization (RMA) logging linked to original sales orders and invoices. Manages transit receipts and customer intake logs.',
      milestone: 'Phase 2.5 Alpha',
    },
    {
      title: 'Technical Defect & Quality Inspection',
      icon: <FileCheck className="w-5 h-5 text-indigo-600" />,
      tag: 'Quality Lab Verification',
      description:
        'Engineering laboratory assessments of returned batches. Categorizes manufacturing defects, transport impacts, and prepares supplier warranty chargebacks.',
      milestone: 'Phase 2.5 Beta',
    },
    {
      title: 'Warranty Validation & Batch Traceability',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      tag: 'Warranty & Compliance',
      description:
        'Instant serial and batch lookup across regional warehouses. Verifies warranty coverage terms, AMC support agreements, and product shelf-life eligibility.',
      milestone: 'Phase 2.5 Beta',
    },
    {
      title: 'Field Service Technician Dispatch',
      icon: <Wrench className="w-5 h-5 text-amber-600" />,
      tag: 'Field Operations',
      description:
        'On-site field engineer scheduling for customer equipment commissioning, chemical tank inspection, and on-site repair workorder signoffs.',
      milestone: 'Phase 2.6 Roadmap',
    },
    {
      title: 'Replacement Stock Allocations & Credit Notes',
      icon: <Truck className="w-5 h-5 text-purple-600" />,
      tag: 'Fulfillment & Finance',
      description:
        'Coordinates with warehouse managers for zero-charge replacement dispatches or issues authorized refund vouchers to Finance ledgers.',
      milestone: 'Phase 2.6 Roadmap',
    },
    {
      title: 'Customer Satisfaction (CSAT) & SLA Monitoring',
      icon: <Star className="w-5 h-5 text-teal-600" />,
      tag: 'Service Analytics',
      description:
        'Real-time Mean Time to Resolution (MTTR) monitoring, automated ticket escalations for delayed support claims, and dealer satisfaction scoring.',
      milestone: 'Phase 2.6 Roadmap',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1.5 text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200 font-bold">
            <Headset className="w-3.5 h-3.5" /> Customer Service Portal
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-800">After-Sales &amp; RMA Desk</span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="primary" size="sm">
            <Sparkles className="w-3 h-3 mr-1 inline" /> Scheduled Release: v2.5 Operations
          </Badge>
          <span className="text-xs text-slate-400 font-mono">Tenant: {currentOrganization?.teamId || 'APEX-2026'}</span>
        </div>
      </div>

      {/* Hero Showcase Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-blue-950 text-white p-8 sm:p-10 shadow-2xl border border-sky-900/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-sky-500/20 border border-sky-400/30 text-sky-200 text-xs font-bold">
            <Clock className="w-3.5 h-3.5 text-sky-300" />
            <span>Architecture Preview • Customer Operations</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/30 shrink-0">
              <Headset className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Customer Service &amp; Support Desk
              </h1>
              <p className="text-xs sm:text-sm text-sky-200/80 font-medium mt-0.5">
                RMA Authorization, Technical Defect Inspections &amp; Field Engineer Management
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
            The dedicated Customer Service Desk is in active technical architecture design. 
            Once live, this portal will empower support teams and technical engineers to manage 
            customer warranty claims, orchestrate Return Merchandise Authorizations (RMA), track 
            defect root causes back to manufacturing lots, and schedule on-site technician visits.
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
              className="bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/30 cursor-pointer"
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
              className="text-sky-200 hover:bg-white/10 cursor-pointer"
            >
              <span>Store Keeper Hub</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Sneak Peek Metrics */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Support Performance Indicators (Preview)
            </h3>
            <p className="text-[11px] text-slate-500">
              Interactive RMA tracking indicators scheduled for real-time live ingestion in release v2.5.
            </p>
          </div>
          <span className="text-[10px] font-mono text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md font-bold">
            Simulated Snapshot
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4 space-y-1 border border-sky-100 bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active RMA Claims
            </span>
            <div className="text-xl font-black text-slate-900 font-mono">
              14 Tickets
            </div>
            <div className="flex items-center gap-1 text-[11px] text-sky-600 font-semibold">
              <RotateCcw className="w-3 h-3" /> 8 Under Quality Inspection
            </div>
          </div>

          <div className="glass-card p-4 space-y-1 border border-indigo-100 bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Avg Resolution Turnaround
            </span>
            <div className="text-xl font-black text-slate-900 font-mono">
              2.4 Days
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3 h-3" /> Within 72h SLA Target
            </div>
          </div>

          <div className="glass-card p-4 space-y-1 border border-emerald-100 bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Warranty Coverage Rate
            </span>
            <div className="text-xl font-black text-slate-900 font-mono">
              98.2%
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
              <ShieldCheck className="w-3 h-3" /> Active Warranty Validation
            </div>
          </div>

          <div className="glass-card p-4 space-y-1 border border-amber-100 bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Customer CSAT Score
            </span>
            <div className="text-xl font-black text-amber-700 font-mono">
              4.85 / 5.0
            </div>
            <div className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Based on 124 Dealer Reviews
            </div>
          </div>
        </div>
      </div>

      {/* Future Roadmap Modules */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900">
            Customer Service Modules in Development
          </h2>
          <p className="text-xs text-slate-500">
            Functional components designed to elevate after-sales support and RMA traceability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roadmapModules.map((mod, idx) => (
            <Card key={idx} className="border-slate-200/90 hover:border-sky-300 transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center">
                    {mod.icon}
                  </div>
                  <Badge variant="primary" size="sm">
                    {mod.milestone}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold text-slate-900">{mod.title}</CardTitle>
                <div className="text-[10px] font-bold text-sky-700 uppercase tracking-wider mt-0.5">
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
                  <span className="text-sky-600 font-semibold">Preview Ready</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Quality & RMA Integration Notice */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-slate-900 block">Warehouse Quarantine Coordination</span>
            <span>
              All incoming customer returns generate receiving notifications for Store Keepers, ensuring rejected goods remain quarantined from sellable stock.
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin/customers')}
          className="shrink-0 text-xs"
        >
          View Customer Ledgers
        </Button>
      </div>
    </div>
  );
};
