import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Customer } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SearchInput, Input } from '../../components/ui/Input';
import {
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  ShieldCheck,
  TrendingUp,
  User,
  Building2,
  Calendar,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
  Mail,
  Phone,
  Filter,
} from 'lucide-react';

export const AdminCustomerCreditLedger: React.FC = () => {
  const { customers, users, salesOrders, regions, selectedRegionId, setSelectedRegionId } = useErpStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'normal' | 'watchlist' | 'over_limit'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [newCreditLimit, setNewCreditLimit] = useState<number>(0);
  const [blockedCustomers, setBlockedCustomers] = useState<Record<string, boolean>>({});
  const [noticeSuccessMessage, setNoticeSuccessMessage] = useState<string | null>(null);

  // Filter customers by region, risk, and search
  const filteredCustomers = customers.filter((c) => {
    const matchesRegion = selectedRegionId === 'all' || c.regionId === selectedRegionId;
    const utilization = c.creditLimit > 0 ? (c.currentOutstanding / c.creditLimit) * 100 : 0;
    const matchesRisk =
      riskFilter === 'all' ||
      (riskFilter === 'over_limit' && utilization >= 100) ||
      (riskFilter === 'watchlist' && utilization >= 80 && utilization < 100) ||
      (riskFilter === 'normal' && utilization < 80);

    const matchesSearch =
      c.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm);

    return matchesRegion && matchesRisk && matchesSearch;
  });

  // KPI calculations
  const totalCreditLimit = customers
    .filter((c) => selectedRegionId === 'all' || c.regionId === selectedRegionId)
    .reduce((sum, c) => sum + c.creditLimit, 0);

  const totalOutstanding = customers
    .filter((c) => selectedRegionId === 'all' || c.regionId === selectedRegionId)
    .reduce((sum, c) => sum + c.currentOutstanding, 0);

  const overLimitCount = customers.filter(
    (c) => (selectedRegionId === 'all' || c.regionId === selectedRegionId) && c.currentOutstanding >= c.creditLimit
  ).length;

  const getSalesRepName = (repId?: string) => {
    if (!repId) return 'Direct / Unassigned';
    return users.find((u) => u.id === repId)?.name || 'Sales Representative';
  };

  const getRegionName = (regId: string) => {
    return regions.find((r) => r.id === regId)?.name || regId;
  };

  const handleToggleBlock = (custId: string) => {
    setBlockedCustomers((prev) => ({
      ...prev,
      [custId]: !prev[custId],
    }));
  };

  const handleOpenOverride = (c: Customer) => {
    setSelectedCustomer(c);
    setNewCreditLimit(c.creditLimit);
    setOverrideModalOpen(true);
  };

  const handleSaveCreditLimit = () => {
    if (selectedCustomer) {
      selectedCustomer.creditLimit = Number(newCreditLimit);
      setNoticeSuccessMessage(`Credit limit for ${selectedCustomer.businessName} updated to ₹${Number(newCreditLimit).toLocaleString('en-IN')}`);
      setTimeout(() => setNoticeSuccessMessage(null), 3500);
      setOverrideModalOpen(false);
    }
  };

  const handleSendPaymentNotice = (c: Customer) => {
    setNoticeSuccessMessage(`Official formal payment demand letter and WhatsApp reminder dispatched to ${c.businessName} (${c.phone}).`);
    setTimeout(() => setNoticeSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            Customer Credit Limits & Accounts Receivable
            <Badge variant="purple" size="sm">Sales Oversight</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Executive control over dealer credit terms, outstanding payment aging, order freeze thresholds, and sales rep exposure.
          </p>
        </div>

        {/* Region Selector */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-xs">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-slate-700">Territory Scope:</span>
          <select
            value={selectedRegionId}
            onChange={(e) => setSelectedRegionId(e.target.value)}
            className="bg-transparent text-indigo-700 font-bold focus:outline-none cursor-pointer"
          >
            <option value="all">All Territories Consolidated</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Success Notification Alert */}
      {noticeSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{noticeSuccessMessage}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 border border-indigo-200 bg-indigo-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Total Credit Extended</p>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
              ₹{totalCreditLimit.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Approved sanctioned limit</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 border border-rose-200 bg-rose-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Total Receivables Outstanding</p>
            <div className="text-2xl font-black text-rose-700 mt-0.5 font-mono">
              ₹{totalOutstanding.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {totalCreditLimit > 0 ? ((totalOutstanding / totalCreditLimit) * 100).toFixed(1) : 0}% of credit utilized
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 border border-amber-200 bg-amber-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Accounts Over Credit Limit</p>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">{overLimitCount} Accounts</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Sales order booking restricted</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 border border-emerald-200 bg-emerald-50/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Available Undrawn Credit</p>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
              ₹{Math.max(0, totalCreditLimit - totalOutstanding).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Headroom for new sales orders</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:w-80">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search Dealer, Business Name or Phone..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Risk Status:
            </span>
            {(['all', 'normal', 'watchlist', 'over_limit'] as const).map((rf) => (
              <button
                key={rf}
                onClick={() => setRiskFilter(rf)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  riskFilter === rf
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {rf === 'all'
                  ? 'All Accounts'
                  : rf === 'normal'
                  ? 'Healthy (<80%)'
                  : rf === 'watchlist'
                  ? 'Watchlist (80-99%)'
                  : 'Over-Limit (100%+)'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Customer Credit Master Ledger */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Customer Credit Ledger & Utilization Matrix</CardTitle>
            <CardDescription>
              Account-level credit terms, current exposure, sales representative assignment, and order booking freeze controls.
            </CardDescription>
          </div>
          <Badge variant="neutral" size="sm">
            {filteredCustomers.length} Accounts Monitored
          </Badge>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                <th className="py-3 px-4">Dealer / Business Name</th>
                <th className="py-3 px-4">Territory & Rep</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Outstanding (A/R)</th>
                <th className="py-3 px-4" style={{ minWidth: '160px' }}>Credit Utilization</th>
                <th className="py-3 px-4 text-right">Available Credit</th>
                <th className="py-3 px-4 text-center">Order Status</th>
                <th className="py-3 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No customer credit records match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const utilization = c.creditLimit > 0 ? (c.currentOutstanding / c.creditLimit) * 100 : 0;
                  const isOverLimit = utilization >= 100;
                  const isWatchlist = utilization >= 80 && utilization < 100;
                  const isManuallyBlocked = blockedCustomers[c.id];
                  const available = Math.max(0, c.creditLimit - c.currentOutstanding);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block text-xs">{c.businessName}</span>
                        <span className="text-[11px] text-slate-500">
                          Contact: {c.name} • {c.phone}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block">{getRegionName(c.regionId)}</span>
                        <span className="text-[11px] text-indigo-700 flex items-center gap-1 font-medium">
                          <User className="w-3 h-3 text-indigo-500" />
                          {getSalesRepName(c.assignedSalesUserId)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{c.creditLimit.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-rose-700">
                        ₹{c.currentOutstanding.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                          <span>{utilization.toFixed(0)}%</span>
                          <span
                            className={
                              isOverLimit ? 'text-rose-600 font-bold' : isWatchlist ? 'text-amber-600' : 'text-emerald-600'
                            }
                          >
                            {isOverLimit ? 'Exceeded' : isWatchlist ? 'Near Limit' : 'Safe'}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOverLimit ? 'bg-rose-600' : isWatchlist ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, utilization)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800">
                        ₹{available.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isManuallyBlocked ? (
                          <Badge size="sm" variant="danger">
                            Admin Frozen
                          </Badge>
                        ) : isOverLimit ? (
                          <Badge size="sm" variant="danger">
                            Auto Blocked
                          </Badge>
                        ) : isWatchlist ? (
                          <Badge size="sm" variant="warning">
                            Watchlist
                          </Badge>
                        ) : (
                          <Badge size="sm" variant="success">
                            Active
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenOverride(c)}
                        >
                          Credit Terms
                        </Button>
                        <Button
                          size="sm"
                          variant={isManuallyBlocked ? 'secondary' : 'outline'}
                          onClick={() => handleToggleBlock(c.id)}
                          className={isManuallyBlocked ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}
                          icon={isManuallyBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        >
                          {isManuallyBlocked ? 'Unfreeze' : 'Freeze'}
                        </Button>
                        {c.currentOutstanding > 50000 && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleSendPaymentNotice(c)}
                            title="Dispatch Payment Notice"
                          >
                            Demand Notice
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Credit Limit Override Modal */}
      {overrideModalOpen && selectedCustomer && (
        <Modal
          isOpen={true}
          onClose={() => setOverrideModalOpen(false)}
          title={`Credit Facility Terms: ${selectedCustomer.businessName}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{selectedCustomer.businessName}</span>
                <span className="text-[11px] text-slate-500 font-mono">ID: {selectedCustomer.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Current Credit Limit:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{selectedCustomer.creditLimit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Current Outstanding:</span>
                  <span className="font-mono font-bold text-rose-700">
                    ₹{selectedCustomer.currentOutstanding.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                New Executive Sanctioned Credit Limit (₹ INR)
              </label>
              <Input
                type="number"
                value={newCreditLimit}
                onChange={(e) => setNewCreditLimit(Number(e.target.value))}
                min={0}
                step={25000}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Increasing credit limit enables the assigned sales rep to book larger volume orders without triggering hard system holds.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setOverrideModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveCreditLimit}>
                Save Credit Terms
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
