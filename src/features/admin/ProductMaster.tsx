import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Product, SupplierCostBreakdown, ManufacturingCostBreakdown } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select, SearchInput } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import {
  Plus,
  Edit2,
  Lock,
  Filter,
  Boxes,
  Factory,
  Truck,
  TrendingUp,
  Percent,
  Eye,
  Calculator,
  Tag,
  Info,
  ShieldCheck,
  CheckCircle2,
  ArrowUpDown,
  FileText,
  BadgeIndianRupee,
  Layers,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export const ProductMaster: React.FC = () => {
  const { products, categories, suppliers, addProduct, updateProduct, updatePricePolicy } = useErpStore();

  // Search, filter & sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<'all' | 'supplier_sourced' | 'self_manufactured'>('all');
  const [sortBy, setSortBy] = useState<'sku' | 'name' | 'cost_asc' | 'cost_desc' | 'price_desc' | 'margin_desc'>('sku');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Drawer state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Success toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // -------------------------------------------------------------
  // FORM STATES (Shared by Add and Edit Product Costing)
  // -------------------------------------------------------------
  const [formSource, setFormSource] = useState<'supplier_sourced' | 'self_manufactured'>('supplier_sourced');
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(categories[0]?.id || 'cat-primer');
  const [formSupplierId, setFormSupplierId] = useState(suppliers[0]?.id || 'sup-001');
  const [formManufacturingFacility, setFormManufacturingFacility] = useState('ApexFlow Greater Noida Plant 1');
  const [formSalesUnit, setFormSalesUnit] = useState('Drums (200L)');
  const [formPurchaseUnit, setFormPurchaseUnit] = useState('Drums (200L)');
  const [formConversionFactor, setFormConversionFactor] = useState('1');
  const [formHsn, setFormHsn] = useState('32089019');
  const [formDescription, setFormDescription] = useState('');

  // Supplier-sourced cost components
  const [supPurchasePrice, setSupPurchasePrice] = useState('11200');
  const [supFreight, setSupFreight] = useState('650');
  const [supLoadingUnloading, setSupLoadingUnloading] = useState('180');
  const [supHandling, setSupHandling] = useState('150');
  const [supPackaging, setSupPackaging] = useState('220');
  const [supOtherAcquisition, setSupOtherAcquisition] = useState('100');

  // Shared Consignment Expense Allocation Helper (Supplier)
  const [showBatchAllocation, setShowBatchAllocation] = useState(false);
  const [batchTotalFreight, setBatchTotalFreight] = useState('15000');
  const [batchConsignmentQty, setBatchConsignmentQty] = useState('25');

  // Manufacturing-sourced cost components
  const [mfgRawMaterial, setMfgRawMaterial] = useState('1950');
  const [mfgDirectLabor, setMfgDirectLabor] = useState('420');
  const [mfgPackaging, setMfgPackaging] = useState('180');
  const [mfgOverhead, setMfgOverhead] = useState('300');
  const [mfgQualityTesting, setMfgQualityTesting] = useState('110');
  const [mfgWastage, setMfgWastage] = useState('90');
  const [mfgOtherProduction, setMfgOtherProduction] = useState('50');

  // Selling Price, Tax & Projections
  const [formSellingPrice, setFormSellingPrice] = useState('18000');
  const [formTaxRate, setFormTaxRate] = useState('18');
  const [formIsTaxInclusive, setFormIsTaxInclusive] = useState(false);
  const [formInputTaxRecoverable, setFormInputTaxRecoverable] = useState(true);
  const [formEstimatedVolume, setFormEstimatedVolume] = useState('100');

  // -------------------------------------------------------------
  // HELPER FUNCTIONS: Fallbacks & Cost Derivations
  // -------------------------------------------------------------
  const getSupplierBreakdown = (p: Product): SupplierCostBreakdown => {
    if (p.supplierCostBreakdown) return p.supplierCostBreakdown;
    const total = p.actualCost || p.actualLandedCost || 10000;
    const basePurchase = p.standardPurchaseCost || Math.round(total * 0.90);
    const diff = Math.max(0, total - basePurchase);
    return {
      purchasePrice: basePurchase,
      freightTransportation: Math.round(diff * 0.45),
      loadingUnloading: Math.round(diff * 0.15),
      handlingCharges: Math.round(diff * 0.15),
      packagingCost: Math.round(diff * 0.15),
      otherAcquisitionCosts: diff - Math.round(diff * 0.45) - Math.round(diff * 0.15) * 3,
    };
  };

  const getManufacturingBreakdown = (p: Product): ManufacturingCostBreakdown => {
    if (p.manufacturingCostBreakdown) return p.manufacturingCostBreakdown;
    const total = p.actualCost || 5000;
    return {
      rawMaterialCost: Math.round(total * 0.62),
      directLaborCost: Math.round(total * 0.14),
      packagingCost: Math.round(total * 0.07),
      manufacturingOverhead: Math.round(total * 0.09),
      qualityTestingCost: Math.round(total * 0.035),
      wastageScrapCost: Math.round(total * 0.03),
      otherProductionCosts: total - (
        Math.round(total * 0.62) +
        Math.round(total * 0.14) +
        Math.round(total * 0.07) +
        Math.round(total * 0.09) +
        Math.round(total * 0.035) +
        Math.round(total * 0.03)
      ),
    };
  };

  const calculateProductMetrics = (p: Product) => {
    const actualCost = p.actualCost || p.actualLandedCost || 0;
    const sellingPrice = p.standardSellingPrice || 0;
    const profitPerUnit = sellingPrice - actualCost;
    const profitMargin = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0;
    const markupPercent = actualCost > 0 ? (profitPerUnit / actualCost) * 100 : 0;

    const taxRate = p.taxRatePercent ?? 18;
    const isTaxInclusive = !!p.isTaxInclusive;
    let basePrice = sellingPrice;
    let taxAmount = 0;
    let customerBilledPrice = sellingPrice;

    if (isTaxInclusive) {
      basePrice = sellingPrice / (1 + taxRate / 100);
      taxAmount = sellingPrice - basePrice;
      customerBilledPrice = sellingPrice;
    } else {
      basePrice = sellingPrice;
      taxAmount = sellingPrice * (taxRate / 100);
      customerBilledPrice = sellingPrice + taxAmount;
    }

    const monthlyVolume = p.estimatedMonthlySalesVolume || 100;
    const estimatedMonthlyProfit = profitPerUnit * monthlyVolume;

    return {
      actualCost,
      sellingPrice,
      profitPerUnit,
      profitMargin,
      markupPercent,
      taxRate,
      isTaxInclusive,
      basePrice,
      taxAmount,
      customerBilledPrice,
      monthlyVolume,
      estimatedMonthlyProfit,
    };
  };

  // -------------------------------------------------------------
  // FORM DYNAMIC RE-CALCULATIONS
  // -------------------------------------------------------------
  const formCalculatedActualCost = useMemo(() => {
    if (formSource === 'supplier_sourced') {
      const p = parseFloat(supPurchasePrice) || 0;
      const f = parseFloat(supFreight) || 0;
      const lu = parseFloat(supLoadingUnloading) || 0;
      const h = parseFloat(supHandling) || 0;
      const pkg = parseFloat(supPackaging) || 0;
      const oth = parseFloat(supOtherAcquisition) || 0;
      return p + f + lu + h + pkg + oth;
    } else {
      const rm = parseFloat(mfgRawMaterial) || 0;
      const dl = parseFloat(mfgDirectLabor) || 0;
      const pkg = parseFloat(mfgPackaging) || 0;
      const ovh = parseFloat(mfgOverhead) || 0;
      const qt = parseFloat(mfgQualityTesting) || 0;
      const wst = parseFloat(mfgWastage) || 0;
      const oth = parseFloat(mfgOtherProduction) || 0;
      return rm + dl + pkg + ovh + qt + wst + oth;
    }
  }, [
    formSource,
    supPurchasePrice,
    supFreight,
    supLoadingUnloading,
    supHandling,
    supPackaging,
    supOtherAcquisition,
    mfgRawMaterial,
    mfgDirectLabor,
    mfgPackaging,
    mfgOverhead,
    mfgQualityTesting,
    mfgWastage,
    mfgOtherProduction,
  ]);

  const formSellingPriceNum = parseFloat(formSellingPrice) || 0;
  const formProfitPerUnit = formSellingPriceNum - formCalculatedActualCost;
  const formProfitMargin = formSellingPriceNum > 0 ? (formProfitPerUnit / formSellingPriceNum) * 100 : 0;
  const formTaxRateNum = parseFloat(formTaxRate) || 18;
  const formGstAmount = formIsTaxInclusive
    ? formSellingPriceNum - formSellingPriceNum / (1 + formTaxRateNum / 100)
    : formSellingPriceNum * (formTaxRateNum / 100);
  const formFinalCustomerPrice = formIsTaxInclusive
    ? formSellingPriceNum
    : formSellingPriceNum + formGstAmount;

  // Apply shared batch allocation
  const handleApplyBatchAllocation = () => {
    const totalF = parseFloat(batchTotalFreight) || 0;
    const qty = parseFloat(batchConsignmentQty) || 1;
    if (qty > 0) {
      const perUnitFreight = Math.round(totalF / qty);
      setSupFreight(perUnitFreight.toString());
      triggerToast(`Allocated ₹${perUnitFreight.toLocaleString('en-IN')}/unit freight from batch shipment.`);
    }
  };

  // -------------------------------------------------------------
  // OPEN EDIT MODAL
  // -------------------------------------------------------------
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    const isSup = p.productSource === 'supplier_sourced' || (!p.productSource && !!p.supplierId);
    setFormSource(isSup ? 'supplier_sourced' : 'self_manufactured');
    setFormSku(p.sku);
    setFormName(p.name);
    setFormCategory(p.categoryId);
    setFormSupplierId(p.supplierId || suppliers[0]?.id || 'sup-001');
    setFormManufacturingFacility(p.manufacturingFacility || 'ApexFlow Greater Noida Plant 1');
    setFormSalesUnit(p.salesUnit || p.unit);
    setFormPurchaseUnit(p.purchaseUnit || p.unit);
    setFormConversionFactor((p.conversionFactor || 1).toString());
    setFormHsn(p.hsnCode || '32089019');
    setFormDescription(p.description || '');

    if (isSup) {
      const supCost = getSupplierBreakdown(p);
      setSupPurchasePrice(supCost.purchasePrice.toString());
      setSupFreight(supCost.freightTransportation.toString());
      setSupLoadingUnloading(supCost.loadingUnloading.toString());
      setSupHandling(supCost.handlingCharges.toString());
      setSupPackaging(supCost.packagingCost.toString());
      setSupOtherAcquisition(supCost.otherAcquisitionCosts.toString());
    } else {
      const mfgCost = getManufacturingBreakdown(p);
      setMfgRawMaterial(mfgCost.rawMaterialCost.toString());
      setMfgDirectLabor(mfgCost.directLaborCost.toString());
      setMfgPackaging(mfgCost.packagingCost.toString());
      setMfgOverhead(mfgCost.manufacturingOverhead.toString());
      setMfgQualityTesting(mfgCost.qualityTestingCost.toString());
      setMfgWastage(mfgCost.wastageScrapCost.toString());
      setMfgOtherProduction(mfgCost.otherProductionCosts.toString());
    }

    setFormSellingPrice(p.standardSellingPrice.toString());
    setFormTaxRate((p.taxRatePercent ?? 18).toString());
    setFormIsTaxInclusive(!!p.isTaxInclusive);
    setFormInputTaxRecoverable(p.inputTaxRecoverable ?? true);
    setFormEstimatedVolume((p.estimatedMonthlySalesVolume || 100).toString());

    setEditModalOpen(true);
  };

  // -------------------------------------------------------------
  // OPEN ADD MODAL
  // -------------------------------------------------------------
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormSource('supplier_sourced');
    setFormSku('');
    setFormName('');
    setFormCategory(categories[0]?.id || 'cat-primer');
    setFormSupplierId(suppliers[0]?.id || 'sup-001');
    setFormManufacturingFacility('ApexFlow Greater Noida Plant 1');
    setFormSalesUnit('Drums (200L)');
    setFormPurchaseUnit('Drums (200L)');
    setFormConversionFactor('1');
    setFormHsn('32089019');
    setFormDescription('');

    // Pre-populate with typical realistic defaults
    setSupPurchasePrice('8500');
    setSupFreight('500');
    setSupLoadingUnloading('120');
    setSupHandling('100');
    setSupPackaging('150');
    setSupOtherAcquisition('80');

    setMfgRawMaterial('4500');
    setMfgDirectLabor('1100');
    setMfgPackaging('350');
    setMfgOverhead('700');
    setMfgQualityTesting('250');
    setMfgWastage('200');
    setMfgOtherProduction('100');

    setFormSellingPrice('13500');
    setFormTaxRate('18');
    setFormIsTaxInclusive(false);
    setFormInputTaxRecoverable(true);
    setFormEstimatedVolume('100');

    setAddModalOpen(true);
  };

  // -------------------------------------------------------------
  // SAVE / SUBMIT EDIT
  // -------------------------------------------------------------
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const sellPrice = parseFloat(formSellingPrice) || editingProduct.standardSellingPrice;
    const actualCost = formCalculatedActualCost;
    const supObj = suppliers.find((s) => s.id === formSupplierId);
    const taxRate = parseFloat(formTaxRate) || 18;
    const estVol = parseFloat(formEstimatedVolume) || 100;

    let supplierBreakdown: SupplierCostBreakdown | undefined = undefined;
    let manufacturingBreakdown: ManufacturingCostBreakdown | undefined = undefined;

    if (formSource === 'supplier_sourced') {
      supplierBreakdown = {
        purchasePrice: parseFloat(supPurchasePrice) || 0,
        freightTransportation: parseFloat(supFreight) || 0,
        loadingUnloading: parseFloat(supLoadingUnloading) || 0,
        handlingCharges: parseFloat(supHandling) || 0,
        packagingCost: parseFloat(supPackaging) || 0,
        otherAcquisitionCosts: parseFloat(supOtherAcquisition) || 0,
      };
    } else {
      manufacturingBreakdown = {
        rawMaterialCost: parseFloat(mfgRawMaterial) || 0,
        directLaborCost: parseFloat(mfgDirectLabor) || 0,
        packagingCost: parseFloat(mfgPackaging) || 0,
        manufacturingOverhead: parseFloat(mfgOverhead) || 0,
        qualityTestingCost: parseFloat(mfgQualityTesting) || 0,
        wastageScrapCost: parseFloat(mfgWastage) || 0,
        otherProductionCosts: parseFloat(mfgOtherProduction) || 0,
      };
    }

    // Preserve POS floor price compatibility
    const minAllowed = editingProduct.minAllowedPrice || Math.round(sellPrice * 0.90);
    const maxDisc = editingProduct.defaultMaxDiscountPercent || 10;
    const dealerPrice = Math.round(sellPrice * 0.92);

    updatePricePolicy(editingProduct.id, sellPrice, minAllowed, maxDisc);
    updateProduct(editingProduct.id, {
      actualCost,
      actualLandedCost: actualCost,
      standardPurchaseCost: formSource === 'supplier_sourced' ? supplierBreakdown?.purchasePrice : Math.round(actualCost * 0.92),
      manufacturingCost: formSource === 'self_manufactured' ? actualCost : undefined,
      dealerPrice,
      productSource: formSource,
      supplierId: formSource === 'supplier_sourced' ? formSupplierId : undefined,
      supplierName: formSource === 'supplier_sourced' ? (supObj?.name || editingProduct.supplierName) : undefined,
      manufacturingFacility: formSource === 'self_manufactured' ? formManufacturingFacility : undefined,
      supplierCostBreakdown: supplierBreakdown,
      manufacturingCostBreakdown: manufacturingBreakdown,
      isTaxInclusive: formIsTaxInclusive,
      inputTaxRecoverable: formInputTaxRecoverable,
      taxRatePercent: taxRate,
      estimatedMonthlySalesVolume: estVol,
      hsnCode: formHsn,
      unit: formSalesUnit,
      salesUnit: formSalesUnit,
      purchaseUnit: formPurchaseUnit,
      conversionFactor: parseFloat(formConversionFactor) || 1,
    });

    setEditModalOpen(false);
    triggerToast(`Costing & selling price updated for ${editingProduct.name}.`);

    // If drawer is open with this product, refresh drawer view
    if (drawerProduct && drawerProduct.id === editingProduct.id) {
      setDrawerProduct({
        ...drawerProduct,
        actualCost,
        actualLandedCost: actualCost,
        standardSellingPrice: sellPrice,
        productSource: formSource,
        supplierCostBreakdown: supplierBreakdown,
        manufacturingCostBreakdown: manufacturingBreakdown,
        isTaxInclusive: formIsTaxInclusive,
        inputTaxRecoverable: formInputTaxRecoverable,
        taxRatePercent: taxRate,
        estimatedMonthlySalesVolume: estVol,
      });
    }
  };

  // -------------------------------------------------------------
  // SAVE / SUBMIT NEW PRODUCT
  // -------------------------------------------------------------
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSku || !formName) return;

    const catObj = categories.find((c) => c.id === formCategory);
    const supObj = suppliers.find((s) => s.id === formSupplierId);
    const sellPrice = parseFloat(formSellingPrice) || 10000;
    const actualCost = formCalculatedActualCost;
    const taxRate = parseFloat(formTaxRate) || 18;
    const estVol = parseFloat(formEstimatedVolume) || 100;

    let supplierBreakdown: SupplierCostBreakdown | undefined = undefined;
    let manufacturingBreakdown: ManufacturingCostBreakdown | undefined = undefined;

    if (formSource === 'supplier_sourced') {
      supplierBreakdown = {
        purchasePrice: parseFloat(supPurchasePrice) || 0,
        freightTransportation: parseFloat(supFreight) || 0,
        loadingUnloading: parseFloat(supLoadingUnloading) || 0,
        handlingCharges: parseFloat(supHandling) || 0,
        packagingCost: parseFloat(supPackaging) || 0,
        otherAcquisitionCosts: parseFloat(supOtherAcquisition) || 0,
      };
    } else {
      manufacturingBreakdown = {
        rawMaterialCost: parseFloat(mfgRawMaterial) || 0,
        directLaborCost: parseFloat(mfgDirectLabor) || 0,
        packagingCost: parseFloat(mfgPackaging) || 0,
        manufacturingOverhead: parseFloat(mfgOverhead) || 0,
        qualityTestingCost: parseFloat(mfgQualityTesting) || 0,
        wastageScrapCost: parseFloat(mfgWastage) || 0,
        otherProductionCosts: parseFloat(mfgOtherProduction) || 0,
      };
    }

    addProduct({
      sku: formSku.toUpperCase(),
      name: formName,
      categoryId: formCategory,
      categoryName: catObj?.name || 'Industrial Chemicals',
      productSource: formSource,
      supplierId: formSource === 'supplier_sourced' ? formSupplierId : undefined,
      supplierName: formSource === 'supplier_sourced' ? (supObj?.name || 'Authorized Supplier') : undefined,
      manufacturingFacility: formSource === 'self_manufactured' ? formManufacturingFacility : undefined,
      unit: formSalesUnit,
      salesUnit: formSalesUnit,
      purchaseUnit: formPurchaseUnit,
      conversionFactor: parseFloat(formConversionFactor) || 1,
      description: formDescription || 'Standard commercial formulation item.',
      minOrderQuantity: 1,
      lowStockThreshold: 15,
      actualCost,
      actualLandedCost: actualCost,
      standardPurchaseCost: formSource === 'supplier_sourced' ? supplierBreakdown?.purchasePrice : Math.round(actualCost * 0.90),
      manufacturingCost: formSource === 'self_manufactured' ? actualCost : undefined,
      standardSellingPrice: sellPrice,
      dealerPrice: Math.round(sellPrice * 0.92),
      minAllowedPrice: Math.round(sellPrice * 0.90),
      defaultMaxDiscountPercent: 10,
      hsnCode: formHsn,
      taxRatePercent: taxRate,
      supplierCostBreakdown: supplierBreakdown,
      manufacturingCostBreakdown: manufacturingBreakdown,
      isTaxInclusive: formIsTaxInclusive,
      inputTaxRecoverable: formInputTaxRecoverable,
      estimatedMonthlySalesVolume: estVol,
    });

    setAddModalOpen(false);
    triggerToast(`Created product SKU ${formSku.toUpperCase()} with itemized cost model.`);
  };

  // -------------------------------------------------------------
  // KPI CALCULATIONS
  // -------------------------------------------------------------
  const supplierSourcedCount = products.filter(
    (p) => p.productSource === 'supplier_sourced' || (!p.productSource && !!p.supplierId)
  ).length;

  const selfManufacturedCount = products.filter(
    (p) => p.productSource === 'self_manufactured' || (!p.productSource && !p.supplierId)
  ).length;

  const totalActualCostSum = products.reduce((acc, p) => acc + (p.actualCost || p.actualLandedCost || 0), 0);
  const avgActualCost = products.length > 0 ? totalActualCostSum / products.length : 0;

  const totalSellingPriceSum = products.reduce((acc, p) => acc + (p.standardSellingPrice || 0), 0);
  const avgSellingPrice = products.length > 0 ? totalSellingPriceSum / products.length : 0;

  const totalEstimatedMonthlyProfit = products.reduce((acc, p) => {
    const m = calculateProductMetrics(p);
    return acc + m.estimatedMonthlyProfit;
  }, 0);

  const totalEstimatedMonthlyUnits = products.reduce(
    (acc, p) => acc + (p.estimatedMonthlySalesVolume || 100),
    0
  );

  // -------------------------------------------------------------
  // FILTERING & SORTING
  // -------------------------------------------------------------
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.supplierName && p.supplierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (p.manufacturingFacility && p.manufacturingFacility.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;

        const isSupplier = p.productSource === 'supplier_sourced' || (!p.productSource && !!p.supplierId);
        const isSelfMfg = p.productSource === 'self_manufactured' || (!p.productSource && !p.supplierId);

        const matchesSource =
          selectedSourceFilter === 'all' ||
          (selectedSourceFilter === 'supplier_sourced' && isSupplier) ||
          (selectedSourceFilter === 'self_manufactured' && isSelfMfg);

        return matchesSearch && matchesCat && matchesSource;
      })
      .sort((a, b) => {
        const costA = a.actualCost || a.actualLandedCost || 0;
        const costB = b.actualCost || b.actualLandedCost || 0;
        const priceA = a.standardSellingPrice || 0;
        const priceB = b.standardSellingPrice || 0;
        const marginA = priceA > 0 ? ((priceA - costA) / priceA) * 100 : 0;
        const marginB = priceB > 0 ? ((priceB - costB) / priceB) * 100 : 0;

        if (sortBy === 'sku') return a.sku.localeCompare(b.sku);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'cost_asc') return costA - costB;
        if (sortBy === 'cost_desc') return costB - costA;
        if (sortBy === 'price_desc') return priceB - priceA;
        if (sortBy === 'margin_desc') return marginB - marginA;
        return 0;
      });
  }, [products, searchTerm, selectedCategory, selectedSourceFilter, sortBy]);

  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-semibold animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            Product Costing &amp; Selling Price
            <Badge variant="purple" size="sm">Admin Pricing Engine</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Configure acquisition and production cost breakdowns, calculate landed unit costs, manage Admin-controlled selling prices, and monitor commercial profit margins.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Product Costing
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Products
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {products.length}
            </div>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
              {supplierSourcedCount} Sourced • {selfManufacturedCount} Manufactured
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* Average Actual Cost */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Avg Actual Cost
            </span>
            <div className="text-2xl font-black text-rose-700 mt-1 font-mono">
              ₹{Math.round(avgActualCost).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
              Per unit landed / mfg cost
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <Calculator className="w-5 h-5" />
          </div>
        </div>

        {/* Average Selling Price */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Avg Selling Price
            </span>
            <div className="text-2xl font-black text-indigo-700 mt-1 font-mono">
              ₹{Math.round(avgSellingPrice).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-indigo-600 font-semibold mt-0.5 block">
              Approved catalog base price
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        {/* Total Estimated Profit */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between relative overflow-hidden group">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Est. Profit
              </span>
              <span
                className="text-[10px] text-slate-400 hover:text-slate-600 cursor-help"
                title="Estimated gross profit simulation based on standard catalog sales velocity assumption. Not realized accounting profit."
              >
                <HelpCircle className="w-3 h-3" />
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">
              ₹{Math.round(totalEstimatedMonthlyProfit).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block truncate max-w-[150px]" title="Standard velocity assumption: ~100 units/mo per SKU. Not realized accounting profit.">
              Est. Monthly • ~{totalEstimatedMonthlyUnits} units
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Accounting Disclaimer Alert Note */}
      <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-slate-600 text-[11px] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>
            <strong>Costing Architecture:</strong> Actual costs reflect itemized inbound acquisition or production overheads. Recoverable Input GST (ITC) is excluded from product cost by default. Total Estimated Profit is a forward velocity projection, not realized accounting net income.
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-slate-400 text-[10px] font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Admin Cost Confidentiality Active</span>
        </div>
      </div>

      {/* Filter and Origin Classification Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by SKU, Product Name, Category, Supplier or Plant..."
        />

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Sourcing Origin Filter Pills */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl text-xs shadow-xs">
            <button
              type="button"
              onClick={() => setSelectedSourceFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                selectedSourceFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSourceFilter('supplier_sourced')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                selectedSourceFilter === 'supplier_sourced'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              <Truck className="w-3 h-3" /> Sourced ({supplierSourcedCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSourceFilter('self_manufactured')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                selectedSourceFilter === 'self_manufactured'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <Factory className="w-3 h-3" /> Manufactured ({selfManufacturedCount})
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="glass-input rounded-xl px-3 py-1.5 text-xs text-slate-800 bg-white cursor-pointer border border-slate-200"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="glass-input rounded-xl px-3 py-1.5 text-xs text-slate-800 bg-white cursor-pointer border border-slate-200 font-semibold"
            >
              <option value="sku">Sort by SKU</option>
              <option value="name">Sort by Name</option>
              <option value="cost_desc">Actual Cost: High to Low</option>
              <option value="cost_asc">Actual Cost: Low to High</option>
              <option value="price_desc">Selling Price: High to Low</option>
              <option value="margin_desc">Profit Margin %: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* REDESIGNED PRODUCT COSTING & SELLING PRICE TABLE */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Product Costing &amp; Profitability Master ({filteredProducts.length})</CardTitle>
            <CardDescription>
              Primary columns focus on itemized product cost, Admin selling price, and profit margin analysis. Floor price &amp; discount columns simplified.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-semibold bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">
            <Lock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Admin-Only Margins</span>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/70">
                <th className="py-3 px-3.5">SKU / Code</th>
                <th className="py-3 px-3.5">Product Name &amp; Details</th>
                <th className="py-3 px-3.5">Sourcing Origin</th>
                <th className="py-3 px-3.5 text-rose-700 bg-rose-50/70">Actual Cost / Unit</th>
                <th className="py-3 px-3.5 text-indigo-700 bg-indigo-50/70">Selling Price / Unit</th>
                <th className="py-3 px-3.5 text-emerald-800 bg-emerald-50/70">Profit / Unit</th>
                <th className="py-3 px-3.5">Profit Margin</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {paginatedProducts.map((p) => {
                const metrics = calculateProductMetrics(p);
                const isSupplier = p.productSource === 'supplier_sourced' || (!p.productSource && !!p.supplierId);

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* 1. SKU & Product ID */}
                    <td className="py-3.5 px-3.5 font-mono">
                      <div className="font-bold text-slate-900">{p.sku}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {p.id}</div>
                    </td>

                    {/* 2. Product Name, Category & UOM */}
                    <td className="py-3.5 px-3.5">
                      <div className="font-bold text-slate-900 text-xs">{p.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-slate-700">{p.categoryName}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                          UOM: {p.unit}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">HSN: {p.hsnCode}</span>
                      </div>
                    </td>

                    {/* 3. Sourcing Origin */}
                    <td className="py-3.5 px-3.5">
                      {isSupplier ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Truck className="w-2.5 h-2.5" /> Supplier-Sourced
                          </span>
                          <span
                            className="block text-[11px] font-semibold text-slate-800 truncate max-w-[180px]"
                            title={p.supplierName || 'Authorized Vendor'}
                          >
                            {p.supplierName || 'Authorized Vendor'}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Factory className="w-2.5 h-2.5" /> Self-Manufactured
                          </span>
                          <span
                            className="block text-[11px] font-semibold text-slate-800 truncate max-w-[180px]"
                            title={p.manufacturingFacility || 'ApexFlow Plant 1'}
                          >
                            {p.manufacturingFacility || 'ApexFlow Plant 1'}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* 4. Actual Cost per Unit */}
                    <td className="py-3.5 px-3.5 font-mono bg-rose-50/40">
                      <div className="font-bold text-rose-700 text-xs">
                        ₹{metrics.actualCost.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        {isSupplier ? (
                          <span>Base: ₹{(p.standardPurchaseCost || Math.round(metrics.actualCost * 0.9)).toLocaleString('en-IN')}</span>
                        ) : (
                          <span>Overheads incl.</span>
                        )}
                        <span>•</span>
                        <span className="text-emerald-700 font-semibold">ITC OK</span>
                      </div>
                    </td>

                    {/* 5. Selling Price per Unit */}
                    <td className="py-3.5 px-3.5 font-mono bg-indigo-50/40">
                      <div className="font-bold text-indigo-700 text-xs">
                        ₹{metrics.sellingPrice.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <span className={`px-1 rounded text-[9px] font-bold uppercase ${metrics.isTaxInclusive ? 'bg-amber-100 text-amber-800' : 'bg-slate-200/80 text-slate-700'}`}>
                          {metrics.isTaxInclusive ? 'Tax-Incl.' : 'Tax-Excl.'}
                        </span>
                        <span>+{metrics.taxRate}% GST</span>
                      </div>
                    </td>

                    {/* 6. Profit per Unit */}
                    <td className="py-3.5 px-3.5 font-mono bg-emerald-50/40">
                      <div className={`font-bold text-xs ${metrics.profitPerUnit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        ₹{metrics.profitPerUnit.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        +{metrics.markupPercent.toFixed(0)}% markup
                      </div>
                    </td>

                    {/* 7. Profit Margin % */}
                    <td className="py-3.5 px-3.5 font-mono">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                          metrics.profitMargin >= 30
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : metrics.profitMargin >= 20
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : metrics.profitMargin >= 10
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        <Percent className="w-3 h-3" />
                        {metrics.profitMargin.toFixed(1)}%
                      </span>
                    </td>

                    {/* 8. Actions */}
                    <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDrawerProduct(p)}
                          icon={<Eye className="w-3.5 h-3.5 text-slate-500" />}
                          title="View Itemized Cost Waterfall & Margins"
                        >
                          Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(p)}
                          icon={<Edit2 className="w-3.5 h-3.5 text-indigo-600" />}
                          title="Edit Costing & Price"
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length > pageSize && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/40">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredProducts.length / pageSize)}
              totalItems={filteredProducts.length}
              itemsPerPage={pageSize}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* PRODUCT COSTING DETAILS DRAWER / INSPECTION MODAL */}
      {/* ------------------------------------------------------------- */}
      {drawerProduct && (
        <Modal
          isOpen={true}
          onClose={() => setDrawerProduct(null)}
          title={`Costing & Margin Analysis: ${drawerProduct.name}`}
          description={`SKU: ${drawerProduct.sku} | Product ID: ${drawerProduct.id} | Category: ${drawerProduct.categoryName}`}
          maxWidth="2xl"
        >
          {(() => {
            const metrics = calculateProductMetrics(drawerProduct);
            const isSup = drawerProduct.productSource === 'supplier_sourced' || (!drawerProduct.productSource && !!drawerProduct.supplierId);
            const supBreakdown = getSupplierBreakdown(drawerProduct);
            const mfgBreakdown = getManufacturingBreakdown(drawerProduct);

            return (
              <div className="space-y-4 text-xs">
                {/* Identity & Origin Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md font-mono">
                        {drawerProduct.sku.slice(0, 3)}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900">{drawerProduct.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] text-slate-600 font-semibold">SKU: {drawerProduct.sku}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600 font-medium">UOM: {drawerProduct.unit}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600 font-mono">HSN: {drawerProduct.hsnCode}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSup ? (
                        <Badge variant="primary">
                          <Truck className="w-3 h-3 mr-1" /> Supplier-Sourced
                        </Badge>
                      ) : (
                        <Badge variant="success">
                          <Factory className="w-3 h-3 mr-1" /> Self-Manufactured
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const curr = drawerProduct;
                          setDrawerProduct(null);
                          handleOpenEdit(curr);
                        }}
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        Edit Costing
                      </Button>
                    </div>
                  </div>

                  {/* Sourcing Location info */}
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">
                      {isSup ? 'Contracted Supplier / Manufacturer:' : 'Company Production Facility:'}
                    </span>
                    <span className="font-bold text-slate-800">
                      {isSup
                        ? drawerProduct.supplierName || 'Authorized Sourcing Vendor'
                        : drawerProduct.manufacturingFacility || 'ApexFlow Plant 1 (Greater Noida)'}
                    </span>
                  </div>
                </div>

                {/* KPI Triad: Cost, Price & Margin */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40">
                    <span className="text-rose-700 text-[10px] font-bold uppercase tracking-wider block">
                      Actual Cost per Unit
                    </span>
                    <span className="text-xl font-black font-mono text-rose-800 mt-1 block">
                      ₹{metrics.actualCost.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Fully allocated unit cost
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40">
                    <span className="text-indigo-700 text-[10px] font-bold uppercase tracking-wider block">
                      Selling Price per Unit
                    </span>
                    <span className="text-xl font-black font-mono text-indigo-800 mt-1 block">
                      ₹{metrics.sellingPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {metrics.isTaxInclusive ? 'Includes 18% GST' : '+18% GST Exclusive'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40">
                    <span className="text-emerald-700 text-[10px] font-bold uppercase tracking-wider block">
                      Profit &amp; Margin
                    </span>
                    <span className="text-xl font-black font-mono text-emerald-800 mt-1 block">
                      +{metrics.profitMargin.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
                      ₹{metrics.profitPerUnit.toLocaleString('en-IN')} / {drawerProduct.unit}
                    </span>
                  </div>
                </div>

                {/* Itemized Cost Breakdown Waterfall Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                      Itemized Cost Component Breakdown
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Calculated on 1 {drawerProduct.unit} Basis
                    </span>
                  </div>

                  {isSup ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600 font-medium">1. Supplier Purchase Price (Invoice Base):</span>
                        <span className="font-mono font-bold text-slate-900">₹{supBreakdown.purchasePrice.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-50">
                        <span className="text-slate-600 font-medium">2. Freight &amp; Inbound Transportation:</span>
                        <span className="font-mono font-bold text-slate-900">₹{supBreakdown.freightTransportation.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-50">
                        <span className="text-slate-600 font-medium">3. Loading &amp; Unloading (Hamali):</span>
                        <span className="font-mono font-bold text-slate-900">₹{supBreakdown.loadingUnloading.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-50">
                        <span className="text-slate-600 font-medium">4. Warehousing Handling Charges:</span>
                        <span className="font-mono font-bold text-slate-900">₹{supBreakdown.handlingCharges.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-50">
                        <span className="text-slate-600 font-medium">5. Secondary Packaging &amp; Palletizing:</span>
                        <span className="font-mono font-bold text-slate-900">₹{supBreakdown.packagingCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-50">
                        <span className="text-slate-600 font-medium">6. Other Applicable Acquisition Charges:</span>
                        <span className="font-mono font-bold text-slate-900">₹{supBreakdown.otherAcquisitionCosts.toLocaleString('en-IN')}</span>
                      </div>

                      <div className="pt-2 border-t-2 border-slate-200 flex justify-between items-center text-rose-800 font-black">
                        <span>Total Actual Landed Cost per Unit:</span>
                        <span className="font-mono text-sm">₹{metrics.actualCost.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600 font-medium">1. Raw Material &amp; Active Ingredients:</span>
                        <span className="font-mono font-bold text-slate-900">₹{mfgBreakdown.rawMaterialCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-50">
                        <span className="text-slate-600 font-medium">2. Direct Labour &amp; Manpower:</span>
                        <span className="font-mono font-bold text-slate-900">₹{mfgBreakdown.directLaborCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-50">
                        <span className="text-slate-600 font-medium">3. Primary &amp; Secondary Packaging:</span>
                        <span className="font-mono font-bold text-slate-900">₹{mfgBreakdown.packagingCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-50">
                        <span className="text-slate-600 font-medium">4. Manufacturing Overhead (Electricity/Depr.):</span>
                        <span className="font-mono font-bold text-slate-900">₹{mfgBreakdown.manufacturingOverhead.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-50">
                        <span className="text-slate-600 font-medium">5. Quality Testing &amp; QA/QC Lab Certification:</span>
                        <span className="font-mono font-bold text-slate-900">₹{mfgBreakdown.qualityTestingCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-50">
                        <span className="text-slate-600 font-medium">6. Wastage &amp; Reaction Scrap Factor:</span>
                        <span className="font-mono font-bold text-slate-900">₹{mfgBreakdown.wastageScrapCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-50">
                        <span className="text-slate-600 font-medium">7. Other Applicable Production Charges:</span>
                        <span className="font-mono font-bold text-slate-900">₹{mfgBreakdown.otherProductionCosts.toLocaleString('en-IN')}</span>
                      </div>

                      <div className="pt-2 border-t-2 border-slate-200 flex justify-between items-center text-rose-800 font-black">
                        <span>Total Actual Manufacturing Cost per Unit:</span>
                        <span className="font-mono text-sm">₹{metrics.actualCost.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tax Treatment & Customer Invoice Price */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                  <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    Tax Treatment &amp; Customer Billed Pricing
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Base Selling Price</span>
                      <span className="font-bold font-mono text-slate-900">₹{Math.round(metrics.basePrice).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">GST Rate</span>
                      <span className="font-bold font-mono text-indigo-700">{metrics.taxRate}% GST</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Tax Amount / Unit</span>
                      <span className="font-bold font-mono text-slate-900">₹{Math.round(metrics.taxAmount).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer Billed Price</span>
                      <span className="font-bold font-mono text-emerald-800">₹{Math.round(metrics.customerBilledPrice).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 pt-1">
                    * Input Tax Treatment: <strong>Input GST is 100% recoverable as Input Tax Credit (ITC)</strong> and is not capitalized into product actual cost.
                  </div>
                </div>

                {/* Commercial Sales Projections */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 block text-xs flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                      Projected Commercial Profit Simulation
                    </span>
                    <Badge variant="success">Standard Sales Velocity</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1 text-[11px]">
                    <div>
                      <span className="text-slate-600 block">Standard Monthly Sales Velocity:</span>
                      <span className="font-bold font-mono text-slate-900">{metrics.monthlyVolume} {drawerProduct.unit} / Month</span>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Estimated Monthly Gross Profit:</span>
                      <span className="font-bold font-mono text-emerald-800 text-sm">
                        ₹{Math.round(metrics.estimatedMonthlyProfit).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 italic mt-1">
                    Disclaimer: This figure represents a simulated commercial baseline model based on standard velocity assumptions. It does not reflect realized historical accounting profit or balance sheet retained earnings.
                  </p>
                </div>

                {/* Footer Action */}
                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => setDrawerProduct(null)}>
                    Close Details
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ADD / EDIT PRODUCT COSTING MODAL */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={addModalOpen || editModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setEditModalOpen(false);
        }}
        title={editingProduct ? `Edit Costing & Pricing: ${editingProduct.name}` : 'Add New Product & Costing Model'}
        description="Allocate itemized inbound acquisition or production overhead components and configure Admin-approved selling price."
        maxWidth="2xl"
      >
        <form onSubmit={editingProduct ? handleSaveEdit : handleSaveAdd} className="space-y-4 text-xs">
          {/* Sourcing classification toggle */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
            <span className="font-bold text-slate-900 block text-xs">1. Select Sourcing Classification *</span>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                  formSource === 'supplier_sourced'
                    ? 'border-blue-400 bg-blue-50/70 text-blue-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="productCostingSource"
                  checked={formSource === 'supplier_sourced'}
                  onChange={() => setFormSource('supplier_sourced')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Supplier-Sourced</span>
              </label>

              <label
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                  formSource === 'self_manufactured'
                    ? 'border-emerald-400 bg-emerald-50/70 text-emerald-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="productCostingSource"
                  checked={formSource === 'self_manufactured'}
                  onChange={() => setFormSource('self_manufactured')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <Factory className="w-4 h-4 text-emerald-600" />
                <span>Company-Manufactured</span>
              </label>
            </div>

            {formSource === 'supplier_sourced' ? (
              <Select
                label="Contracted Supplier Vendor *"
                value={formSupplierId}
                onChange={(e) => setFormSupplierId(e.target.value)}
                options={suppliers.map((s) => ({ label: `${s.name} (${s.code})`, value: s.id }))}
              />
            ) : (
              <Input
                label="Manufacturing Facility / Plant Location *"
                placeholder="e.g. ApexFlow Greater Noida Plant 1"
                value={formManufacturingFacility}
                onChange={(e) => setFormManufacturingFacility(e.target.value)}
              />
            )}
          </div>

          {/* Product Identification Specs */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3">
            <span className="font-bold text-slate-900 block text-xs">2. Product Identification &amp; UOM Specs</span>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Product SKU *"
                placeholder="e.g. PRM-SYN-300"
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                required
              />
              <Select
                label="Category *"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                options={categories.map((c) => ({ label: c.name, value: c.id }))}
              />
            </div>

            <Input
              label="Product Full Name *"
              placeholder="e.g. Synthetic Enamel Finish Fast-Dry"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Sales UOM *"
                placeholder="e.g. Drums (200L)"
                value={formSalesUnit}
                onChange={(e) => setFormSalesUnit(e.target.value)}
                required
              />
              <Input
                label="Purchase UOM *"
                placeholder="e.g. Drums, KL, Bags"
                value={formPurchaseUnit}
                onChange={(e) => setFormPurchaseUnit(e.target.value)}
                required
              />
              <Input
                label="HSN Code"
                placeholder="e.g. 32089019"
                value={formHsn}
                onChange={(e) => setFormHsn(e.target.value)}
              />
            </div>
          </div>

          {/* Dynamic Itemized Cost Components */}
          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-900 block text-xs flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-rose-700" />
                3. Itemized Cost Components ({formSource === 'supplier_sourced' ? 'Supplier Sourced' : 'Company Manufactured'})
              </span>
              {formSource === 'supplier_sourced' && (
                <button
                  type="button"
                  onClick={() => setShowBatchAllocation(!showBatchAllocation)}
                  className="text-[10px] text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  {showBatchAllocation ? 'Hide Batch Helper' : 'Shared Batch Allocation Helper'}
                </button>
              )}
            </div>

            {/* Shared Consignment Freight Allocation Helper */}
            {formSource === 'supplier_sourced' && showBatchAllocation && (
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                <div className="text-[11px] font-bold text-indigo-900">
                  Allocate Shared Consignment Expenses (Per-Unit Calculation)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Total Consignment Transit Expense (₹)"
                    type="number"
                    value={batchTotalFreight}
                    onChange={(e) => setBatchTotalFreight(e.target.value)}
                  />
                  <Input
                    label="Consignment Unit Quantity"
                    type="number"
                    value={batchConsignmentQty}
                    onChange={(e) => setBatchConsignmentQty(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="button" size="sm" variant="outline" onClick={handleApplyBatchAllocation}>
                    Apply Per-Unit Freight (₹{batchConsignmentQty ? Math.round((parseFloat(batchTotalFreight) || 0) / (parseFloat(batchConsignmentQty) || 1)) : 0})
                  </Button>
                </div>
              </div>
            )}

            {formSource === 'supplier_sourced' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Input
                  label="Purchase Price (₹) *"
                  type="number"
                  value={supPurchasePrice}
                  onChange={(e) => setSupPurchasePrice(e.target.value)}
                  required
                />
                <Input
                  label="Freight & Transportation (₹)"
                  type="number"
                  value={supFreight}
                  onChange={(e) => setSupFreight(e.target.value)}
                />
                <Input
                  label="Loading & Unloading (Hamali) (₹)"
                  type="number"
                  value={supLoadingUnloading}
                  onChange={(e) => setSupLoadingUnloading(e.target.value)}
                />
                <Input
                  label="Handling Charges (₹)"
                  type="number"
                  value={supHandling}
                  onChange={(e) => setSupHandling(e.target.value)}
                />
                <Input
                  label="Packaging Cost (₹)"
                  type="number"
                  value={supPackaging}
                  onChange={(e) => setSupPackaging(e.target.value)}
                />
                <Input
                  label="Other Acquisition Costs (₹)"
                  type="number"
                  value={supOtherAcquisition}
                  onChange={(e) => setSupOtherAcquisition(e.target.value)}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Input
                  label="Raw Material Cost (₹) *"
                  type="number"
                  value={mfgRawMaterial}
                  onChange={(e) => setMfgRawMaterial(e.target.value)}
                  required
                />
                <Input
                  label="Direct Labour & Manpower (₹)"
                  type="number"
                  value={mfgDirectLabor}
                  onChange={(e) => setMfgDirectLabor(e.target.value)}
                />
                <Input
                  label="Packaging & Labeling (₹)"
                  type="number"
                  value={mfgPackaging}
                  onChange={(e) => setMfgPackaging(e.target.value)}
                />
                <Input
                  label="Mfg Overhead (Power/Maint.) (₹)"
                  type="number"
                  value={mfgOverhead}
                  onChange={(e) => setMfgOverhead(e.target.value)}
                />
                <Input
                  label="Quality Testing & QC Lab (₹)"
                  type="number"
                  value={mfgQualityTesting}
                  onChange={(e) => setMfgQualityTesting(e.target.value)}
                />
                <Input
                  label="Wastage & Scrap Factor (₹)"
                  type="number"
                  value={mfgWastage}
                  onChange={(e) => setMfgWastage(e.target.value)}
                />
                <Input
                  label="Other Production Charges (₹)"
                  type="number"
                  value={mfgOtherProduction}
                  onChange={(e) => setMfgOtherProduction(e.target.value)}
                />
              </div>
            )}

            {/* Live Calculated Actual Cost Banner */}
            <div className="p-3 rounded-xl bg-white border border-rose-300 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Automatically Calculated Actual Cost / Unit
                </span>
                <span className="text-lg font-black font-mono text-rose-700">
                  ₹{formCalculatedActualCost.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right text-[10px] text-slate-500">
                Sum of all components. Input GST recoverable excluded.
              </div>
            </div>
          </div>

          {/* Admin Selling Price, Tax & Margin Live Preview */}
          <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/20 space-y-3">
            <span className="font-bold text-indigo-900 block text-xs flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-700" />
              4. Selling Price &amp; Tax Configuration
            </span>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Admin Base Selling Price (₹) *"
                type="number"
                value={formSellingPrice}
                onChange={(e) => setFormSellingPrice(e.target.value)}
                required
              />
              <Input
                label="GST Tax Rate (%) *"
                type="number"
                value={formTaxRate}
                onChange={(e) => setFormTaxRate(e.target.value)}
                required
              />
            </div>

            {/* Tax Treatment Radio Toggles */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <label
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors text-[11px] ${
                  !formIsTaxInclusive
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="taxInclusiveToggle"
                  checked={!formIsTaxInclusive}
                  onChange={() => setFormIsTaxInclusive(false)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span>Tax-Exclusive (GST added to price)</span>
              </label>

              <label
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors text-[11px] ${
                  formIsTaxInclusive
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="taxInclusiveToggle"
                  checked={formIsTaxInclusive}
                  onChange={() => setFormIsTaxInclusive(true)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span>Tax-Inclusive (Price includes GST)</span>
              </label>
            </div>

            {/* Profit & Margin Live Preview */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Profit / Unit</span>
                <span className={`font-mono font-bold text-sm ${formProfitPerUnit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  ₹{formProfitPerUnit.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Profit Margin</span>
                <span className={`font-mono font-bold text-sm ${formProfitMargin >= 20 ? 'text-emerald-700' : formProfitMargin >= 10 ? 'text-amber-700' : 'text-rose-600'}`}>
                  {formProfitMargin.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer Billed</span>
                <span className="font-mono font-bold text-sm text-indigo-800">
                  ₹{Math.round(formFinalCustomerPrice).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                setAddModalOpen(false);
                setEditModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {editingProduct ? 'Save Costing & Price' : 'Create Product in Catalog'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
