import React, { useMemo, useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { ExpenseClaim } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Wallet, Plus, RefreshCw } from 'lucide-react';
import {
  canUseFieldMarketingApi,
  fieldApiErrorMessage,
  marketingApi,
  useFieldMarketingApiQuery,
} from './api-integration';

export const MarketingWalletAndExpenses: React.FC = () => {
  const { currentUser, expenseClaims, walletTransactions, submitExpenseClaim } = useErpStore();
  const apiMode = canUseFieldMarketingApi();

  const apiExpenses = useFieldMarketingApiQuery(async () => {
    const res = await marketingApi.listExpenses({ pageSize: 100, sort: 'expenseDate:desc' });
    return res.data || [];
  }, [apiMode, currentUser.id]);

  const apiRewards = useFieldMarketingApiQuery(async () => {
    const wallets = await marketingApi.listRewards({ pageSize: 100 });
    const wallet = (wallets.data || [])[0];
    if (!wallet) return { wallet: null, transactions: [] as any[] };
    try {
      const tx = await marketingApi.listRewardTransactions(wallet.employeeId);
      return { wallet, transactions: tx || [] };
    } catch {
      return { wallet, transactions: [] as any[] };
    }
  }, [apiMode, currentUser.id]);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState<ExpenseClaim['category']>('fuel');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiptAttachment, setReceiptAttachment] = useState('fuel_petrol_slip.pdf');
  const [title, setTitle] = useState('Field expense claim');

  const notify = (titleText: string, descriptionText?: string, tone: 'success' | 'error' | 'info' = 'info') => {
    if (tone === 'error' && typeof window !== 'undefined') window.alert(descriptionText ? `${titleText}: ${descriptionText}` : titleText);
  };

  const demoMyClaims = expenseClaims.filter((c) => c.userId === currentUser.id);
  const demoMyTransactions = walletTransactions.filter((t) => t.userId === currentUser.id);

  const apiClaims = apiExpenses.data || [];
  const rewardWallet = apiRewards.data?.wallet || null;
  const rewardTx = apiRewards.data?.transactions || [];

  const isLoading = apiMode && (
    apiExpenses.status === 'loading' || apiExpenses.status === 'idle' ||
    apiRewards.status === 'loading' || apiRewards.status === 'idle'
  );
  const loadError = apiMode ? (apiExpenses.error || apiRewards.error) : null;

  const totals = useMemo(() => {
    if (apiMode) {
      const approved = apiClaims.filter(c => ['Approved', 'Paid', 'Reimbursed'].includes(c.status)).reduce((s, c) => s + (c.amount || 0), 0);
      const pending = apiClaims.filter(c => ['Draft', 'Submitted', 'Pending Manager Review', 'Pending Admin Financial Authorization', 'Changes Requested'].includes(c.status)).reduce((s, c) => s + (c.amount || 0), 0);
      return { approved, pending };
    }
    const approved = demoMyClaims.filter((c) => c.status === 'approved' || c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
    const pending = demoMyClaims.filter((c) => c.status === 'submitted').reduce((sum, c) => sum + c.amount, 0);
    return { approved, pending };
  }, [apiMode, apiClaims, demoMyClaims]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;

    if (apiMode) {
      setSubmitting(true);
      try {
        await marketingApi.createExpense({
          source: 'field_claim',
          title: title || 'Field expense claim',
          category: category,
          amount: amt,
          expenseDate: new Date().toISOString().slice(0, 10),
          description,
          documentPath: receiptAttachment || undefined,
          submit: true,
        });
        await Promise.all([apiExpenses.refetch(), apiRewards.refetch()]);
        notify('Expense submitted', 'Field expense submitted via marketing expense API.', 'success');
        setModalOpen(false);
        setAmount(''); setDescription(''); setTitle('Field expense claim');
      } catch (error) {
        notify('Failed to submit expense', fieldApiErrorMessage(error), 'error');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    submitExpenseClaim({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      regionId: currentUser.assignedRegionId,
      date: new Date().toISOString().split('T')[0],
      category,
      amount: amt,
      description,
      receiptAttachment,
    });
    notify('Expense submitted (demo)', 'Saved locally in demo store.', 'success');
    setModalOpen(false);
    setAmount(''); setDescription('');
  };

  const refreshAll = async () => {
    await Promise.all([apiExpenses.refetch(), apiRewards.refetch()]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Wallet & Field Expenses
            <Badge variant={apiMode ? 'success' : 'warning'} size="sm">{apiMode ? 'API Mode' : 'Demo Mode'}</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {apiMode
              ? 'Expenses use /marketing/expenses; wallet/transactions use /marketing/rewards when available.'
              : 'Demo mode: local wallet balance and expense claims from store.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {apiMode && <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => void refreshAll()}>Refresh</Button>}
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>Submit Expense Claim</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 text-sm text-slate-500">Loading wallet and expenses from API...</div>
      ) : loadError ? (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>Failed to load data: {loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void refreshAll()}>Retry</Button>
        </div>
      ) : (
        <>
          <Card className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white border-0">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-2">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center"><Wallet className="w-8 h-8 text-indigo-100" /></div>
                <div>
                  <div className="text-indigo-200 text-sm font-medium">{apiMode ? 'Marketing Reward Wallet Balance' : 'Field Advance Wallet Balance'}</div>
                  <div className="text-3xl font-bold tracking-tight">
                    ₹{(apiMode ? (rewardWallet?.balance || 0) : currentUser.walletBalance).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-indigo-300 mt-1">
                    {apiMode ? (rewardWallet ? `${rewardWallet.employeeName} • ${rewardWallet.currency}` : 'No reward wallet record found for current scope') : 'Reconciled against approved field travel claims'}
                  </div>
                </div>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <div className="text-xs text-indigo-200 uppercase tracking-wide">Approved / Paid</div>
                  <div className="text-xl font-semibold mt-0.5">₹{totals.approved.toLocaleString('en-IN')}</div>
                </div>
                <div className="w-px bg-white/20" />
                <div>
                  <div className="text-xs text-indigo-200 uppercase tracking-wide">Pending Review</div>
                  <div className="text-xl font-semibold mt-0.5">₹{totals.pending.toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>My Expense Claims ({apiMode ? apiClaims.length : demoMyClaims.length})</CardTitle>
                <CardDescription>{apiMode ? 'Backend marketing expenses (field_claim and scoped records).' : 'Demo local expense claims.'}</CardDescription>
              </CardHeader>
              <div className="space-y-3">
                {(apiMode ? apiClaims : demoMyClaims).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No claims submitted yet.</p>
                ) : (apiMode ? apiClaims : demoMyClaims).map((c: any) => (
                  <div key={c.id} className="p-3 rounded-lg border border-slate-100 bg-white/60 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{apiMode ? c.title : c.claimNumber}</span>
                        <Badge variant={String(c.status).toLowerCase().includes('approv') || ['Paid','Reimbursed'].includes(c.status) ? 'success' : String(c.status).toLowerCase().includes('reject') ? 'danger' : 'warning'} size="sm">
                          {String(c.status).replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <span className="text-slate-400">{apiMode ? c.expenseDate : c.date}</span>
                    </div>
                    <div className="text-slate-700 font-medium">₹{(c.amount || 0).toLocaleString('en-IN')} • {apiMode ? (c.category || 'Field Claim') : String(c.category).replace('_', ' ')}</div>
                    <div className="text-slate-500">{c.description}</div>
                    {(apiMode ? c.reviewerComments : c.rejectionReason) ? (
                      <div className="text-red-600">{apiMode ? `Reviewer: ${c.reviewerComments}` : `Reason: ${c.rejectionReason}`}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{apiMode ? 'Reward Wallet Transactions' : 'Wallet Transaction History'}</CardTitle>
                <CardDescription>{apiMode ? 'Transactions from marketing rewards API (if available).' : 'Local demo wallet ledger.'}</CardDescription>
              </CardHeader>
              <div className="space-y-3">
                {(apiMode ? rewardTx : demoMyTransactions).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">{apiMode ? 'No reward transactions found.' : 'No wallet transactions yet.'}</p>
                ) : (apiMode ? rewardTx : demoMyTransactions).map((t: any) => (
                  <div key={t.id} className="p-3 rounded-lg border border-slate-100 bg-white/60 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-medium text-slate-900">{apiMode ? (t.entryType || t.referenceType || 'Transaction') : t.description}</div>
                      <div className="text-slate-500 capitalize">{apiMode ? `${t.createdAt || ''} ${t.note ? `• ${t.note}` : ''}` : `${String(t.type).replace(/_/g, ' ')} • ${t.date}`}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${(t.amount || 0) > 0 ? 'text-emerald-700' : 'text-red-600'}`}>{(t.amount || 0) > 0 ? '+' : ''}₹{Math.abs(t.amount || 0).toLocaleString('en-IN')}</div>
                      <div className="text-slate-400">Bal: ₹{(apiMode ? (t.balanceAfter || 0) : (t.balanceAfter || 0)).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      <Modal isOpen={modalOpen} onClose={() => !submitting && setModalOpen(false)} title="Submit Field Expense Claim" description={apiMode ? 'Submits expense to backend /marketing/expenses API.' : 'Saves locally in demo mode.'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {apiMode && <Input label="Expense Title" value={title} onChange={(e) => setTitle(e.target.value)} required />}
          <Select label="Expense Category" value={category} onChange={(e) => setCategory(e.target.value as any)} options={[
            { label: 'Fuel & Conveyance', value: 'fuel' },
            { label: 'Food & Refreshments', value: 'food' },
            { label: 'Travel / Toll / Parking', value: 'travel' },
            { label: 'Sample / Promotional Distribution', value: 'sample_promotion' },
            { label: 'Customer Meeting / Dealer Entertainment', value: 'customer_meeting' },
          ]} />
          <Input label="Claim Amount (₹)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <Input label="Receipt / Proof (filename/reference)" value={receiptAttachment} onChange={(e) => setReceiptAttachment(e.target.value)} />
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Description / Purpose</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="glass-input w-full rounded-xl p-3 text-xs text-slate-900" required />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Claim'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
