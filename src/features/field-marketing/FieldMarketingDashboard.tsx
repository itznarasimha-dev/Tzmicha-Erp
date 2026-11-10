import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Compass,
  MapPin,
  CheckCircle2,
  Users,
  Wallet,
  Calendar,
  Plus,
  ArrowRight,
  ClipboardList,
  AlertCircle,
} from 'lucide-react';

export const FieldMarketingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, fieldVisits, marketSurveys, customers, marketingTargets } = useErpStore();

  const myVisits = fieldVisits.filter((v) => v.marketingUserId === currentUser.id);
  const mySurveys = marketSurveys.filter((s) => s.marketingUserId === currentUser.id);
  const myTargets = marketingTargets.find((t) => t.userId === currentUser.id) || {
    targetVisits: 40,
    completedVisits: 28,
    targetNewDealers: 6,
    achievedNewDealers: 4,
    expenseBudget: 15000,
    submittedExpenses: 7800,
  };

  const activeVisit = myVisits.find((v) => v.status === 'in_progress');
  const visitProgressPercent = Math.min(100, Math.round((myTargets.completedVisits / myTargets.targetVisits) * 100));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Field Marketing & Ground Operations
            <Badge variant="success" size="sm">North Territory Rep</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Welcome back, {currentUser.name}. Physical dealer visits, product sampling, and on-ground competitor intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/marketing/surveys')}
            icon={<ClipboardList className="w-4 h-4 text-emerald-600" />}
          >
            Log Price Survey
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/marketing/visits')}
            icon={<Plus className="w-4 h-4" />}
          >
            Check-In Visit
          </Button>
        </div>
      </div>

      {/* Active Visit Alert Banner */}
      {activeVisit && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  Field Visit In Progress
                </span>
                <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">
                  Checked in at {activeVisit.checkInTime}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white">
                {activeVisit.prospectName || 'Dealer Store Consultation'}
              </h3>
              <p className="text-xs text-emerald-100">{activeVisit.locationAddress}</p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="bg-white text-emerald-900 hover:bg-emerald-50 shrink-0 font-bold"
            onClick={() => navigate('/marketing/visits')}
          >
            Check-Out & Log Outcome
          </Button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Completed Field Visits"
          value={myTargets.completedVisits}
          subtitle={`Target: ${myTargets.targetVisits} visits`}
          icon={<Compass className="w-5 h-5 text-emerald-600" />}
          iconBgColor="bg-emerald-50 border-emerald-100"
          progress={{ current: myTargets.completedVisits, total: myTargets.targetVisits, color: 'bg-emerald-600' }}
          onClick={() => navigate('/marketing/visits')}
        />

        <StatCard
          title="New Dealers Onboarded"
          value={myTargets.achievedNewDealers}
          subtitle={`Target: ${myTargets.targetNewDealers} accounts`}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          iconBgColor="bg-blue-50 border-blue-100"
          progress={{ current: myTargets.achievedNewDealers, total: myTargets.targetNewDealers, color: 'bg-blue-600' }}
          onClick={() => navigate('/marketing/dealers')}
        />

        <StatCard
          title="Competitor Price Logs"
          value={mySurveys.length}
          subtitle="Observed retail prices"
          icon={<ClipboardList className="w-5 h-5 text-amber-600" />}
          iconBgColor="bg-amber-50 border-amber-100"
          onClick={() => navigate('/marketing/surveys')}
        />

        <StatCard
          title="Field Wallet Balance"
          value={`₹${currentUser.walletBalance.toLocaleString('en-IN')}`}
          subtitle="Available travel advance"
          icon={<Wallet className="w-5 h-5 text-purple-600" />}
          iconBgColor="bg-purple-50 border-purple-100"
          onClick={() => navigate('/marketing/wallet')}
        />
      </div>

      {/* Recent Visits & Competitor Price Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visit Planner Preview */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent Physical Visits</CardTitle>
              <CardDescription>On-ground dealer interactions and demonstration logs</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/marketing/visits')}>
              All Visits <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>

          <div className="space-y-3">
            {myVisits.slice(0, 4).map((v) => (
              <div key={v.id} className="p-3 rounded-xl bg-white/70 border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {v.prospectName || 'Apex Hardware & Industrial'}
                    </span>
                    <Badge variant={v.status === 'completed' ? 'success' : 'primary'} size="sm">
                      {v.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-slate-400">{v.visitDate}</span>
                </div>

                <div className="text-slate-500 text-[11px] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span className="truncate">{v.locationAddress}</span>
                </div>

                {v.outcomeNotes && (
                  <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mt-1">
                    {v.outcomeNotes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Competitor Price Intelligence Feed */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Competitor Price Feed</CardTitle>
              <CardDescription>Ground-level pricing reported across local dealers</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/marketing/surveys')}>
              All Surveys <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>

          <div className="space-y-3">
            {mySurveys.slice(0, 3).map((s) => (
              <div key={s.id} className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{s.dealerName}</span>
                  <Badge variant={s.priceDifference > 0 ? 'warning' : 'success'} size="sm">
                    {s.priceDifference > 0
                      ? `Competitor cheaper by ₹${s.priceDifference}`
                      : `We are cheaper by ₹${Math.abs(s.priceDifference)}`}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Competitor:</span>
                    <span className="font-bold text-rose-700">{s.competitorBrand} ({s.competitorProduct})</span>
                    <span className="text-slate-500 block">₹{s.competitorPricePerUnit.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Our Equivalent:</span>
                    <span className="font-bold text-indigo-700">{s.ourEquivalentProduct}</span>
                    <span className="text-slate-500 block">₹{s.ourSellingPrice.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 italic">"{s.dealerFeedback}"</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
