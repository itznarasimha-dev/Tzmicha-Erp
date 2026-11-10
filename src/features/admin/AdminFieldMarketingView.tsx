import React from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { MapPin } from 'lucide-react';

export const AdminFieldMarketingView: React.FC = () => {
  const { fieldVisits, marketSurveys, customers, marketingTargets } = useErpStore();

  const completedVisits = fieldVisits.filter((v) => v.status === 'completed');
  const acquiredProspects = customers.filter((c) => c.status === 'prospect');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            Field Marketing & Ground Intelligence Overview
            <Badge variant="purple" size="sm">Admin Master</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Physical on-ground dealer visits, prospect acquisition, competitor pricing observations, and route coverage.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card p-5 border border-emerald-200 bg-emerald-50/40">
          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Completed Dealer Visits</p>
          <div className="text-2xl font-bold text-slate-900 mt-0.5 font-mono">{completedVisits.length}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Physical store inspections</p>
        </div>

        <div className="glass-card p-5 border border-blue-200 bg-blue-50/40">
          <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">New Prospects Onboarded</p>
          <div className="text-2xl font-bold text-slate-900 mt-0.5 font-mono">{acquiredProspects.length}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Dealers converted this month</p>
        </div>

        <div className="glass-card p-5 border border-amber-200 bg-amber-50/40">
          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Competitor Pricing Logs</p>
          <div className="text-2xl font-bold text-slate-900 mt-0.5 font-mono">{marketSurveys.length}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Field price observations</p>
        </div>

        <div className="glass-card p-5 border border-purple-200 bg-purple-50/40">
          <p className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Monthly Target Achievement</p>
          <div className="text-2xl font-bold text-slate-900 mt-0.5 font-mono">
            {marketingTargets[0]
              ? `${Math.round((marketingTargets[0].completedVisits / marketingTargets[0].targetVisits) * 100)}%`
              : '70%'}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Visit target progress</p>
        </div>
      </div>

      {/* Competitor Price Observations Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Field Competitor Pricing Intelligence</CardTitle>
            <CardDescription>
              Direct market intelligence reported by ground representatives during retail store visits
            </CardDescription>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-3 px-1">Dealer / Outlet</th>
                <th className="pb-3 px-1">Competitor Brand & Product</th>
                <th className="pb-3 px-1">Competitor Retail Price</th>
                <th className="pb-3 px-1">Our Equivalent Product</th>
                <th className="pb-3 px-1">Our Approved Selling Price</th>
                <th className="pb-3 px-1">Variance</th>
                <th className="pb-3 px-1">Demand Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {marketSurveys.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-1 font-semibold text-slate-900">{s.dealerName}</td>
                  <td className="py-3.5 px-1">
                    <div className="font-bold text-slate-900">{s.competitorBrand}</div>
                    <div className="text-[11px] text-slate-500">{s.competitorProduct}</div>
                  </td>
                  <td className="py-3.5 px-1 font-bold text-rose-700 font-mono">₹{s.competitorPricePerUnit.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-1 text-slate-800">{s.ourEquivalentProduct}</td>
                  <td className="py-3.5 px-1 font-bold text-indigo-700 font-mono">₹{s.ourSellingPrice.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-1">
                    <Badge variant={s.priceDifference > 0 ? 'warning' : 'success'} size="sm">
                      {s.priceDifference > 0
                        ? `Competitor cheaper by ₹${s.priceDifference}`
                        : `We are cheaper by ₹${Math.abs(s.priceDifference)}`}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-1">
                    <Badge variant={s.marketDemandStatus === 'high' ? 'success' : 'neutral'} size="sm">
                      {s.marketDemandStatus.toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Field Visits */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent Physical Ground Visits</CardTitle>
            <CardDescription>Field check-in timestamps, locations, and outcome summaries</CardDescription>
          </div>
        </CardHeader>

        <div className="space-y-3">
          {fieldVisits.map((v) => (
            <div key={v.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-xs">
                    {v.prospectName || 'Scheduled Dealer Inspection'}
                  </span>
                  <Badge variant={v.status === 'completed' ? 'success' : 'primary'} size="sm">
                    {v.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-[11px] text-slate-500">
                    {v.visitDate} • {v.checkInTime} {v.checkOutTime ? `— ${v.checkOutTime}` : ''}
                  </span>
                </div>

                <div className="text-xs text-indigo-700 font-semibold">
                  Rep: {v.marketingUserName}
                </div>
              </div>

              <div className="flex items-start gap-1.5 text-xs text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{v.locationAddress}</span>
              </div>

              {v.outcomeNotes && (
                <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                  <strong className="text-slate-900">Outcome: </strong>
                  {v.outcomeNotes}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
