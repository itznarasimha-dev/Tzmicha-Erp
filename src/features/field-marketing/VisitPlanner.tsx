import React, { useMemo, useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { FieldVisit } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { MapPin, Clock, Plus, Boxes, Camera, RefreshCw } from 'lucide-react';
import {
  canUseFieldMarketingApi,
  fieldApiErrorMessage,
  mapApiVisit,
  marketingApi,
  useFieldMarketingApiQuery,
  type UiFieldVisit,
} from './api-integration';

type VisitPurpose = FieldVisit['purpose'];

const purposeToApi = (purpose: VisitPurpose): { purpose: string; type: 'Field Visit' | 'Store Visit' | 'Demo' | 'Dealer Visit' } => {
  switch (purpose) {
    case 'product_demo':
      return { purpose: 'Product demonstration', type: 'Demo' };
    case 'dealer_acquisition':
      return { purpose: 'Dealer acquisition and onboarding', type: 'Dealer Visit' };
    case 'stock_check':
      return { purpose: 'Stock and inventory check', type: 'Store Visit' };
    case 'payment_followup':
      return { purpose: 'Payment follow-up', type: 'Field Visit' };
    case 'promotional_event':
      return { purpose: 'Promotional event / activation', type: 'Field Visit' };
    default:
      return { purpose: 'Routine relationship visit', type: 'Field Visit' };
  }
};

export const VisitPlanner: React.FC = () => {
  const { fieldVisits, customers, currentUser, createFieldVisit, checkOutFieldVisit } = useErpStore();
  const apiMode = canUseFieldMarketingApi();
  const apiVisits = useFieldMarketingApiQuery(async () => {
    const res = await marketingApi.listVisits({ pageSize: 100, sort: 'visitDate:desc' });
    return res.data.map(mapApiVisit);
  }, [apiMode, currentUser.id]);

  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<UiFieldVisit | FieldVisit | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Check-In Form
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [selectedCustId, setSelectedCustId] = useState(customers[0]?.id || '');
  const [prospectName, setProspectName] = useState('');
  const [purpose, setPurpose] = useState<VisitPurpose>('dealer_acquisition');
  const [locationAddress, setLocationAddress] = useState('Sector 18 Market, Noida, UP');
  const [sampleGiven, setSampleGiven] = useState(false);
  const [sampleDetails, setSampleDetails] = useState('UltraCoat Epoxy Primer 500ml sample tin');

  // Check-Out Form
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('2026-10-28');

  const demoMyVisits = useMemo(
    () => fieldVisits.filter((v) => v.marketingUserId === currentUser.id),
    [fieldVisits, currentUser.id],
  );

  const visitsForUi = apiMode ? apiVisits.data ?? [] : demoMyVisits;
  const isLoading = apiMode && (apiVisits.status === 'loading' || apiVisits.status === 'idle');
  const loadError = apiMode ? apiVisits.error : null;

  const notify = (title: string, description?: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (type === 'error') {
      console.error(title, description);
      if (typeof window !== 'undefined') window.alert(description ? `${title}: ${description}` : title);
    }
  };

  const resetCheckInForm = () => {
    setCustomerMode('existing');
    setProspectName('');
    setPurpose('dealer_acquisition');
    setLocationAddress('Sector 18 Market, Noida, UP');
    setSampleGiven(false);
    setSampleDetails('UltraCoat Epoxy Primer 500ml sample tin');
  };

  const handleStartCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === selectedCustId);
    const displayName = customerMode === 'existing' ? cust?.businessName || cust?.name || 'Customer Visit' : prospectName;

    if (apiMode) {
      setSubmitting(true);
      try {
        const apiPurpose = purposeToApi(purpose);
        const today = new Date().toISOString().slice(0, 10);
        const created = await marketingApi.createVisit({
          business: displayName,
          contactName: cust?.contactPerson || cust?.name || undefined,
          contactPhone: cust?.phone || undefined,
          purpose: apiPurpose.purpose,
          type: apiPurpose.type,
          date: today,
          time: new Date().toTimeString().slice(0, 5),
          location: locationAddress,
          notes: sampleGiven ? `Sample planned/given: ${sampleDetails}` : undefined,
          checklist: sampleGiven ? [`Sample: ${sampleDetails}`] : [],
          status: 'Scheduled',
        });
        // Mark check-in immediately for active field workflow when possible
        try {
          await marketingApi.checkInVisit(created.id, sampleGiven ? `Checked in. Sample: ${sampleDetails}` : 'Checked in from field app.');
        } catch {
          // Visit may remain scheduled if backend timing/rules differ; still refresh.
        }
        await apiVisits.refetch();
        notify('Visit checked in', 'Visit saved to backend and refreshed.', 'success');
        setCheckInModalOpen(false);
        resetCheckInForm();
      } catch (error) {
        notify('Failed to check in', fieldApiErrorMessage(error), 'error');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    createFieldVisit({
      marketingUserId: currentUser.id,
      marketingUserName: currentUser.name,
      regionId: currentUser.assignedRegionId,
      customerId: customerMode === 'existing' ? cust?.id : undefined,
      prospectName: displayName,
      customerType: customerMode === 'existing' ? cust?.type || 'dealer' : 'prospect',
      visitDate: new Date().toISOString().split('T')[0],
      purpose,
      locationAddress,
      hasSampleGiven: sampleGiven,
      sampleItemGiven: sampleGiven ? sampleDetails : undefined,
      hasExpenseClaimLinked: false,
    });
    notify('Visit checked in (demo)', 'Saved in local demo store.', 'success');
    setCheckInModalOpen(false);
    resetCheckInForm();
  };

  const handleOpenCheckOut = (v: UiFieldVisit | FieldVisit) => {
    setSelectedVisit(v);
    if (apiMode) {
      const uv = v as UiFieldVisit;
      setOutcomeNotes(uv.outcomeNotes || '');
      setFollowUpDate(new Date().toISOString().slice(0, 10));
    } else {
      const dv = v as FieldVisit;
      setOutcomeNotes(dv.outcomeNotes || '');
      setFollowUpDate(dv.followUpDate || '2026-10-28');
    }
    setCheckOutModalOpen(true);
  };

  const handleConfirmCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit || !outcomeNotes.trim()) return;

    if (apiMode) {
      const uv = selectedVisit as UiFieldVisit;
      setSubmitting(true);
      try {
        await marketingApi.checkOutVisit(uv.id, {
          outcome: outcomeNotes.trim(),
          notes: followUpDate ? `Follow-up date: ${followUpDate}` : undefined,
          samplesDispensed: uv.checklist.find((c) => c.toLowerCase().startsWith('sample')) || undefined,
          checklist: uv.checklist,
        });
        await apiVisits.refetch();
        notify('Visit completed', 'Check-out saved to backend.', 'success');
        setCheckOutModalOpen(false);
        setSelectedVisit(null);
      } catch (error) {
        notify('Failed to check out', fieldApiErrorMessage(error), 'error');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const dv = selectedVisit as FieldVisit;
    checkOutFieldVisit(
      dv.id,
      outcomeNotes,
      followUpDate,
      dv.hasSampleGiven,
      dv.sampleItemGiven,
    );
    notify('Visit completed (demo)', 'Check-out saved in local demo store.', 'success');
    setCheckOutModalOpen(false);
    setSelectedVisit(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Field Visit Planner & On-Ground Attendance
            <Badge variant={apiMode ? 'success' : 'warning'} size="sm">{apiMode ? 'API Mode' : 'Demo Mode'}</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {apiMode
              ? 'Field visits are loaded from and saved to backend marketing APIs.'
              : 'Demo mode: visits are stored locally in the ERP demo store.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {apiMode && (
            <Button variant="outline" size="sm" onClick={() => void apiVisits.refetch()} icon={<RefreshCw className="w-4 h-4" />}>
              Refresh
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => setCheckInModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
            Check-In to Dealer / Prospect
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Physical Ground Visits Log ({visitsForUi.length})</CardTitle>
            <CardDescription>
              {apiMode ? 'Backend field visits with check-in/check-out workflow.' : 'Demo visit records with local check-in/check-out.'}
            </CardDescription>
          </div>
        </CardHeader>

        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading field visits from API...</div>
        ) : loadError ? (
          <div className="p-4 m-2 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 flex items-center justify-between gap-3">
            <span>Failed to load visits: {loadError}</span>
            <Button variant="outline" size="sm" onClick={() => void apiVisits.refetch()}>Retry</Button>
          </div>
        ) : visitsForUi.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No visits found.</div>
        ) : (
          <div className="space-y-4">
            {(visitsForUi as any[]).map((v) => {
              const isApi = apiMode;
              const uv = v as UiFieldVisit;
              const dv = v as FieldVisit;
              const status = isApi ? uv.status : dv.status;
              const title = isApi ? uv.prospectName : (dv.prospectName || 'Dealer Store Consultation');
              const purposeLabel = isApi ? (uv.raw.purpose || uv.purpose) : dv.purpose.replace('_', ' ');
              const visitDate = isApi ? uv.visitDate : dv.visitDate;
              const inTime = isApi ? (uv.checkInTime ? new Date(uv.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : uv.visitTime || '-') : dv.checkInTime;
              const outTime = isApi ? (uv.checkOutTime ? new Date(uv.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '') : dv.checkOutTime;
              const location = isApi ? uv.locationAddress : dv.locationAddress;
              const sampleText = isApi ? uv.checklist.find((c) => c.toLowerCase().includes('sample')) : (dv.hasSampleGiven ? dv.sampleItemGiven : undefined);
              const outcome = isApi ? uv.outcomeNotes : dv.outcomeNotes;
              const followUp = isApi ? undefined : dv.followUpDate;
              return (
                <div
                  key={v.id}
                  className={`p-4 rounded-xl border transition-all ${status === 'in_progress' ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 bg-white/70'} space-y-3`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900">{title}</span>
                      <Badge variant={status === 'in_progress' ? 'warning' : status === 'completed' ? 'success' : 'neutral'} size="sm">
                        {String(status).replace('_', ' ')}
                      </Badge>
                      <span className="text-[11px] text-slate-400 capitalize">Purpose: {purposeLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {visitDate} • In: {inTime || '-'} {outTime ? `| Out: ${outTime}` : ''}
                      </span>
                      {status === 'in_progress' || status === 'scheduled' ? (
                        <Button variant="primary" size="sm" onClick={() => handleOpenCheckOut(v)}>
                          {isApi ? 'Check-Out / Complete' : 'Check-Out'}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{location || '—'}</span>
                  </div>

                  {sampleText ? (
                    <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50/80 p-2 rounded-lg border border-indigo-100">
                      <Boxes className="w-3.5 h-3.5 shrink-0" />
                      <span>Sample: <strong>{String(sampleText).replace(/^Sample:\s*/i, '')}</strong></span>
                    </div>
                  ) : null}

                  {outcome ? (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                      <div className="font-semibold text-slate-900">Visit Summary & Feedback:</div>
                      <p>{outcome}</p>
                      {followUp ? <div className="text-[11px] text-indigo-600 font-medium pt-1">Scheduled Follow-up: {followUp}</div> : null}
                      {isApi && uv.demoFollowUp ? <div className="text-[11px] text-indigo-600 font-medium pt-1">Follow-up note: {uv.demoFollowUp}</div> : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        isOpen={checkInModalOpen}
        onClose={() => !submitting && setCheckInModalOpen(false)}
        title="Check-In to Dealer / Prospect Visit"
        description={apiMode ? 'Creates and checks in a field visit via backend API.' : 'Records a demo visit in local store.'}
      >
        <form onSubmit={handleStartCheckIn} className="space-y-4">
          <div className="flex gap-4 border-b pb-2 text-xs font-semibold">
            <button type="button" className={customerMode === 'existing' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'text-slate-400'} onClick={() => setCustomerMode('existing')}>Existing Account</button>
            <button type="button" className={customerMode === 'new' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'text-slate-400'} onClick={() => setCustomerMode('new')}>New Prospect / Cold Visit</button>
          </div>

          {customerMode === 'existing' ? (
            <Select label="Select Dealer / Distributor" value={selectedCustId} onChange={(e) => setSelectedCustId(e.target.value)} options={customers.map((c) => ({ label: `${c.businessName || c.name} (${c.type})`, value: c.id }))} />
          ) : (
            <Input label="Prospect Outlet Name" placeholder="e.g. Modern Paints & BuildChem" value={prospectName} onChange={(e) => setProspectName(e.target.value)} required />
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

          <Input label="Visit Location Address" value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} required />

          <div className="p-3 rounded-xl bg-slate-50 border space-y-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
              <input type="checkbox" checked={sampleGiven} onChange={(e) => setSampleGiven(e.target.checked)} className="rounded text-indigo-600" />
              <span>Dispensing Physical Product Sample during visit?</span>
            </label>
            {sampleGiven && <Input label="Sample Item Details" value={sampleDetails} onChange={(e) => setSampleDetails(e.target.value)} placeholder="e.g. UltraCoat Epoxy 500ml sample tin" />}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setCheckInModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Confirm Check-In'}</Button>
          </div>
        </form>
      </Modal>

      {selectedVisit && (
        <Modal
          isOpen={checkOutModalOpen}
          onClose={() => !submitting && setCheckOutModalOpen(false)}
          title={`Check-Out: ${(selectedVisit as any).prospectName || (selectedVisit as UiFieldVisit).prospectName}`}
          description={apiMode ? 'Submits check-out outcome to backend API.' : 'Saves demo outcome locally.'}
        >
          <form onSubmit={handleConfirmCheckOut} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Outcome Summary & Notes *</label>
              <textarea rows={3} value={outcomeNotes} onChange={(e) => setOutcomeNotes(e.target.value)} placeholder="e.g. Demonstrated product, collected feedback, scheduled follow-up..." className="glass-input w-full rounded-xl p-3 text-xs text-slate-900" required />
            </div>
            <Input label="Next Follow-up Date" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border text-xs text-slate-600">
              <Camera className="w-4 h-4 text-slate-400" />
              <span>Attachment upload not implemented in this UI; outcome is recorded as notes/checklist.</span>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setCheckOutModalOpen(false)} disabled={submitting}>Cancel</Button>
              <Button variant="success" size="sm" type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Complete Check-Out'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
