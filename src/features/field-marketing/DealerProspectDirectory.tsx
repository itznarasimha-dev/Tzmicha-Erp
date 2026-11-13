import React, { useMemo, useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select, SearchInput } from '../../components/ui/Input';
import { Building2, Plus, Phone, Mail, MapPin, RefreshCw } from 'lucide-react';
import {
  canUseFieldMarketingApi,
  fieldApiErrorMessage,
  mapApiDealer,
  marketingApi,
  useFieldMarketingApiQuery,
} from './api-integration';

export const DealerProspectDirectory: React.FC = () => {
  const { customers, currentUser, createCustomerLead } = useErpStore();
  const apiMode = canUseFieldMarketingApi();
  const apiDealers = useFieldMarketingApiQuery(async () => {
    const res = await marketingApi.listDealers({ pageSize: 100, sort: 'createdAt:desc' as any });
    return (res.data || []).map(mapApiDealer);
  }, [apiMode, currentUser.id]);

  const [searchTerm, setSearchTerm] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<'dealer' | 'retailer' | 'distributor'>('dealer');
  const [creditLimit, setCreditLimit] = useState('200000');
  const [city, setCity] = useState('');

  const notify = (title: string, description?: string, tone: 'success' | 'error' | 'info' = 'info') => {
    if (tone === 'error' && typeof window !== 'undefined') window.alert(description ? `${title}: ${description}` : title);
  };

  const demoMyCustomers = useMemo(() => customers.filter(
    (c) => c.regionId === currentUser.assignedRegionId || c.assignedMarketingUserId === currentUser.id,
  ), [customers, currentUser.assignedRegionId, currentUser.id]);

  const list = apiMode ? (apiDealers.data ?? []) : demoMyCustomers;
  const isLoading = apiMode && (apiDealers.status === 'loading' || apiDealers.status === 'idle');
  const loadError = apiMode ? apiDealers.error : null;

  const filtered = (list as any[]).filter((c) => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    if (apiMode) {
      const d = c as ReturnType<typeof mapApiDealer>;
      return [d.businessName, d.contactName, d.phone, d.email, d.address, d.stage].some(v => (v || '').toLowerCase().includes(q));
    }
    const dc = c as any;
    return [dc.name, dc.businessName, dc.phone, dc.email, dc.address].some(v => (v || '').toLowerCase().includes(q));
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (apiMode) {
      setSubmitting(true);
      try {
        await marketingApi.createDealer({
          businessName: businessName || name,
          contactName: name,
          phone,
          email,
          city: city || undefined,
          address,
          category: type,
          stage: 'Prospect',
          notes: 'Created from field marketing dealer directory.',
        });
        await apiDealers.refetch();
        notify('Dealer prospect created', 'Saved to backend marketing dealer prospects.', 'success');
        setAddModalOpen(false);
        setName(''); setBusinessName(''); setPhone(''); setEmail(''); setAddress(''); setCity('');
      } catch (error) {
        notify('Failed to create prospect', fieldApiErrorMessage(error), 'error');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    createCustomerLead({
      name,
      businessName,
      type,
      regionId: currentUser.assignedRegionId,
      assignedMarketingUserId: currentUser.id,
      phone,
      email,
      address,
      creditLimit: Number(creditLimit) || 0,
      currentOutstanding: 0,
    });
    notify('Prospect created (demo)', 'Saved in local demo store.', 'success');
    setAddModalOpen(false);
    setName(''); setBusinessName(''); setPhone(''); setEmail(''); setAddress('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Dealer & Prospect Directory
            <Badge variant={apiMode ? 'success' : 'warning'} size="sm">{apiMode ? 'API Mode' : 'Demo Mode'}</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {apiMode ? 'Dealer prospects are loaded from and created in backend /marketing/dealers.' : 'Demo mode: prospects/customers are stored locally.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {apiMode && <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => void apiDealers.refetch()}>Refresh</Button>}
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddModalOpen(true)}>
            Add New Dealer Prospect
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput placeholder="Search by name, business, phone, city..." value={searchTerm} onChange={(e: any) => setSearchTerm(e.target.value)} className="w-full sm:max-w-sm" />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{apiMode ? 'Dealer Prospects' : 'Your Managed Accounts'} ({filtered.length})</CardTitle>
            <CardDescription>{apiMode ? 'Backend dealer prospect records and stages.' : 'Local demo customer/prospect records.'}</CardDescription>
          </div>
        </CardHeader>

        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading dealer prospects from API...</div>
        ) : loadError ? (
          <div className="p-4 m-2 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 flex items-center justify-between gap-3">
            <span>Failed to load dealer prospects: {loadError}</span>
            <Button variant="outline" size="sm" onClick={() => void apiDealers.refetch()}>Retry</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No records found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((item) => {
              if (apiMode) {
                const d = item as ReturnType<typeof mapApiDealer>;
                return (
                  <div key={d.id} className="p-4 rounded-xl border border-slate-200 bg-white/70 space-y-3 hover:border-indigo-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600"><Building2 className="w-4 h-4" /></div>
                        <div>
                          <div className="font-semibold text-sm text-slate-900 leading-tight">{d.businessName}</div>
                          <div className="text-[11px] text-slate-500 capitalize">{d.type} • {d.stage}</div>
                        </div>
                      </div>
                      <Badge variant={d.status === 'active' ? 'success' : 'warning'} size="sm">{d.status}</Badge>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2"><UserIcon /> <span>Contact: {d.contactName || '—'}</span></div>
                      <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> <span>{d.phone || '—'}</span></div>
                      <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> <span>{d.email || '—'}</span></div>
                      <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" /> <span className="line-clamp-2">{d.address || '—'}</span></div>
                    </div>
                    {(d.notes || d.nextFollowUp) && (
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                        {d.nextFollowUp ? <div>Next follow-up: {d.nextFollowUp}</div> : null}
                        {d.notes ? <div className="line-clamp-2">{d.notes}</div> : null}
                      </div>
                    )}
                  </div>
                );
              }
              const c = item as any;
              return (
                <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-white/70 space-y-3 hover:border-indigo-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600"><Building2 className="w-4 h-4" /></div>
                      <div>
                        <div className="font-semibold text-sm text-slate-900 leading-tight">{c.businessName || c.name}</div>
                        <div className="text-[11px] text-slate-500 capitalize">{c.type} • {c.code || 'Prospect'}</div>
                      </div>
                    </div>
                    <Badge variant={c.status === 'active' ? 'success' : c.status === 'prospect' ? 'warning' : 'danger'} size="sm">{c.status}</Badge>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2"><UserIcon /> <span>Contact: {c.name}</span></div>
                    <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> <span>{c.phone}</span></div>
                    <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> <span>{c.email}</span></div>
                    <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" /> <span className="line-clamp-2">{c.address}</span></div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Credit Limit: ₹{(c.creditLimit || 0).toLocaleString('en-IN')}</span>
                    <span>Outstanding: ₹{(c.currentOutstanding || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal isOpen={addModalOpen} onClose={() => !submitting && setAddModalOpen(false)} title="Add New Dealer Prospect" description={apiMode ? 'Creates a dealer prospect via backend API.' : 'Saves a local demo prospect/customer record.'}>
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Business / Store Name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
          <Input label="Primary Contact Person" value={name} onChange={(e) => setName(e.target.value)} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} />
            <Select label="Business Type" value={type} onChange={(e) => setType(e.target.value as any)} options={[{ label: 'Dealer', value: 'dealer' }, { label: 'Retailer', value: 'retailer' }, { label: 'Distributor', value: 'distributor' }]} />
          </div>
          {!apiMode && <Input label="Requested Credit Limit (₹)" type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />}
          <Input label="Full Address" value={address} onChange={(e) => setAddress(e.target.value)} required />
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setAddModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Add Prospect'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

function UserIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
