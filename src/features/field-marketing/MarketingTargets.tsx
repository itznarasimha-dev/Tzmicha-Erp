import React, { useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Compass, Users, Wallet, Target, CheckCircle2, RefreshCw } from 'lucide-react';
import { canUseFieldMarketingApi, fieldApiErrorMessage, mapApiTarget, marketingApi, useFieldMarketingApiQuery } from './api-integration';

export const MarketingTargets: React.FC = () => {
  const { marketingTargets, currentUser } = useErpStore();
  const apiMode = canUseFieldMarketingApi();
  const apiTargets = useFieldMarketingApiQuery(async () => {
    const res = await marketingApi.listTargets({ pageSize: 100 });
    return (res.data || []).map(mapApiTarget);
  }, [apiMode, currentUser.id]);

  const demoTarget = marketingTargets.find((t) => t.userId === currentUser.id) || {
    targetVisits: 40,
    completedVisits: 28,
    targetNewDealers: 6,
    achievedNewDealers: 4,
    expenseBudget: 15000,
    submittedExpenses: 7800,
    period: 'October 2026',
  };

  const apiDerived = useMemo(() => {
    const rows = apiTargets.data || [];
    const byMetric = (name: string) => rows.find((r) => r.metric.toLowerCase().includes(name));
    const visits = byMetric('visit');
    const dealers = byMetric('dealer') || byMetric('prospect') || byMetric('lead');
    const expense = byMetric('expense') || byMetric('budget');
    return {
      period: rows[0] ? `${rows[0].periodStart} to ${rows[0].periodEnd}` : 'Current period',
      targetVisits: visits?.targetValue ?? 0,
      completedVisits: visits?.achievedValue ?? 0,
      targetNewDealers: dealers?.targetValue ?? 0,
      achievedNewDealers: dealers?.achievedValue ?? 0,
      expenseBudget: expense?.targetValue ?? 0,
      submittedExpenses: expense?.achievedValue ?? 0,
      rows,
    };
  }, [apiTargets.data]);

  const target = apiMode ? apiDerived : demoTarget;
  const isLoading = apiMode && (apiTargets.status === 'loading' || apiTargets.status === 'idle');
  const loadError = apiMode ? apiTargets.error : null;

  const visitPct = target.targetVisits > 0 ? Math.min(100, Math.round((target.completedVisits / target.targetVisits) * 100)) : 0;
  const dealerPct = target.targetNewDealers > 0 ? Math.min(100, Math.round((target.achievedNewDealers / target.targetNewDealers) * 100)) : 0;
  const budgetUsedPct = target.expenseBudget > 0 ? Math.min(100, Math.round((target.submittedExpenses / target.expenseBudget) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Monthly Targets & Performance
            <Badge variant={apiMode ? 'success' : 'warning'} size="sm">{apiMode ? 'API Mode' : 'Demo Mode'}</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {apiMode ? 'Targets are loaded from backend /marketing/targets.' : 'Demo mode: targets come from local store seed data.'} ({(target as any).period})
          </p>
        </div>
        {apiMode && (
          <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => void apiTargets.refetch()}>
            Refresh
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="p-6 text-sm text-slate-500">Loading targets from API...</div>
      ) : loadError ? (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>Failed to load targets: {loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void apiTargets.refetch()}>Retry</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Physical Visits" value={`${target.completedVisits} / ${target.targetVisits}`} subtitle={`${visitPct}% of monthly visit target`} icon={<Compass className="w-5 h-5 text-blue-600" />} iconBgColor="bg-blue-50 border-blue-100" progress={{ current: target.completedVisits, total: Math.max(1, target.targetVisits), color: 'bg-blue-600' }} />
            <StatCard title="New Dealers Onboarded" value={`${target.achievedNewDealers} / ${target.targetNewDealers}`} subtitle={`${dealerPct}% of acquisition target`} icon={<Users className="w-5 h-5 text-emerald-600" />} iconBgColor="bg-emerald-50 border-emerald-100" progress={{ current: target.achievedNewDealers, total: Math.max(1, target.targetNewDealers), color: 'bg-emerald-600' }} />
            <StatCard title="Travel Budget Used" value={`₹${target.submittedExpenses.toLocaleString('en-IN')}`} subtitle={`₹${target.expenseBudget.toLocaleString('en-IN')} approved budget`} icon={<Wallet className="w-5 h-5 text-amber-600" />} iconBgColor="bg-amber-50 border-amber-100" progress={{ current: target.submittedExpenses, total: Math.max(1, target.expenseBudget), color: 'bg-amber-500' }} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Progress Breakdown</CardTitle>
              <CardDescription>{apiMode ? 'Derived from available API target metrics (visits/dealers/budget where provided).' : 'Demo target metrics.'}</CardDescription>
            </CardHeader>
            <div className="space-y-5">
              <ProgressRow label="Field Visit Coverage" valueText={`${target.completedVisits} of ${target.targetVisits}`} pct={visitPct} />
              <ProgressRow label="New Prospect Conversions" valueText={`${target.achievedNewDealers} of ${target.targetNewDealers}`} pct={dealerPct} />
              <ProgressRow label="Allocated Expense Budget Usage" valueText={`₹${target.submittedExpenses.toLocaleString('en-IN')} / ₹${target.expenseBudget.toLocaleString('en-IN')}`} pct={budgetUsedPct} warn={budgetUsedPct > 80} />
            </div>
          </Card>

          {apiMode && (apiDerived.rows?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Backend Target Records</CardTitle>
                <CardDescription>Raw target records returned by /marketing/targets for current scope.</CardDescription>
              </CardHeader>
              <div className="space-y-2">
                {apiDerived.rows.map((r) => (
                  <div key={r.id} className="p-3 rounded-lg border border-slate-200 bg-white/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 capitalize">{r.metric.replace('_', ' ')}</div>
                      <div className="text-slate-500">{r.periodStart} to {r.periodEnd}{r.notes ? ` • ${r.notes}` : ''}</div>
                    </div>
                    <div className="font-medium text-slate-700">{r.achievedValue} / {r.targetValue} {r.unit}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {!apiMode && (
            <Card className="bg-indigo-50/50 border-indigo-100">
              <CardHeader>
                <div>
                  <CardTitle className="text-indigo-900 flex items-center gap-2"><Target className="w-4 h-4" /> Weekly Coverage Plan (Demo)</CardTitle>
                  <CardDescription className="text-indigo-700/70">Suggested itinerary based on assigned territory clusters.</CardDescription>
                </div>
              </CardHeader>
              <div className="space-y-3">
                {['Mon - Tue: Noida Sector 62 Industrial Hub', 'Wed: Okhla Phase II Hardware Market', 'Thu - Fri: Greater Noida Dealer Belt'].map((day, i) => (
                  <div key={day} className="flex items-center justify-between p-3 rounded-lg bg-white border border-indigo-100">
                    <span className="text-sm font-medium text-slate-800">{day}</span>
                    <Badge variant={i < 2 ? 'success' : 'info'} size="sm">{i < 2 ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Covered</span> : 'Scheduled'}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

function ProgressRow({ label, valueText, pct, warn }: { label: string; valueText: string; pct: number; warn?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{valueText} ({pct}%)</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${warn ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}