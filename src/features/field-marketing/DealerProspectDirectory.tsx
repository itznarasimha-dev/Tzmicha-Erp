import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select, SearchInput } from '../../components/ui/Input';
import { Building2, Plus, Phone, Mail, MapPin, UserPlus, CheckCircle } from 'lucide-react';

export const DealerProspectDirectory: React.FC = () => {
  const { customers, currentUser, createCustomerLead } = useErpStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);

  // New Lead Form states
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<'dealer' | 'retailer' | 'distributor'>('dealer');
  const [creditLimit, setCreditLimit] = useState('200000');

  const myCustomers = customers.filter(
    (c) => c.regionId === currentUser.assignedRegionId || c.assignedMarketingUserId === currentUser.id
  );

  const filtered = myCustomers.filter(
    (c) =>
      c.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !businessName) return;

    createCustomerLead({
      name,
      businessName,
      type,
      regionId: currentUser.assignedRegionId,
      assignedMarketingUserId: currentUser.id,
      phone,
      email: email || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      address,
      creditLimit: parseFloat(creditLimit) || 100000,
      currentOutstanding: 0,
    });

    setAddModalOpen(false);
    setName('');
    setBusinessName('');
    setPhone('');
    setAddress('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Dealer & Retailer Prospect Directory
            <Badge variant="success" size="sm">Field Ground Accounts</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Accounts and newly acquired prospective dealers in your assigned territory.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setAddModalOpen(true)}
          icon={<UserPlus className="w-4 h-4" />}
        >
          Onboard New Prospect
        </Button>
      </div>

      <SearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Filter by dealer name or proprietor..."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((c) => (
          <div key={c.id} className="glass-card p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <Badge variant={c.status === 'active' ? 'success' : 'warning'} size="sm">
                  {c.status.toUpperCase()}
                </Badge>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm">{c.businessName || c.name}</h3>
                <div className="text-xs text-slate-500 capitalize">Proprietor: {c.name} • {c.type}</div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{c.phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{c.address}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 flex justify-between">
              <span>Onboarded: {c.onboardingDate}</span>
              <span className="text-indigo-600 font-semibold">Credit: ₹{c.creditLimit.toLocaleString('en-IN')}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Onboard New Lead Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Onboard New Dealer / Prospect Account"
        description="Captures new retail store information and increments your monthly dealer acquisition target."
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          <Input
            label="Shop / Business Name"
            placeholder="e.g. Modern Paints & Hardware Mart"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Person / Owner"
              placeholder="e.g. Alok Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Select
              label="Account Type"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              options={[
                { label: 'Dealer / Hardware Shop', value: 'dealer' },
                { label: 'Sub-Retailer', value: 'retailer' },
                { label: 'Regional Stockist / Distributor', value: 'distributor' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              placeholder="e.g. +91 98110 00000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Input
              label="Email (Optional)"
              placeholder="e.g. store@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Input
            label="Physical Shop Address"
            placeholder="e.g. Shop 4, Main Market, Raj Nagar, Ghaziabad"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />

          <Input
            label="Proposed Credit Limit (₹)"
            type="number"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Onboard Prospect
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
