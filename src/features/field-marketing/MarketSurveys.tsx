import React, { useMemo, useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { ClipboardList, Plus, RefreshCw } from 'lucide-react';
import {
  canUseFieldMarketingApi,
  fieldApiErrorMessage,
  mapApiSurvey,
  marketingApi,
  useFieldMarketingApiQuery,
} from './api-integration';

export const MarketSurveys: React.FC = () => {
  const { marketSurveys, products, currentUser, submitMarketSurvey } = useErpStore();
  const apiMode = canUseFieldMarketingApi();
  const apiSurveys = useFieldMarketingApiQuery(async () => {
    const res = await marketingApi.listSurveys({ pageSize: 100, sort: 'date:desc' as any });
    return (res.data || []).map(mapApiSurvey);
  }, [apiMode, currentUser.id]);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dealerName, setDealerName] = useState('');
  const [competitorBrand, setCompetitorBrand] = useState('Asian Paints PPG');
  const [competitorProduct, setCompetitorProduct] = useState('Apcolite Epoxy Protective');
  const [competitorPrice, setCompetitorPrice] = useState('17500');
  const [selectedProduct, setSelectedProduct] = useState(products[0]?.name || '');
  const [dealerFeedback, setDealerFeedback] = useState('Contractors like our viscosity but competitor offers 60-day credit.');
  const [demandStatus, setDemandStatus] = useState<'high' | 'moderate' | 'low'>('high');
  const [region, setRegion] = useState(currentUser.assignedRegionId || 'Field Region');

  const notify = (title: string, description?: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (type === 'error' && typeof window !== 'undefined') window.alert(description ? `${title}: ${description}` : title);
  };

  const resetForm = () => {
    setDealerName('');
    setCompetitorBrand('Asian Paints PPG');
    setCompetitorProduct('Apcolite Epoxy Protective');
    setCompetitorPrice('17500');
    setDealerFeedback('Contractors like our viscosity but competitor offers 60-day credit.');
    setDemandStatus('high');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ourPrice = products.find((p) => p.name === selectedProduct)?.standardSellingPrice || 16000;
    const compPrice = Number(competitorPrice) || 0;

    if (apiMode) {
      setSubmitting(true);
      try {
        await marketingApi.createSurvey({
          competitor: competitorBrand.trim() || 'Competitor',
          region: region || undefined,
          observation: `Dealer/Outlet: ${dealerName || 'N/A'}. Competitor product: ${competitorProduct}. Feedback: ${dealerFeedback}`,
          productFeedback: `Compared to ${selectedProduct} (₹${ourPrice}). Dealer feedback: ${dealerFeedback}`,
          interest: demandStatus === 'high' ? 'High' : demandStatus === 'moderate' ? 'Medium' : 'Low',
          pricingObservation: compPrice > 0 ? `Competitor ₹${compPrice} vs our ₹${ourPrice}` : `Compared to our ₹${ourPrice}`,
          date: new Date().toISOString().slice(0, 10),
        });
        await apiSurveys.refetch();
        notify('Survey submitted', 'Market survey saved to backend.', 'success');
        setModalOpen(false);
        resetForm();
      } catch (error) {
        notify('Failed to submit survey', fieldApiErrorMessage(error), 'error');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    submitMarketSurvey({
      marketingUserId: currentUser.id,
      marketingUserName: currentUser.name,
      regionId: currentUser.assignedRegionId,
      dealerName,
      competitorBrand,
      competitorProduct,
      competitorPricePerUnit: compPrice,
      ourEquivalentProduct: selectedProduct,
      ourSellingPrice: ourPrice,
      priceDifference: compPrice > 0 ? Math.round(((compPrice - ourPrice) / compPrice) * 100) : 0,
      dealerFeedback,
      marketDemandStatus: demandStatus,
    });
    notify('Survey submitted (demo)', 'Saved in local demo store.', 'success');
    setModalOpen(false);
    resetForm();
  };

  const surveys = apiMode ? (apiSurveys.data ?? []) : marketSurveys;
  const isLoading = apiMode && (apiSurveys.status === 'loading' || apiSurveys.status === 'idle');
  const loadError = apiMode ? apiSurveys.error : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Market Research & Competitor Pricing
            <Badge variant={apiMode ? 'success' : 'info'} size="sm">{apiMode ? 'API Mode' : 'Demo Mode'}</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {apiMode
              ? 'Surveys are fetched from and submitted to marketing APIs (mapped to backend survey schema).'
              : 'Demo mode: surveys are stored locally.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {apiMode && (
            <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => void apiSurveys.refetch()}>
              Refresh
            </Button>
          )}
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
            Log Competitor Price Observation
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Competitor Intelligence Log</CardTitle>
            <CardDescription>
              {apiMode ? 'Backend market surveys and observations.' : 'Local demo observations with pricing comparison fields.'}
            </CardDescription>
          </div>
        </CardHeader>

        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading surveys from API...</div>
        ) : loadError ? (
          <div className="p-4 m-2 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 flex items-center justify-between gap-3">
            <span>Failed to load surveys: {loadError}</span>
            <Button variant="outline" size="sm" onClick={() => void apiSurveys.refetch()}>Retry</Button>
          </div>
        ) : surveys.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No survey records found.</div>
        ) : (
          <div className="space-y-4">
            {(surveys as any[]).map((s) => {
              if (apiMode) {
                const survey = s as ReturnType<typeof mapApiSurvey>;
                return (
                  <div key={survey.id} className="p-4 rounded-xl border border-slate-200 bg-white/70 space-y-2 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900">{survey.competitorBrand}</span>
                        <Badge variant={survey.interest === 'High' ? 'success' : survey.interest === 'Medium' ? 'warning' : 'neutral'} size="sm">
                          Interest: {survey.interest}
                        </Badge>
                        <span className="text-slate-400">{survey.region} • {survey.date}</span>
                      </div>
                      <span className="text-slate-500">By {survey.submittedBy || '—'}</span>
                    </div>
                    {survey.pricingObservation && <p className="text-slate-700"><strong>Pricing:</strong> {survey.pricingObservation}</p>}
                    {survey.observation && <p className="text-slate-700"><strong>Observation:</strong> {survey.observation}</p>}
                    {survey.productFeedback && <p className="text-slate-700"><strong>Product feedback:</strong> {survey.productFeedback}</p>}
                  </div>
                );
              }

              const demo = s as any;
              const cheaper = demo.priceDifference > 0;
              return (
                <div key={demo.id} className="p-4 rounded-xl border border-slate-200 bg-white/70 space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">{demo.dealerName}</span>
                      <Badge variant={demo.marketDemandStatus === 'high' ? 'success' : demo.marketDemandStatus === 'moderate' ? 'warning' : 'danger'} size="sm">
                        {demo.marketDemandStatus} demand
                      </Badge>
                    </div>
                    <span className="text-slate-400">{demo.date} • {demo.marketingUserName}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-lg bg-red-50/50 border border-red-100 space-y-1">
                      <div className="font-semibold text-red-800">{demo.competitorBrand}</div>
                      <div className="text-red-700">{demo.competitorProduct}</div>
                      <div className="font-bold">₹{demo.competitorPricePerUnit?.toLocaleString('en-IN')}/unit</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-1">
                      <div className="font-semibold text-emerald-800">Tzmicha ERP (Our Product)</div>
                      <div className="text-emerald-700">{demo.ourEquivalentProduct}</div>
                      <div className="font-bold">₹{demo.ourSellingPrice?.toLocaleString('en-IN')}/unit</div>
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg border ${cheaper ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                    Price gap: <strong>{Math.abs(demo.priceDifference || 0)}%</strong> {cheaper ? 'cheaper by competitor' : 'our advantage'}.
                  </div>
                  <p className="text-slate-600"><strong>Dealer Feedback:</strong> {demo.dealerFeedback}</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => !submitting && setModalOpen(false)} title="Log Competitor & Market Observation" description={apiMode ? 'Submits to backend /marketing/surveys API.' : 'Saves locally in demo mode.'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Dealer / Outlet Visited" value={dealerName} onChange={(e) => setDealerName(e.target.value)} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Competitor Brand" value={competitorBrand} onChange={(e) => setCompetitorBrand(e.target.value)} required />
            <Input label="Region (optional)" value={region} onChange={(e) => setRegion(e.target.value)} />
          </div>
          <Input label="Competitor Product / Pricing Note" value={competitorProduct} onChange={(e) => setCompetitorProduct(e.target.value)} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Observed Competitor Price (₹)" type="number" value={competitorPrice} onChange={(e) => setCompetitorPrice(e.target.value)} />
            <Select label="Our Equivalent Product" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} options={products.map((p) => ({ label: p.name, value: p.name }))} />
          </div>
          <Select label="Observed Market Demand / Interest" value={demandStatus} onChange={(e) => setDemandStatus(e.target.value as any)} options={[{ label: 'High Interest', value: 'high' }, { label: 'Moderate Interest', value: 'moderate' }, { label: 'Low Interest', value: 'low' }]} />
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Dealer / Market Feedback</label>
            <textarea rows={3} value={dealerFeedback} onChange={(e) => setDealerFeedback(e.target.value)} className="glass-input w-full rounded-xl p-3 text-xs text-slate-900" required />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Survey'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
