import React from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Tag, ShieldCheck, Percent } from 'lucide-react';

export const PricingPolicies: React.FC = () => {
  const { products, users } = useErpStore();

  const salesUsers = users.filter((u) => u.role === 'sales');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            Pricing Limits & Discount Governance
            <Badge variant="purple" size="sm">Admin Rules</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Rules governing sales rep authority, product floor prices, and automated approval triggers.
          </p>
        </div>
      </div>

      {/* Rules Explainer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 space-y-3 border-indigo-100 hover:border-indigo-300 transition-all duration-300 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-xs">
            <Percent className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 tracking-wide">1. Delegated Discount Limit</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Sales reps can grant discounts up to their permitted personal limit (e.g. 8%). The order confirms and reserves stock immediately without manual manager intervention.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3 border-amber-100 hover:border-amber-300 transition-all duration-300 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 tracking-wide">2. Mandatory Approval Trigger</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Any quote exceeding the rep's limit enters <code className="text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 text-[11px] font-semibold">pending_discount_approval</code>. Warehouse dispatch is blocked until an Admin approves.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3 border-rose-100 hover:border-rose-300 transition-all duration-300 relative overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs">
            <Tag className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 tracking-wide">3. Absolute Product Floor Price</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Regardless of approval authority, no product can be quoted below its minimum floor price, strictly safeguarding positive gross contribution margins.
          </p>
        </div>
      </div>

      {/* Sales Rep Delegations Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Sales Representative Delegated Discount Authorities</CardTitle>
            <CardDescription>Individual discount limits configured for field sales personnel</CardDescription>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-3 px-2">Sales Representative</th>
                <th className="pb-3 px-2">Assigned Region</th>
                <th className="pb-3 px-2">Authorized Max Discount</th>
                <th className="pb-3 px-2">Requires Approval Above</th>
                <th className="pb-3 px-2">Current Month Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {salesUsers.map((rep) => (
                <tr key={rep.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={rep.avatar}
                        alt={rep.name}
                        className="w-8 h-8 rounded-xl object-cover border border-slate-200 shadow-xs"
                      />
                      <div>
                        <span className="font-bold text-slate-900">{rep.name}</span>
                        <div className="text-[11px] text-slate-500">{rep.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-2 text-slate-600 capitalize">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-medium">
                      {rep.assignedRegionId}
                    </span>
                  </td>
                  <td className="py-3.5 px-2">
                    <Badge variant="warning" size="sm">
                      {rep.maxDiscountPercent}% Limit
                    </Badge>
                  </td>
                  <td className="py-3.5 px-2 text-amber-700 font-bold font-mono">
                    &gt; {rep.maxDiscountPercent}%
                  </td>
                  <td className="py-3.5 px-2 font-bold text-slate-900 font-mono">
                    ₹{rep.monthlySalesTarget?.toLocaleString('en-IN') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Product Floor Price Thresholds */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Product Price Bands & Floor Protection</CardTitle>
            <CardDescription>Standard Selling Price vs Minimum Allowed Floor Price</CardDescription>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-3 px-2">SKU</th>
                <th className="pb-3 px-2">Product Name</th>
                <th className="pb-3 px-2">Standard Price</th>
                <th className="pb-3 px-2">Minimum Floor Price</th>
                <th className="pb-3 px-2">Max Permitted Headroom</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {products.map((p) => {
                const diff = p.standardSellingPrice - p.minAllowedPrice;
                const diffPct = (diff / p.standardSellingPrice) * 100;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-2 font-bold text-indigo-700 font-mono">{p.sku}</td>
                    <td className="py-3.5 px-2 text-slate-900 font-semibold">{p.name}</td>
                    <td className="py-3.5 px-2 font-bold text-indigo-700 font-mono">
                      ₹{p.standardSellingPrice.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-2 font-bold text-slate-800 font-mono">
                      ₹{p.minAllowedPrice.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-2">
                      <span className="text-emerald-700 font-bold font-mono">
                        ₹{diff.toLocaleString('en-IN')}
                      </span>
                      <span className="text-slate-500 text-[11px] ml-1.5 font-mono">
                        ({diffPct.toFixed(1)}%)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
