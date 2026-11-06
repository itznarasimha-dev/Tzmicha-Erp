import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { FieldVisit } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import {
  MapPin,
  Clock,
  Plus,
  CheckCircle2,
  Calendar,
  Camera,
  Boxes,
  Building2,
  ArrowRight,
} from 'lucide-react';

export const VisitPlanner: React.FC = () => {
  const { fieldVisits, customers, currentUser, createFieldVisit, checkOutFieldVisit } = useErpStore();

  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<FieldVisit | null>(null);

  // Check-In Form
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [selectedCustId, setSelectedCustId] = useState(customers[0]?.id || '');
  const [prospectName, setProspectName] = useState('');
  const [purpose, setPurpose] = useState<FieldVisit['purpose']>('dealer_acquisition');
  const [locationAddress, setLocationAddress] = useState('Sector 18 Market, Noida, UP');
  const [sampleGiven, setSampleGiven] = useState(false);
  const [sampleDetails, setSampleDetails] = useState('UltraCoat Epoxy Primer 500ml sample tin');

  // Check-Out Form
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('2026-10-28');

  const myVisits = fieldVisits.filter((v) => v.marketingUserId === currentUser.id);

  const handleStartCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === selectedCustId);

    createFieldVisit({
      marketingUserId: currentUser.id,
      marketingUserName: currentUser.name,
      regionId: currentUser.assignedRegionId,
      customerId: customerMode === 'existing' ? cust?.id : undefined,
      prospectName: customerMode === 'existing' ? cust?.businessName || cust?.name : prospectName,
      customerType: customerMode === 'existing' ? cust?.type || 'dealer' : 'prospect',
      visitDate: new Date().toISOString().split('T')[0],
      purpose,
      locationAddress,
      hasSampleGiven: sampleGiven,
      sampleItemGiven: sampleGiven ? sampleDetails : undefined,
      hasExpenseClaimLinked: false,
    });

    setCheckInModalOpen(false);
    setProspectName('');
  };

  const handleOpenCheckOut = (v: FieldVisit) => {
    setSelectedVisit(v);
    setOutcomeNotes(v.outcomeNotes || '');
    setFollowUpDate(v.followUpDate || '2026-10-28');
    setCheckOutModalOpen(true);
  };

  const handleConfirmCheckOut = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVisit && outcomeNotes) {
      checkOutFieldVisit(
        selectedVisit.id,
        outcomeNotes,
        followUpDate,
        selectedVisit.hasSampleGiven,
        selectedVisit.sampleItemGiven
      );
      setCheckOutModalOpen(false);
      setSelectedVisit(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Field Visit Planner & On-Ground Attendance
            <Badge variant="success" size="sm">Physical Visits</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulate physical dealer check-ins, record demonstration outcomes, and schedule prospect follow-ups.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCheckInModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Check-In to Dealer / Prospect
        </Button>
      </div>

      {/* Visits List */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Physical Ground Visits Log ({myVisits.length})</CardTitle>
            <CardDescription>
              Check-in and check-out timestamps, location details, and physical promotional samples dispensed
            </CardDescription>
          </div>
        </CardHeader>

        <div className="space-y-4">
          {myVisits.map((v) => (
            <div
              key={v.id}
              className={`p-4 rounded-xl border transition-all ${
                v.status === 'in_progress'
                  ? 'border-emerald-300 bg-emerald-50/20'
                  : 'border-slate-200 bg-white/70'
              } space-y-3`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900">
                    {v.prospectName || 'Dealer Store Consultation'}
                  </span>
                  <Badge variant={v.status === 'in_progress' ? 'warning' : 'success'} size="sm">
                    {v.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-[11px] text-slate-400 capitalize">
                    Purpose: {v.purpose.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {v.visitDate} • In: {v.checkInTime} {v.checkOutTime ? `| Out: ${v.checkOutTime}` : ''}
                  </span>

                  {v.status === 'in_progress' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenCheckOut(v)}
                    >
                      Check-Out
                    </Button>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{v.locationAddress}</span>
              </div>

              {v.hasSampleGiven && (
                <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50/80 p-2 rounded-lg border border-indigo-100">
                  <Boxes className="w-3.5 h-3.5 shrink-0" />
                  <span>Physical sample given: <strong>{v.sampleItemGiven}</strong></span>
                </div>
              )}

              {v.outcomeNotes && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                  <div className="font-semibold text-slate-900">Visit Summary & Feedback:</div>
                  <p>{v.outcomeNotes}</p>
                  {v.followUpDate && (
                    <div className="text-[11px] text-indigo-600 font-medium pt-1">
                      Scheduled Follow-up: {v.followUpDate}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Check-In Modal */}
      <Modal
        isOpen={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        title="Check-In to Dealer / Prospect Visit"
        description="Records your ground check-in timestamp and initializes visit tracking."
      >
        <form onSubmit={handleStartCheckIn} className="space-y-4">
          <div className="flex gap-4 border-b pb-2 text-xs font-semibold">
            <button
              type="button"
              className={customerMode === 'existing' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'text-slate-400'}
              onClick={() => setCustomerMode('existing')}
            >
              Existing Account
            </button>
            <button
              type="button"
              className={customerMode === 'new' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'text-slate-400'}
              onClick={() => setCustomerMode('new')}
            >
              New Prospect / Cold Visit
            </button>
          </div>

          {customerMode === 'existing' ? (
            <Select
              label="Select Dealer / Distributor"
              value={selectedCustId}
              onChange={(e) => setSelectedCustId(e.target.value)}
              options={customers.map((c) => ({
                label: `${c.businessName || c.name} (${c.type})`,
                value: c.id,
              }))}
            />
          ) : (
            <Input
              label="Prospect Outlet Name"
              placeholder="e.g. Modern Paints & BuildChem"
              value={prospectName}
              onChange={(e) => setProspectName(e.target.value)}
              required
            />
          )}

          <Select
            label="Visit Purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as any)}
            options={[
              { label: 'New Dealer Acquisition & Pitch', value: 'dealer_acquisition' },
              { label: 'Product Demonstration & Applicator Demo', value: 'product_demo' },
              { label: 'Stock Level & Inventory Audit', value: 'stock_check' },
              { label: 'Outstanding Payment Collection', value: 'payment_followup' },
              { label: 'Physical Event / Contractor Meet', value: 'promotional_event' },
              { label: 'Routine Relationship Visit', value: 'routine_visit' },
            ]}
          />

          <Input
            label="Visit Location Address"
            value={locationAddress}
            onChange={(e) => setLocationAddress(e.target.value)}
            required
          />

          <div className="p-3 rounded-xl bg-slate-50 border space-y-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
              <input
                type="checkbox"
                checked={sampleGiven}
                onChange={(e) => setSampleGiven(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span>Dispensing Physical Product Sample during visit?</span>
            </label>

            {sampleGiven && (
              <Input
                label="Sample Item Details"
                value={sampleDetails}
                onChange={(e) => setSampleDetails(e.target.value)}
                placeholder="e.g. UltraCoat Epoxy 500ml sample tin"
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setCheckInModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Confirm Check-In
            </Button>
          </div>
        </form>
      </Modal>

      {/* Check-Out Modal */}
      {selectedVisit && (
        <Modal
          isOpen={checkOutModalOpen}
          onClose={() => setCheckOutModalOpen(false)}
          title={`Check-Out: ${selectedVisit.prospectName}`}
          description="Log meeting outcome notes, competitor pricing observed, and follow-up date."
        >
          <form onSubmit={handleConfirmCheckOut} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Outcome Summary & Notes *</label>
              <textarea
                rows={3}
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                placeholder="e.g. Demonstrated TitanGrip PU Sealant adhesion on stone facade. Store owner requested a quote for 30 tubes next Tuesday."
                className="glass-input w-full rounded-xl p-3 text-xs text-slate-900"
                required
              />
            </div>

            <Input
              label="Next Follow-up Date"
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />

            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border text-xs text-slate-600">
              <Camera className="w-4 h-4 text-slate-400" />
              <span>Simulated Storefront Photo: <code>store_facade_checkin.jpg</code></span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setCheckOutModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="success" size="sm" type="submit">
                Complete Check-Out
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
