import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { ExpenseClaim } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, CheckCircle2, Clock } from 'lucide-react';

export const MarketingWalletAndExpenses: React.FC = () => {
  const { currentUser, expenseClaims, walletTransactions, submitExpenseClaim } = useErpStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseClaim['category']>('fuel');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiptAttachment, setReceiptAttachment] = useState('fuel_petrol_slip.pdf');

  const myClaims = expenseClaims.filter((c) => c.userId === currentUser.id);
  const myTransactions = walletTransactions.filter((t) => t.userId === currentUser.id);

  const approvedTotal = myClaims
    .filter((c) => c.status === 'approved' || c.status === 'paid')
    .reduce((s, c) => s + c.amount, 0);

  const pendingTotal = myClaims
    .filter((c) => c.status === 'submitted')
    .reduce((s, c) => s + c.amount, 0);

  const handleCreateClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    submitExpenseClaim({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      regionId: currentUser.assignedRegionId,
      date: new Date().toISOString().split('T')[0],
      category,
      amount: parseFloat(amount),
      description,
      receiptAttachment,
    });

    setModalOpen(false);
    setAmount('');
    setDescription('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Field Marketing Wallet & Reimbursements
            <Badge variant="success" size="sm">Private Ground Ledger</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track company-issued travel advances, promotional product demonstration claims, and fuel settlements.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Submit Field Expense
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Available Advance Balance</span>
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            ₹{currentUser.walletBalance.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Available company travel funds</p>
        </div>

        <div className="glass-card p-5 border border-amber-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Review</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-amber-700 mt-2">
            ₹{pendingTotal.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Submitted claims awaiting approval</p>
        </div>

        <div className="glass-card p-5 border border-purple-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Settled</span>
            <CheckCircle2 className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-purple-700 mt-2">
            ₹{approvedTotal.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Approved & cleared expenses</p>
        </div>
      </div>

      {/* Claims Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Field Expense Claims</CardTitle>
            <CardDescription>Submitted travel, vehicle fuel, sample distribution, and retailer engagement</CardDescription>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-3">Claim #</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Description</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Attachment</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {myClaims.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70">
                  <td className="py-3 font-bold text-slate-900 font-mono">{c.claimNumber}</td>
                  <td className="py-3 text-slate-400">{c.date}</td>
                  <td className="py-3">
                    <Badge variant="neutral" size="sm" className="capitalize">
                      {c.category.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-3 max-w-xs truncate text-slate-800">{c.description}</td>
                  <td className="py-3 font-bold text-slate-900">₹{c.amount.toLocaleString('en-IN')}</td>
                  <td className="py-3 text-emerald-700 font-mono text-[11px]">{c.receiptAttachment || '—'}</td>
                  <td className="py-3 text-right">
                    <Badge
                      size="sm"
                      variant={
                        c.status === 'approved' || c.status === 'paid'
                          ? 'success'
                          : c.status === 'submitted'
                          ? 'warning'
                          : 'neutral'
                      }
                      className="capitalize"
                    >
                      {c.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Wallet Statement</CardTitle>
            <CardDescription>Company advance deposits and verified settlements</CardDescription>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-3">Date</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Description</th>
                <th className="pb-3 text-right">Amount</th>
                <th className="pb-3 text-right">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {myTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70">
                  <td className="py-3 text-slate-400 font-mono">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      {tx.type === 'advance_issued' ? (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      <span className="font-semibold text-slate-900 capitalize">
                        {tx.type.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-slate-600">{tx.description}</td>
                  <td className={`py-3 text-right font-bold ${tx.type === 'advance_issued' ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {tx.type === 'advance_issued' ? `+₹${tx.amount.toLocaleString('en-IN')}` : `-₹${tx.amount.toLocaleString('en-IN')}`}
                  </td>
                  <td className="py-3 text-right font-bold text-emerald-700">
                    ₹{tx.balanceAfter.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Submit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Submit Field Marketing Expense Claim"
        description="Submit fuel, promotional sampling, or outstation dealer travel expense."
      >
        <form onSubmit={handleCreateClaim} className="space-y-4">
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            options={[
              { label: 'Fuel / Mileage Reimbursement', value: 'fuel' },
              { label: 'Product Sample / Promotional Dispatch', value: 'sample_promotion' },
              { label: 'Outstation Dealer Visit Travel', value: 'travel' },
              { label: 'Hotel & Lodging', value: 'accommodation' },
              { label: 'Dealer Meeting Per Diem', value: 'food' },
            ]}
          />

          <Input
            label="Claim Amount (₹)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <Input
            label="Purpose & Route"
            placeholder="e.g. Noida to Ghaziabad retail market round trip"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <Input
            label="Receipt Attachment"
            value={receiptAttachment}
            onChange={(e) => setReceiptAttachment(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Submit Claim
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
