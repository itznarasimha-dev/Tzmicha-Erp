import React from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { Compass, Users, Wallet, Target, CheckCircle2 } from 'lucide-react';

export const MarketingTargets: React.FC = () => {
  const { marketingTargets, currentUser } = useErpStore();

  const myTarget = marketingTargets.find((t) => t.userId === currentUser.id) || {
    targetVisits: 40,
    completedVisits: 28,
    targetNewDealers: 6,
    achievedNewDealers: 4,
    expenseBudget: 15000,
    submittedExpenses: 7800,
    period: 'October 2026',
  };

  const visitPct = Math.min(100, Math.round((myTarget.completedVisits / myTarget.targetVisits) * 100));
  const dealerPct = Math.min(100, Math.round((myTarget.achievedNewDealers / myTarget.targetNewDealers) * 100));
  const budgetUsedPct = Math.min(100, Math.round((myTarget.submittedExpenses / myTarget.expenseBudget) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Field Marketing Goals & Territory Targets
            <Badge variant="success" size="sm">October 2026</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ground-level physical inspection targets, retail store expansion, and promotional budget tracking.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          title="Physical Dealer Visits"
          value={`${myTarget.completedVisits} / ${myTarget.targetVisits}`}
          subtitle={`${visitPct}% completed this month`}
          icon={<Compass className="w-5 h-5 text-emerald-600" />}
          iconBgColor="bg-emerald-50 border-emerald-100"
          progress={{ current: myTarget.completedVisits, total: myTarget.targetVisits, color: 'bg-emerald-600' }}
        />

        <StatCard
          title="New Dealer Onboarding"
          value={`${myTarget.achievedNewDealers} / ${myTarget.targetNewDealers}`}
          subtitle={`${dealerPct}% converted to active accounts`}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          iconBgColor="bg-blue-50 border-blue-100"
          progress={{ current: myTarget.achievedNewDealers, total: myTarget.targetNewDealers, color: 'bg-blue-600' }}
        />

        <StatCard
          title="Field Travel Budget"
          value={`₹${myTarget.submittedExpenses.toLocaleString('en-IN')} / ₹${myTarget.expenseBudget.toLocaleString('en-IN')}`}
          subtitle={`${budgetUsedPct}% budget utilized`}
          icon={<Wallet className="w-5 h-5 text-purple-600" />}
          iconBgColor="bg-purple-50 border-purple-100"
          progress={{ current: myTarget.submittedExpenses, total: myTarget.expenseBudget, color: 'bg-purple-600' }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Physical Ground Coverage Plan</CardTitle>
          <CardDescription>Territory route priorities assigned for Noida, Greater Noida, and Ghaziabad</CardDescription>
        </CardHeader>

        <div className="space-y-3 pt-2">
          <div className="p-3 rounded-xl bg-white/70 border flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-900">Sector 9 Marble Market Hub</span>
              <p className="text-slate-500">14 visits completed • Focus: UltraCoat Epoxy Primers</p>
            </div>
            <Badge variant="success" size="sm">High Priority (100% Covered)</Badge>
          </div>

          <div className="p-3 rounded-xl bg-white/70 border flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-900">Ghaziabad Industrial Area & GT Road</span>
              <p className="text-slate-500">8 visits completed • Focus: TitanGrip PU Sealants</p>
            </div>
            <Badge variant="warning" size="sm">In Progress (70% Covered)</Badge>
          </div>

          <div className="p-3 rounded-xl bg-white/70 border flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-900">Greater Noida Knowledge Park Construction Sites</span>
              <p className="text-slate-500">6 visits completed • Focus: HydroShield Cementitious Slurry</p>
            </div>
            <Badge variant="primary" size="sm">Scheduled This Week</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};
