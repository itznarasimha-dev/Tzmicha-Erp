import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { User, Product, Batch } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  Percent,
  Tag,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  Users,
  Building,
  Calculator,
  Edit2,
  Clock,
  Sparkles,
  Sliders,
  Check,
  ArrowRight,
  Info,
} from 'lucide-react';

export const SalesDiscountMatrix: React.FC = () => {
  const {
    products,
    batches,
    users,
    customers,
    setUserDiscountLimit,
    updatePricePolicy,
    updateBatchDiscount,
    applySmartDiscount,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'reps' | 'products' | 'batches' | 'simulator'>('reps');

  // Modal: Edit Rep Limit
  const [repModalOpen, setRepModalOpen] = useState(false);
  const [selectedRep, setSelectedRep] = useState<User | null>(null);
  const [newRepLimit, setNewRepLimit] = useState('8');

  // Modal: Edit Product Floor
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stdPrice, setStdPrice] = useState('');
  const [floorPrice, setFloorPrice] = useState('');
  const [defaultMaxDisc, setDefaultMaxDisc] = useState('');

  // Modal: Edit Batch Clearance Discount
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [batchDiscount, setBatchDiscount] = useState('10');

  // Simulator State
  const salesReps = users.filter((u) => u.role === 'sales');
  const [simRepId, setSimRepId] = useState(salesReps[0]?.id || '');
  const [simProductId, setSimProductId] = useState(products[0]?.id || '');
  const [simBatchId, setSimBatchId] = useState(batches[0]?.id || '');
  const [simDiscountPercent, setSimDiscountPercent] = useState('8');

  // Smart Discount Builder State
  const [smartModalOpen, setSmartModalOpen] = useState(false);
  const [smartTargetType, setSmartTargetType] = useState<'batch' | 'product'>('batch');
  const [smartBatchPreset, setSmartBatchPreset] = useState<'near_expiry' | 'high_stock' | 'custom'>('near_expiry');
  const [smartProductPreset, setSmartProductPreset] = useState<'category' | 'high_margin' | 'custom'>('category');
  const [smartSelectedCategory, setSmartSelectedCategory] = useState<string>(products[0]?.categoryName || '');
  const [smartSelectedBatchIds, setSmartSelectedBatchIds] = useState<string[]>([]);
  const [smartSelectedProductIds, setSmartSelectedProductIds] = useState<string[]>([]);
  const [smartDiscountPercent, setSmartDiscountPercent] = useState<number>(10);
  const [smartCampaignReason, setSmartCampaignReason] = useState<string>('Near-Expiry Liquidation Markdown');
  const [smartValidUntil, setSmartValidUntil] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [smartToastMessage, setSmartToastMessage] = useState<string | null>(null);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.categoryName))).filter(Boolean);
  }, [products]);

  // Handle open smart discount modal with specific type
  const handleOpenSmartDiscountModal = (type?: 'batch' | 'product') => {
    if (type) {
      setSmartTargetType(type);
      if (type === 'product') {
        setSmartCampaignReason('Promotional Seasonal Special');
      } else {
        setSmartCampaignReason('Near-Expiry Liquidation Markdown');
      }
    }
    setSmartModalOpen(true);
  };

  // Matching Batches based on preset
  const matchingBatches = useMemo(() => {
    if (smartBatchPreset === 'near_expiry') {
      return batches.filter(
        (b) =>
          b.status === 'near_expiry' ||
          (b.expiryDate && new Date(b.expiryDate).getTime() - Date.now() < 120 * 86400000)
      );
    }
    if (smartBatchPreset === 'high_stock') {
      return batches.filter((b) => b.availableQuantity >= 40);
    }
    return batches.filter((b) => smartSelectedBatchIds.includes(b.id));
  }, [batches, smartBatchPreset, smartSelectedBatchIds]);

  // Matching Products based on preset
  const matchingProducts = useMemo(() => {
    if (smartProductPreset === 'category') {
      return products.filter((p) => p.categoryName === smartSelectedCategory);
    }
    if (smartProductPreset === 'high_margin') {
      return products.filter((p) => {
        const margin = ((p.standardSellingPrice - p.actualCost) / p.standardSellingPrice) * 100;
        return margin >= 35;
      });
    }
    return products.filter((p) => smartSelectedProductIds.includes(p.id));
  }, [products, smartProductPreset, smartSelectedCategory, smartSelectedProductIds]);

  // Sample financial calculation for the first matching item or average
  const smartFinancials = useMemo(() => {
    let basePrice = 1000;
    let costPrice = 600;
    let floorPrice = 750;
    let itemName = '';

    if (smartTargetType === 'batch') {
      const targetBatch = matchingBatches[0] || batches[0];
      const prod = products.find((p) => p.id === targetBatch?.productId) || products[0];
      if (prod) {
        basePrice = prod.standardSellingPrice;
        costPrice = prod.actualCost;
        floorPrice = prod.minAllowedPrice;
        itemName = `${targetBatch?.batchNumber || 'Batch'} (${prod.name})`;
      }
    } else {
      const prod = matchingProducts[0] || products[0];
      if (prod) {
        basePrice = prod.standardSellingPrice;
        costPrice = prod.actualCost;
        floorPrice = prod.minAllowedPrice;
        itemName = prod.name;
      }
    }

    const discountAmount = Math.round(basePrice * (smartDiscountPercent / 100));
    const discountedPrice = basePrice - discountAmount;
    const profit = discountedPrice - costPrice;
    const marginPercent = discountedPrice > 0 ? (profit / discountedPrice) * 100 : 0;
    const breachesFloor = discountedPrice < floorPrice;
    const maxSafeDiscount = Math.max(0, Math.floor(((basePrice - floorPrice) / basePrice) * 100));

    return {
      basePrice,
      costPrice,
      floorPrice,
      discountAmount,
      discountedPrice,
      profit,
      marginPercent,
      breachesFloor,
      maxSafeDiscount,
      itemName,
    };
  }, [smartTargetType, matchingBatches, matchingProducts, batches, products, smartDiscountPercent]);

  const handleApplySmartDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    const targetIds =
      smartTargetType === 'batch'
        ? matchingBatches.map((b) => b.id)
        : matchingProducts.map((p) => p.id);

    if (targetIds.length === 0) {
      alert('Please select at least one batch or product to apply the smart discount.');
      return;
    }

    applySmartDiscount({
      targetType: smartTargetType,
      targetIds,
      discountPercent: smartDiscountPercent,
      reason: smartCampaignReason,
      validUntil: smartValidUntil,
    });

    setSmartToastMessage(
      `Smart discount of ${smartDiscountPercent}% successfully activated across ${targetIds.length} ${
        smartTargetType === 'batch' ? 'batch(es)' : 'product(s)'
      }!`
    );
    setTimeout(() => setSmartToastMessage(null), 4000);
    setSmartModalOpen(false);
  };

  // Rep Modal Handlers
  const handleOpenRepModal = (rep: User) => {
    setSelectedRep(rep);
    setNewRepLimit((rep.maxDiscountPercent || 0).toString());
    setRepModalOpen(true);
  };

  const handleSaveRepLimit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRep) {
      setUserDiscountLimit(selectedRep.id, parseFloat(newRepLimit) || 0);
      setRepModalOpen(false);
    }
  };

  // Product Modal Handlers
  const handleOpenProductModal = (p: Product) => {
    setSelectedProduct(p);
    setStdPrice(p.standardSellingPrice.toString());
    setFloorPrice(p.minAllowedPrice.toString());
    setDefaultMaxDisc((p.defaultMaxDiscountPercent || 10).toString());
    setProductModalOpen(true);
  };

  const handleSaveProductPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProduct) {
      updatePricePolicy(
        selectedProduct.id,
        parseFloat(stdPrice) || selectedProduct.standardSellingPrice,
        parseFloat(floorPrice) || selectedProduct.minAllowedPrice,
        parseFloat(defaultMaxDisc) || 10
      );
      setProductModalOpen(false);
    }
  };

  // Batch Modal Handlers
  const handleOpenBatchModal = (b: Batch) => {
    setSelectedBatch(b);
    setBatchDiscount((b.clearanceDiscountPercent || 0).toString());
    setBatchModalOpen(true);
  };

  const handleSaveBatchDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBatch) {
      updateBatchDiscount(selectedBatch.id, parseFloat(batchDiscount) || 0);
      setBatchModalOpen(false);
    }
  };

  // Simulator Calculations
  const activeSimRep = users.find((u) => u.id === simRepId) || salesReps[0];
  const activeSimProduct = products.find((p) => p.id === simProductId) || products[0];
  const activeSimBatch = batches.find((b) => b.id === simBatchId) || batches[0];

  const discVal = parseFloat(simDiscountPercent) || 0;
  const repMaxDisc = activeSimRep?.maxDiscountPercent || 8;
  const batchExtraDisc = activeSimBatch?.clearanceDiscountPercent || 0;
  const totalAllowedRepDisc = repMaxDisc + batchExtraDisc;

  const basePrice = activeSimProduct?.standardSellingPrice || 1000;
  const costPrice = activeSimProduct?.actualCost || 600;
  const floorPriceVal = activeSimProduct?.minAllowedPrice || 750;

  const quotedUnitPrice = basePrice * (1 - discVal / 100);
  const profitPerUnit = quotedUnitPrice - costPrice;
  const grossMarginPercent = (profitPerUnit / quotedUnitPrice) * 100;

  let ruleOutcome: 'auto' | 'approval' | 'blocked' = 'auto';
  if (quotedUnitPrice < floorPriceVal) {
    ruleOutcome = 'blocked';
  } else if (discVal > totalAllowedRepDisc) {
    ruleOutcome = 'approval';
  } else {
    ruleOutcome = 'auto';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            Discounts & Pricing Policies
            <Badge variant="primary" size="sm">Sales Allowances</Badge>
            <Badge variant="purple" size="sm">Batch & Stock Markdowns</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure permitted discount limits for sales personnel on stock items, near-expiry clearance batches, and customer pricing policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenSmartDiscountModal()}
            className="cursor-pointer font-bold shadow-xs"
            icon={<Sparkles className="w-4 h-4" />}
          >
            + Smart Add Discount (Batch / Product)
          </Button>

          <Button
            variant={activeTab === 'simulator' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('simulator')}
            className="cursor-pointer"
            icon={<Calculator className="w-4 h-4" />}
          >
            Live Deal Simulator
          </Button>
        </div>
      </div>

      {/* Smart Discount Toast Alert */}
      {smartToastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{smartToastMessage}</span>
        </div>
      )}

      {/* 3 Pillars Explainer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 space-y-2.5 border-indigo-100 hover:border-indigo-300 transition-all duration-200">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold text-xs">
            <Percent className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">1. Rep Authority Limit</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Sales reps can grant discounts up to their assigned limit (e.g. 8%). Orders confirm and reserve inventory immediately without management intervention.
          </p>
        </div>

        <div className="glass-card p-4 space-y-2.5 border-amber-100 hover:border-amber-300 transition-all duration-200">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold text-xs">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">2. Batch Liquidation Bonus</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Admin can assign extra clearance markdown (e.g. +10%) on near-expiry or slow batches. Reps can pass this extra discount to customers when choosing that batch.
          </p>
        </div>

        <div className="glass-card p-4 space-y-2.5 border-rose-100 hover:border-rose-300 transition-all duration-200">
          <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold text-xs">
            <Tag className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">3. Hard Product Floor Price</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            No quote is ever allowed below the item floor price under any circumstances, strictly protecting manufacturing costs and contribution margin.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('reps')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'reps'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Sales Reps Delegated Limits ({salesReps.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('batches')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'batches'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Batch Clearance Markdowns ({batches.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'products'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Product Floor Prices ({products.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulator')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'simulator'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Deal Simulator
        </button>
      </div>

      {/* TAB 1: Sales Reps Table */}
      {activeTab === 'reps' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Sales Representative Authority Limits</CardTitle>
              <CardDescription>
                Max discount percentage an individual sales rep can directly give to dealers or customers.
              </CardDescription>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="pb-3 px-3">Salesperson</th>
                  <th className="pb-3 px-3">Territory</th>
                  <th className="pb-3 px-3">Current Max Discount</th>
                  <th className="pb-3 px-3">Approval Trigger</th>
                  <th className="pb-3 px-3">Monthly Sales Target</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {salesReps.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={rep.avatar}
                          alt={rep.name}
                          className="w-8 h-8 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{rep.name}</span>
                          <span className="text-[10px] text-slate-500">{rep.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px] uppercase">
                        {rep.assignedRegionId}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-indigo-700">
                      <span className="px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200">
                        {rep.maxDiscountPercent || 0}% Max
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      Orders exceeding <span className="font-bold text-amber-700">{rep.maxDiscountPercent || 0}%</span> route to Admin
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      ₹{((rep.monthlySalesTarget || 1500000) / 100000).toFixed(1)} Lakhs
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRepModal(rep)}
                        className="cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Edit Limit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: Batch Clearance Markdowns */}
      {activeTab === 'batches' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Batch-Specific Markdown & Liquidation Discounts</CardTitle>
              <CardDescription>
                Allow additional promotional discounts on slow-moving or near-expiry batches to help sales reps clear aged inventory.
              </CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenSmartDiscountModal('batch')}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              + Smart Batch Markdown
            </Button>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="pb-3 px-3">Batch Number</th>
                  <th className="pb-3 px-3">Product / SKU</th>
                  <th className="pb-3 px-3">Warehouse Depot</th>
                  <th className="pb-3 px-3">Expiry Date & Status</th>
                  <th className="pb-3 px-3">Available Stock</th>
                  <th className="pb-3 px-3">Clearance Discount Allowed</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {batches.map((b) => {
                  const hasDiscount = (b.clearanceDiscountPercent || 0) > 0;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{b.productName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{b.productSku}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{b.warehouseId}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{b.expiryDate}</span>
                          {b.status === 'near_expiry' && (
                            <Badge variant="warning" size="sm">Near Expiry</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {b.availableQuantity} units
                      </td>
                      <td className="py-3 px-3">
                        {hasDiscount ? (
                          <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 font-bold text-xs inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            +{b.clearanceDiscountPercent}% Clearance
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Standard (0%)</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant={hasDiscount ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => handleOpenBatchModal(b)}
                          className="cursor-pointer"
                        >
                          {hasDiscount ? 'Update Markdown' : '+ Set Clearance'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: Products Floor Pricing */}
      {activeTab === 'products' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Product Standard Prices & Floor Limits</CardTitle>
              <CardDescription>
                Floor price is the hard minimum below which NO sales user or approval can ever quote.
              </CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenSmartDiscountModal('product')}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              + Smart Product Promotion
            </Button>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="pb-3 px-3">SKU & Item Name</th>
                  <th className="pb-3 px-3">Category</th>
                  <th className="pb-3 px-3">Standard Selling Price</th>
                  <th className="pb-3 px-3">Landed Cost (Admin Secret)</th>
                  <th className="pb-3 px-3">Hard Floor Price</th>
                  <th className="pb-3 px-3">Default Max Discount</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {products.map((p) => {
                  const marginAtFloor = ((p.minAllowedPrice - p.actualCost) / p.minAllowedPrice) * 100;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.sku} • {p.unit}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{p.categoryName}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        ₹{p.standardSellingPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        ₹{p.actualCost.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 font-semibold text-rose-700">
                        ₹{p.minAllowedPrice.toLocaleString('en-IN')}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          ({marginAtFloor.toFixed(1)}% margin safeguard)
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                          {p.defaultMaxDiscountPercent || 10}%
                        </span>
                        {p.promotionalDiscountPercent && p.promotionalDiscountPercent > 0 && (
                          <span className="block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-1">
                            +{p.promotionalDiscountPercent}% Promo ({p.discountReason || 'Campaign'})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenProductModal(p)}
                          className="cursor-pointer"
                        >
                          Edit Floor
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: Live Discount Simulator */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Simulator Controls */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Deal & Discount Rule Simulator</CardTitle>
                <CardDescription>
                  Simulate field quotations to test if a rep can offer a discount or if it triggers Admin approval / gets blocked.
                </CardDescription>
              </div>
            </CardHeader>

            <div className="space-y-4 p-4 pt-0">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Select Sales Representative
                </label>
                <select
                  value={simRepId}
                  onChange={(e) => setSimRepId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {salesReps.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Max Auth: {r.maxDiscountPercent || 0}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Select Product / Item
                </label>
                <select
                  value={simProductId}
                  onChange={(e) => setSimProductId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Standard: ₹{p.standardSellingPrice} | Floor: ₹{p.minAllowedPrice}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Select Batch (Optional Clearance Allowance)
                </label>
                <select
                  value={simBatchId}
                  onChange={(e) => setSimBatchId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {batches
                    .filter((b) => b.productId === simProductId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchNumber} ({b.warehouseId}) — Extra Markdown: {b.clearanceDiscountPercent || 0}%
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Proposed Customer Discount Percentage
                  </label>
                  <span className="text-sm font-semibold text-indigo-700">{simDiscountPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="35"
                  step="0.5"
                  value={simDiscountPercent}
                  onChange={(e) => setSimDiscountPercent(e.target.value)}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>
          </Card>

          {/* Real-time Outcome Card */}
          <div className="space-y-4">
            <Card className="border-indigo-100">
              <CardHeader>
                <div>
                  <CardTitle>Governance Decision Engine</CardTitle>
                  <CardDescription>Live evaluation of pricing rules against proposed discount</CardDescription>
                </div>
              </CardHeader>

              <div className="p-4 pt-0 space-y-4">
                {/* Decision Banner */}
                {ruleOutcome === 'auto' && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>DIRECTLY AUTHORIZED AT FIELD LEVEL</span>
                    </div>
                    <p className="text-xs text-emerald-700">
                      The proposed {discVal}% discount is within the rep's authorized limit ({totalAllowedRepDisc}% total) and remains above the product floor price. Order confirms and reserves stock immediately!
                    </p>
                  </div>
                )}

                {ruleOutcome === 'approval' && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <span>TRIGGERS ADMIN APPROVAL REQUIRED</span>
                    </div>
                    <p className="text-xs text-amber-700">
                      Discount of {discVal}% exceeds rep's permitted limit ({totalAllowedRepDisc}%). The quotation enters <code className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded">pending_discount_approval</code> and cannot be dispatched without Admin sign-off.
                    </p>
                  </div>
                )}

                {ruleOutcome === 'blocked' && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <ShieldCheck className="w-5 h-5 text-rose-600" />
                      <span>STRICTLY BLOCKED: BREACHES FLOOR PRICE</span>
                    </div>
                    <p className="text-xs text-rose-700">
                      Quoted unit price (₹{quotedUnitPrice.toFixed(2)}) is below the absolute product floor price (₹{floorPriceVal}). No user or manager can confirm this order!
                    </p>
                  </div>
                )}

                {/* Economics Breakdown */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-xs uppercase tracking-wide">
                    Unit Margin & Economics Breakdown
                  </span>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Standard Selling Price</span>
                    <span className="font-bold text-slate-900">₹{basePrice.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Customer Discount Applied</span>
                    <span className="font-bold text-rose-600">-{discVal}% (₹{(basePrice - quotedUnitPrice).toFixed(2)})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-700 font-semibold">Customer Quoted Unit Price</span>
                    <span className="font-semibold text-indigo-700 text-sm">₹{quotedUnitPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Manufacturing Landed Cost</span>
                    <span className="font-mono text-slate-600">₹{costPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1 pt-1.5">
                    <span className="text-slate-900 font-bold">Gross Profit Margin</span>
                    <span className={`font-bold ${profitPerUnit > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      ₹{profitPerUnit.toFixed(2)} / unit ({grossMarginPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Modal: Edit Rep Limit */}
      <Modal
        isOpen={repModalOpen}
        onClose={() => setRepModalOpen(false)}
        title="Update Sales Representative Discount Limit"
        description="Configure maximum authorized discount the representative can offer directly to customers."
      >
        <form onSubmit={handleSaveRepLimit} className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="font-bold text-slate-900 block">{selectedRep?.name}</span>
            <span className="text-slate-500">{selectedRep?.email} • Region: {selectedRep?.assignedRegionId}</span>
          </div>

          <Input
            label="Maximum Authorized Discount Percentage (%)"
            type="number"
            step="0.5"
            min="0"
            max="30"
            value={newRepLimit}
            onChange={(e) => setNewRepLimit(e.target.value)}
            required
          />

          <p className="text-[11px] text-slate-500">
            Quotes exceeding this limit will enter the Admin Approval queue before warehouse dispatch.
          </p>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRepModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Discount Limit
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Batch Clearance Discount */}
      <Modal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        title="Set Batch Clearance Discount Allowance"
        description="Grant a special discount allowance for this specific batch to expedite liquidation."
      >
        <form onSubmit={handleSaveBatchDiscount} className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="font-bold text-slate-900 block">Batch {selectedBatch?.batchNumber}</span>
            <span className="text-slate-500">{selectedBatch?.productName} • Expiry: {selectedBatch?.expiryDate}</span>
          </div>

          <Input
            label="Clearance Markdown Percentage (%)"
            type="number"
            step="0.5"
            min="0"
            max="25"
            value={batchDiscount}
            onChange={(e) => setBatchDiscount(e.target.value)}
            required
          />

          <p className="text-[11px] text-slate-500">
            Sales representatives selecting this batch can add this markdown on top of their normal limit to incentivize customer purchase.
          </p>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBatchModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Clearance Discount
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Product Floor */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title="Configure Product Pricing Floor & Caps"
        description="Ensure positive contribution margin by setting an absolute floor price."
      >
        <form onSubmit={handleSaveProductPolicy} className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="font-bold text-slate-900 block">{selectedProduct?.name} ({selectedProduct?.sku})</span>
            <span className="text-slate-500">Secret Landed Cost: ₹{selectedProduct?.actualCost}</span>
          </div>

          <Input
            label="Standard Selling Price (₹)"
            type="number"
            value={stdPrice}
            onChange={(e) => setStdPrice(e.target.value)}
            required
          />

          <Input
            label="Absolute Minimum Floor Price (₹)"
            type="number"
            value={floorPrice}
            onChange={(e) => setFloorPrice(e.target.value)}
            required
          />

          <Input
            label="Default Max Discount Percent (%)"
            type="number"
            value={defaultMaxDisc}
            onChange={(e) => setDefaultMaxDisc(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setProductModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Pricing Rules
            </Button>
          </div>
        </form>
      </Modal>

      {/* SMART DISCOUNT MODAL (Batch or Product) */}
      {smartModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setSmartModalOpen(false)}
          title={
            smartTargetType === 'batch'
              ? '⚡ Smart Add Discount: Stock Batch Markdown'
              : '🚀 Smart Add Discount: Product Catalog Promotion'
          }
          description="Intelligent discount configuration with automated floor-price protection and margin contribution safeguards."
        >
          <form onSubmit={handleApplySmartDiscount} className="space-y-4 pt-1 text-xs">
            {/* Target Type Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                1. Select Discount Target Scope
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSmartTargetType('batch');
                    setSmartCampaignReason('Near-Expiry Liquidation Markdown');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    smartTargetType === 'batch'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs ring-1 ring-indigo-600'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold text-xs">Specific Batch Markdown</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Discount physical batches (near-expiry or aged stock) without changing product base price.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSmartTargetType('product');
                    setSmartCampaignReason('Promotional Seasonal Special');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    smartTargetType === 'product'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs ring-1 ring-indigo-600'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold text-xs">Product Catalog Promotion</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Apply promotional allowance across product SKUs or whole categories with floor safeguards.
                  </p>
                </button>
              </div>
            </div>

            {/* Smart Presets & Selection */}
            {smartTargetType === 'batch' ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    2. Smart Batch Selection Rules
                  </label>
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                    {matchingBatches.length} Batches Targeted
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSmartBatchPreset('near_expiry')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      smartBatchPreset === 'near_expiry'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    ⚡ Near-Expiry (&lt;120 Days)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSmartBatchPreset('high_stock')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      smartBatchPreset === 'high_stock'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    📦 High Available Stock (≥40 units)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSmartBatchPreset('custom')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      smartBatchPreset === 'custom'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🔍 Manual Multi-Select
                  </button>
                </div>

                {smartBatchPreset === 'custom' ? (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-white rounded-lg border border-slate-200">
                    {batches.map((b) => (
                      <label
                        key={b.id}
                        className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={smartSelectedBatchIds.includes(b.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSmartSelectedBatchIds([...smartSelectedBatchIds, b.id]);
                              } else {
                                setSmartSelectedBatchIds(smartSelectedBatchIds.filter((id) => id !== b.id));
                              }
                            }}
                            className="rounded text-indigo-600 cursor-pointer"
                          />
                          <span className="font-mono font-bold text-slate-900">{b.batchNumber}</span>
                          <span className="text-slate-600 truncate max-w-[150px]">{b.productName}</span>
                        </div>
                        <span className="font-mono text-slate-500">{b.availableQuantity} units</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800">Targeted Batches: </span>
                    {matchingBatches.length > 0 ? (
                      matchingBatches.map((b) => `${b.batchNumber} (${b.productSku})`).join(', ')
                    ) : (
                      <span className="text-rose-600">No batches currently match this rule criteria.</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    2. Smart Product Selection Rules
                  </label>
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                    {matchingProducts.length} Products Targeted
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSmartProductPreset('category')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      smartProductPreset === 'category'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    📂 By Product Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setSmartProductPreset('high_margin')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      smartProductPreset === 'high_margin'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    💎 High Margin Items (≥35%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSmartProductPreset('custom')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      smartProductPreset === 'custom'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🔍 Manual Multi-Select
                  </button>
                </div>

                {smartProductPreset === 'category' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Choose Product Category:
                    </label>
                    <select
                      value={smartSelectedCategory}
                      onChange={(e) => setSmartSelectedCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c} ({products.filter((p) => p.categoryName === c).length} products)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : smartProductPreset === 'custom' ? (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-white rounded-lg border border-slate-200">
                    {products.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={smartSelectedProductIds.includes(p.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSmartSelectedProductIds([...smartSelectedProductIds, p.id]);
                              } else {
                                setSmartSelectedProductIds(smartSelectedProductIds.filter((id) => id !== p.id));
                              }
                            }}
                            className="rounded text-indigo-600 cursor-pointer"
                          />
                          <span className="font-bold text-slate-900">{p.name}</span>
                          <span className="font-mono text-slate-400">({p.sku})</span>
                        </div>
                        <span className="font-mono font-bold text-slate-700">₹{p.standardSellingPrice}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800">High Margin Items: </span>
                    {matchingProducts.map((p) => p.name).join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Smart Discount Percentage Slider & Presets */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  3. Set Promotional Discount Allowance
                </label>
                <div className="font-mono font-bold text-indigo-600 text-base">
                  {smartDiscountPercent}%
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={35}
                  step={0.5}
                  value={smartDiscountPercent}
                  onChange={(e) => setSmartDiscountPercent(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5">
                {[5, 10, 15, 20, 25].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setSmartDiscountPercent(pct)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      smartDiscountPercent === pct
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Campaign Reason & Validity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                    Campaign / Discount Reason
                  </label>
                  <input
                    type="text"
                    value={smartCampaignReason}
                    onChange={(e) => setSmartCampaignReason(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                    Offer Valid Until
                  </label>
                  <input
                    type="date"
                    value={smartValidUntil}
                    onChange={(e) => setSmartValidUntil(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Smart Financial Calculation & Guardrail Safety Card */}
            <div
              className={`p-4 rounded-xl border space-y-2.5 transition-all ${
                smartFinancials.breachesFloor
                  ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                  : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Live Margin & Floor Price Safeguard Engine
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  Sample: {smartFinancials.itemName || 'Selected Items'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200/60 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Standard Price:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{smartFinancials.basePrice.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Discounted Price:</span>
                  <span className="font-mono font-semibold text-indigo-700">
                    ₹{smartFinancials.discountedPrice.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Secret Landed Cost:</span>
                  <span className="font-mono text-slate-600">
                    ₹{smartFinancials.costPrice.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Retained Margin:</span>
                  <span
                    className={`font-mono font-bold ${
                      smartFinancials.marginPercent >= 25 ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {smartFinancials.marginPercent.toFixed(1)}% Gross
                  </span>
                </div>
              </div>

              {smartFinancials.breachesFloor ? (
                <div className="flex items-center justify-between p-2 rounded-lg bg-rose-100/80 border border-rose-300 text-rose-800 text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    Breaches Minimum Floor Price (₹{smartFinancials.floorPrice.toLocaleString('en-IN')})!
                  </span>
                  <button
                    type="button"
                    onClick={() => setSmartDiscountPercent(smartFinancials.maxSafeDiscount)}
                    className="px-2 py-1 rounded bg-rose-700 text-white font-bold hover:bg-rose-800 cursor-pointer text-[10px]"
                  >
                    Clamp to {smartFinancials.maxSafeDiscount}% (Max Safe)
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Safeguard Cleared: Maintains positive contribution margin above statutory floor price.
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setSmartModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={
                  (smartTargetType === 'batch' && matchingBatches.length === 0) ||
                  (smartTargetType === 'product' && matchingProducts.length === 0)
                }
                icon={<Check className="w-4 h-4" />}
              >
                Apply Smart Discount (
                {smartTargetType === 'batch' ? matchingBatches.length : matchingProducts.length}{' '}
                {smartTargetType === 'batch' ? 'Batches' : 'Products'})
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SalesDiscountMatrix;
