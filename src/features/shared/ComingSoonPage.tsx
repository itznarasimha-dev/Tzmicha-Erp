import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Shield,
  Briefcase,
  Compass,
  Warehouse,
  CheckCircle2,
  Calendar,
  Lock,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

export const ComingSoonPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getModuleInfo = () => {
    if (location.pathname.includes('/sales')) {
      return {
        title: 'Field Sales & Dealer Order Desk',
        roleName: 'Sales Representative',
        icon: <Briefcase className="w-8 h-8 text-indigo-600" />,
        badge: 'Coming in Q2 2026',
        description:
          'Dedicated portal for field representatives to book dealer quotations, monitor personal targets, request discount approvals, and track regional sales orders.',
        features: [
          'Live dealer catalogue with customer-specific pricing',
          'Instant batch-level reservation & automated quotation generator',
          'Sales target progress and personal sales commission ledger',
          'Field travel expense claims and instant wallet ledger',
        ],
      };
    }
    if (location.pathname.includes('/marketing')) {
      return {
        title: 'Physical Ground Marketing Intelligence',
        roleName: 'Field Marketing Officer',
        icon: <Compass className="w-8 h-8 text-teal-600" />,
        badge: 'Coming in Q2 2026',
        description:
          'On-ground operations module for dealer store inspections, retail prospect acquisition, route coverage tracking, and competitor retail price surveys.',
        features: [
          'GPS-verified dealer store check-in & meeting summaries',
          'New retail dealer onboarding & KYC document collection',
          'Competitor price tracking and local market demand insights',
          'Field travel, sample distribution, and event expense claims',
        ],
      };
    }
    return {
      title: 'Warehouse & Store Management System',
      roleName: 'Warehouse / Store Manager',
      icon: <Warehouse className="w-8 h-8 text-amber-600" />,
      badge: 'Coming in Q2 2026',
      description:
        'Regional warehouse physical stock inward, batch tracking, picking queue allocation, goods outward dispatches, and inter-store stock transfers.',
      features: [
        'Goods inward receipt with supplier invoice and batch generation',
        'Sales order dispatch queue & automated FIFO picking lists',
        'Inter-warehouse transfer gate passes & vehicle tracking',
        'Batch expiry monitoring & physical stock adjustment workflows',
      ],
    };
  };

  const module = getModuleInfo();

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      {/* Hero Banner */}
      <div className="glass-card p-8 sm:p-10 border border-indigo-100 text-center relative overflow-hidden">
        {/* Soft decorative glow */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center mb-4 shadow-sm">
          {module.icon}
        </div>

        <Badge variant="primary" size="md" className="mb-3">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 mr-1" />
          {module.badge}
        </Badge>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {module.title}
        </h1>

        <p className="text-sm text-slate-600 max-w-xl mx-auto mt-3 leading-relaxed">
          {module.description}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="primary"
            onClick={() => navigate('/admin/dashboard')}
            icon={<Shield className="w-4 h-4" />}
          >
            Go to Executive Admin Console
          </Button>
          <Button
            variant="glass"
            onClick={() => navigate('/admin/products')}
          >
            View Product Master & Costs
          </Button>
        </div>
      </div>

      {/* Feature Blueprint Preview */}
      <Card>
        <div className="p-2">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Module Development Scope & Release Roadmap
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {module.features.map((feat, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3"
              >
                <div className="p-1 rounded-lg bg-emerald-100 text-emerald-700 mt-0.5 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">{feat}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Integrated with Central Admin State & Inventory Ledger
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
