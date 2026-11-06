import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { ClipboardList, Plus, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';

export const MarketSurveys: React.FC = () => {
  const { marketSurveys, products, currentUser, submitMarketSurvey } = useErpStore();
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [dealerName, setDealerName] = useState('');
  const [competitorBrand, setCompetitorBrand] = useState('Asian Paints PPG');
  const [competitorProduct, setCompetitorProduct] = useState('Apcolite Epoxy Protective');
  const [competitorPrice, setCompetitorPrice] = useState('17500');
  const [selectedProduct, setSelectedProduct] = useState(products[0]?.name || '');
  const [dealerFeedback, setDealerFeedback] = useState('Contractors like our viscosity but competitor offers 60-day credit.');
  const [demandStatus, setDemandStatus] = useState<'high' | 'moderate' | 'low'>('high');

  const mySurveys = marketSurveys.filter((s) => s.marketingUserId === currentUser.id);

  const handleCreateSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealerName || !competitorBrand) return;

    const matchedProd = products.find((p) => p.name === selectedProduct);
    const ourPrice = matchedProd?.standardSellingPrice || 18000;
    const compPrice = parseFloat(competitorPrice) || 0;
    const diff = compPrice - ourPrice;

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
      priceDifference: -diff,
      dealerFeedback,
      marketDemandStatus: demandStatus,
    });

    setModalOpen(false);
    setDealerName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Field Market Surveys & Competitor Pricing
            <Badge variant="success" size="sm">Ground Intel</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Record on-ground competitor shelf pricing, retailer feedback, and local demand trends during store visits.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Record Price Observation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {mySurveys.map((s) => (
          <Card key={s.id} className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-extrabold text-sm text-slate-900">{s.dealerName}</span>
                <span className="text-slate-400 text-xs block">{s.date}</span>
              </div>
              <Badge variant={s.marketDemandStatus === 'high' ? 'success' : 'neutral'} size="sm">
                Demand: {s.marketDemandStatus.toUpperCase()}
              </Badge>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Competitor</span>
                <span className="font-bold text-rose-700">{s.competitorBrand}</span>
                <div className="text-slate-600 truncate">{s.competitorProduct}</div>
                <div className="font-extrabold text-slate-900 mt-1">₹{s.competitorPricePerUnit.toLocaleString('en-IN')}</div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Our Equivalent</span>
                <span className="font-bold text-indigo-700">{s.ourEquivalentProduct}</span>
                <div className="text-slate-400 text-[11px]">Approved Standard</div>
                <div className="font-extrabold text-indigo-900 mt-1">₹{s.ourSellingPrice.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <Badge variant={s.priceDifference > 0 ? 'warning' : 'success'} size="sm">
                {s.priceDifference > 0
                  ? `Competitor is cheaper by ₹${s.priceDifference}`
                  : `ApexFlow is cheaper by ₹${Math.abs(s.priceDifference)}`}
              </Badge>
            </div>

            <p className="text-xs text-slate-600 bg-white/60 p-2.5 rounded-lg border border-slate-100 italic">
              "{s.dealerFeedback}"
            </p>
          </Card>
        ))}
      </div>

      {/* Record Observation Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Competitor Price & Market Observation"
        description="Feeds ground intelligence directly to product managers and regional leadership."
      >
        <form onSubmit={handleCreateSurvey} className="space-y-4">
          <Input
            label="Dealer / Hardware Store Name"
            placeholder="e.g. Balaji Building Solutions"
            value={dealerName}
            onChange={(e) => setDealerName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Competitor Brand"
              placeholder="e.g. Berger / Asian Paints / Pidilite"
              value={competitorBrand}
              onChange={(e) => setCompetitorBrand(e.target.value)}
              required
            />
            <Input
              label="Competitor Product Name"
              placeholder="e.g. Epilux 4 Epoxy Primer"
              value={competitorProduct}
              onChange={(e) => setCompetitorProduct(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Competitor Retail Price (₹)"
              type="number"
              value={competitorPrice}
              onChange={(e) => setCompetitorPrice(e.target.value)}
              required
            />
            <Select
              label="Our Equivalent Product"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              options={products.map((p) => ({ label: p.name, value: p.name }))}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Dealer Feedback & Sentiment</label>
            <textarea
              rows={2}
              value={dealerFeedback}
              onChange={(e) => setDealerFeedback(e.target.value)}
              placeholder="e.g. Dealer commented that our lead time is faster but competitor provides free sample tins."
              className="glass-input w-full rounded-xl p-2.5 text-xs text-slate-900"
              required
            />
          </div>

          <Select
            label="Local Market Demand Status"
            value={demandStatus}
            onChange={(e) => setDemandStatus(e.target.value as any)}
            options={[
              { label: 'High Demand (Active construction season)', value: 'high' },
              { label: 'Moderate Demand (Steady baseline sales)', value: 'moderate' },
              { label: 'Low Demand (Monsoon slow-down)', value: 'low' },
            ]}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Market Survey
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
