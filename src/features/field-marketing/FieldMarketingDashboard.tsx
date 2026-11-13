import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Compass, MapPin, Users, Wallet, Plus, ArrowRight, ClipboardList, RefreshCw } from 'lucide-react';
import {
  canUseFieldMarketingApi,
  fieldApiErrorMessage,
  mapApiSurvey,
  mapApiTarget,
  mapApiVisit,
  marketingApi,
  useFieldMarketingApiQuery,
} from './api-integration';

export const FieldMarketingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, fieldVisits, marketSurveys, marketingTargets } = useErpStore();
  const apiMode = canUseFieldMarketingApi();

  const apiVisits = useFieldMarketingApiQuery(async () => {
    const res = await marketingApi.listVisits({ pageSize: 20, sort: 'visitDate:desc' });
    return (res.data || []).map(mapApiVisit);
  }, [apiMode, currentUser.id]);
  const apiSurveys = useFieldMarketingApiQuery(async () => {
    const res = await marketingApi.listSurveys({ pageSize: 20, sort: 'date:desc' as any });
    return (res.data || []).map(mapApiSurvey);
  }, [apiMode, currentUser.id]);
  const apiTargets = useFieldMarketingApiQuery(async () => {
    const res = await marketingApi.listTargets({ pageSize: 50 });
    return (res.data || []).map(mapApiTarget);
  }, [apiMode, currentUser.id]);
  const apiRewards = useFieldMarketingApiQuery(async () => {
    const res = await marketingApi.listRewards({ pageSize: 20 });
    return (res.data || [])[0] || null;
  }, [apiMode, currentUser.id]);

  const demoMyVisits = fieldVisits.filter((v) => v.marketingUserId === currentUser.id);
  const demoMySurveys = marketSurveys.filter((s) => s.marketingUserId === currentUser.id);
  const demoTarget = marketingTargets.find((t) => t.userId === currentUser.id) || {
    targetVisits: 40,
    completedVisits: 28,
    targetNewDealers: 6,
    achievedNewDealers: 4,
    expenseBudget: 15000,
    submittedExpenses: 7800,
  };

  const visits = apiMode ? (apiVisits.data || []) : demoMyVisits;
  const surveys = apiMode ? (apiSurveys.data || []) : demoMySurveys;
  const walletBalance = apiMode ? (apiRewards.data?.balance || 0) : currentUser.walletBalance;

  const targetSummary = useMemo(() => {
    if (!apiMode) return demoTarget;
    const rows = apiTargets.data || [];
    const find = (k: string) => rows.find(r => r.metric.toLowerCase().includes(k));
    const v = find('visit');
    const d = find('dealer') || find('prospect') || find('lead');
    return {
      targetVisits: v?.targetValue ?? 0,
      completedVisits: v?.achievedValue ?? visits.filter(x => x.status === 'completed').length,
      targetNewDealers: d?.targetValue ?? 0,
      achievedNewDealers: d?.achievedValue ?? 0,
    };
  }, [apiMode, apiTargets.data, visits, demoTarget]);

  const activeVisit = (visits as any[]).find((v) => apiMode ? v.status === 'in_progress' : v.status === 'in_progress');
  const isLoading = apiMode && [apiVisits, apiSurveys, apiTargets, apiRewards].some(q => q.status === 'loading' || q.status === 'idle');
  const loadError = apiMode ? (apiVisits.error || apiSurveys.error || apiTargets.error || apiRewards.error) : null;

  const refreshAll = async () => {
    await Promise.all([apiVisits.refetch(), apiSurveys.refetch(), apiTargets.refetch(), apiRewards.refetch()]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Field Marketing & Ground Operations
            <Badge variant={apiMode ? 'success' : 'warning'} size="sm">{apiMode ? 'API Mode' : 'Demo Mode'}</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {apiMode ? 'Dashboard data loaded from backend marketing APIs (visits, surveys, targets, rewards).' : `Welcome back, ${currentUser.name}. Demo field marketing data.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {apiMode && (
            <Button variant="outline" size="sm" onClick={() => void refreshAll()} icon={<RefreshCw className="w-4 h-4" />}>Refresh</Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/marketing/surveys')} icon={<ClipboardList className="w-4 h-4 text-emerald-600" />}>Log Price Survey</Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/marketing/visits')} icon={<Plus className="w-4 h-4" />}>Check-In Visit</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 text-sm text-slate-500">Loading field marketing dashboard from API...</div>
      ) : loadError ? (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>Failed to load dashboard data: {loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void refreshAll()}>Retry</Button>
        </div>
      ) : (
        <>
          {activeVisit && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0"><MapPin className="w-5 h-5 text-white" /></div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Field Visit In Progress</span>
                    <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">
                      {apiMode ? (activeVisit.checkInTime ? `Checked in ${new Date(activeVisit.checkInTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}` : 'Active visit') : `Checked in at ${activeVisit.checkInTime}`}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white">{apiMode ? activeVisit.prospectName : (activeVisit.prospectName || 'Dealer Store Consultation')}</h3>
                  <p className="text-xs text-emerald-100">{apiMode ? activeVisit.locationAddress : activeVisit.locationAddress}</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" className="bg-white text-emerald-900 hover:bg-emerald-50 shrink-0 font-bold" onClick={() => navigate('/marketing/visits')}>
                Check-Out & Log Outcome
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Completed Field Visits" value={targetSummary.completedVisits} subtitle={`Target: ${targetSummary.targetVisits} visits`} icon={<Compass className="w-5 h-5 text-emerald-600" />} iconBgColor="bg-emerald-50 border-emerald-100" progress={{ current: targetSummary.completedVisits, total: Math.max(1, targetSummary.targetVisits), color: 'bg-emerald-600' }} onClick={() => navigate('/marketing/visits')} />
            <StatCard title="New Dealers Onboarded" value={targetSummary.achievedNewDealers} subtitle={`Target: ${targetSummary.targetNewDealers} accounts`} icon={<Users className="w-5 h-5 text-blue-600" />} iconBgColor="bg-blue-50 border-blue-100" progress={{ current: targetSummary.achievedNewDealers, total: Math.max(1, targetSummary.targetNewDealers), color: 'bg-blue-600' }} onClick={() => navigate('/marketing/dealers')} />
            <StatCard title="Competitor Price Logs" value={surveys.length} subtitle={apiMode ? 'Backend market surveys' : 'Observed retail prices'} icon={<ClipboardList className="w-5 h-5 text-amber-600" />} iconBgColor="bg-amber-50 border-amber-100" onClick={() => navigate('/marketing/surveys')} />
            <StatCard title={apiMode ? 'Reward Wallet Balance' : 'Field Wallet Balance'} value={`₹${Number(walletBalance || 0).toLocaleString('en-IN')}`} subtitle={apiMode ? 'From marketing rewards' : 'Available travel advance'} icon={<Wallet className="w-5 h-5 text-purple-600" />} iconBgColor="bg-purple-50 border-purple-100" onClick={() => navigate('/marketing/wallet')} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Recent Physical Visits</CardTitle>
                  <CardDescription>{apiMode ? 'Latest visits from backend API' : 'On-ground dealer interactions and demonstration logs'}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/marketing/visits')}>All Visits <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
              </CardHeader>
              <div className="space-y-3">
                {(visits as any[]).slice(0, 4).map((v) => {
                  const isApi = apiMode;
                  return (
                    <div key={v.id} className="p-3 rounded-xl bg-white/70 border border-slate-200/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{isApi ? v.prospectName : (v.prospectName || 'Apex Hardware & Industrial')}</span>
                          <Badge variant={String(v.status) === 'completed' ? 'success' : 'primary'} size="sm">{String(v.status).replace('_', ' ')}</Badge>
                        </div>
                        <span className="text-[11px] text-slate-400">{isApi ? v.visitDate : v.visitDate}</span>
                      </div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /><span className="truncate">{isApi ? v.locationAddress : v.locationAddress}</span></div>
                      {(isApi ? v.outcomeNotes : v.outcomeNotes) && <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mt-1">{isApi ? v.outcomeNotes : v.outcomeNotes}</p>}
                    </div>
                  );
                })}
                {visits.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No visits found.</p>}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Competitor Price Feed</CardTitle>
                  <CardDescription>{apiMode ? 'Recent market surveys from backend API' : 'Ground-level pricing reported across local dealers'}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/marketing/surveys')}>All Surveys <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
              </CardHeader>
              <div className="space-y-3">
                {(surveys as any[]).slice(0, 3).map((s) => {
                  if (apiMode) {
                    return (
                      <div key={s.id} className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{s.competitorBrand}</span>
                          <Badge variant={s.interest === 'High' ? 'success' : s.interest === 'Medium' ? 'warning' : 'neutral'} size="sm">{s.interest} interest</Badge>
                        </div>
                        {s.pricingObservation && <div><span className="text-slate-400 block">Pricing observation</span><span className="font-medium text-slate-700">{s.pricingObservation}</span></div>}
                        {s.observation && <p className="text-[11px] text-slate-600 italic">"{s.observation}"</p>}
                        {s.productFeedback && <p className="text-[11px] text-slate-500">{s.productFeedback}</p>}
                      </div>
                    );
                  }
                  return (
                    <div key={s.id} className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{s.dealerName}</span>
                        <Badge variant={s.priceDifference > 0 ? 'warning' : 'success'} size="sm">
                          {s.priceDifference > 0 ? `Competitor cheaper by ₹${s.priceDifference}` : `We are cheaper by ₹${Math.abs(s.priceDifference)}`}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div><span className="text-slate-400 block">Competitor:</span><span className="font-bold text-rose-700">{s.competitorBrand} ({s.competitorProduct})</span><span className="text-slate-500 block">₹{(s.competitorPricePerUnit || 0).toLocaleString('en-IN')}</span></div>
                        <div><span className="text-slate-400 block">Our Equivalent:</span><span className="font-bold text-indigo-700">{s.ourEquivalentProduct}</span><span className="text-slate-500 block">₹{(s.ourSellingPrice || 0).toLocaleString('en-IN')}</span></div>
                      </div>
                      <p className="text-[11px] text-slate-600 italic">"{s.dealerFeedback}"</p>
                    </div>
                  );
                })}
                {surveys.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No survey records found.</p>}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
