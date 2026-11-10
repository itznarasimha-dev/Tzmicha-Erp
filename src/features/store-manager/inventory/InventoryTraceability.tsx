// ============================================================
// INVENTORY & TRACEABILITY — MAIN WORKSPACE
// Route: /store-manager/inventory
// ============================================================

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, RefreshCw, WifiOff, AlertTriangle, Home, ChevronRight, Warehouse } from 'lucide-react';
import { format } from 'date-fns';
import type { InventoryTab, InventoryFilters } from './types';
import { useInventoryData } from './hooks/useInventoryData';
import { InventorySummaryCards } from './components/InventorySummaryCards';
import { ProductDetailsDrawer } from './components/ProductDetailsDrawer';
import { StockOverviewTab } from './tabs/StockOverviewTab';
import { ProductTraceabilityTab } from './tabs/ProductTraceabilityTab';
import { BarcodeLookupTab } from './tabs/BarcodeLookupTab';
import { MovementHistoryTab } from './tabs/MovementHistoryTab';
import { StockAlertsTab } from './tabs/StockAlertsTab';

interface InventoryTraceabilityProps {
  onMobileMenuOpen: () => void;
}

export function InventoryTraceability({ onMobileMenuOpen }: InventoryTraceabilityProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<InventoryTab>('stock');
  const [filters, setFilters] = useState<InventoryFilters>({
    warehouseId: 'ALL',
    search: '',
    category: 'ALL',
    stockStatus: 'ALL',
    trackingType: 'ALL',
    lowStock: false,
    nearExpiry: false,
    onHold: false,
    dateFrom: '',
    dateTo: '',
  });

  const { data, isLoading, isRefreshing, error, refresh } = useInventoryData(filters.warehouseId);

  const fmtTime = (iso: string) => {
    try { return format(new Date(iso), 'HH:mm'); } catch { return iso; }
  };

  // ----- Product drawer handling -----
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const openProductDrawer = useCallback((productCode: string) => setSelectedProduct(productCode), []);
  const closeProductDrawer = useCallback(() => setSelectedProduct(null), []);

  // ----- Tab bar configuration -----
  const TAB_CONFIG: { id: InventoryTab; label: string; icon: React.ReactNode }[] = [
    { id: 'stock', label: 'Stock Overview', icon: <Menu size={16} /> },
    { id: 'traceability', label: 'Product Traceability', icon: <AlertTriangle size={16} /> },
    { id: 'barcode', label: 'Barcode / QR Lookup', icon: <AlertTriangle size={16} /> },
    { id: 'movements', label: 'Movement History', icon: <AlertTriangle size={16} /> },
    { id: 'alerts', label: 'Stock Alerts', icon: <AlertTriangle size={16} /> },
  ];

  const handleCardClick = useCallback((tab: InventoryTab) => {
    setActiveTab(tab);
  }, []);

  const selectedRecord = selectedProduct ? data?.records.find((record) => record.productCode === selectedProduct) ?? null : null;

  if (isLoading && !data) {
    // Show skeleton layout while initial data loads
    return (
      <div className="page-enter">
        <div style={{ padding: '20px' }} className="skeleton" />
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      {/* ─── PAGE HEADER & TAB RIBBON ─── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#74d138]/15 text-[#3b7c14] border border-[#74d138]/30">
                Stock Traceability &amp; Genealogy
              </span>
              <span className="text-xs text-slate-400 font-medium">Multi-Depot Serial &amp; Lot Control</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory &amp; Traceability</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Explore real-time depot stock, trace product batches from supplier GRN to customer dispatches, scan barcodes, and audit movements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-1.5 shadow-sm">
              <Warehouse size={15} className="text-slate-500" />
              <select
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-2"
                value={filters.warehouseId}
                onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
                id="inv-warehouse-select"
                aria-label="Select warehouse"
              >
                <option value="ALL">All Warehouses</option>
                <option value="WH-001">Main Production Warehouse</option>
                <option value="WH-002">Finished Goods Store</option>
                <option value="WH-003">Raw Materials Store</option>
              </select>
            </div>

            <button
              onClick={refresh}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200"
              title="Refresh inventory data"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-t border-slate-100 pt-4">
          {TAB_CONFIG.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => { setActiveTab(tab.id); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Page content */}
      <div className="erp-content p-0">
        {/* Error banner */}
        {error && (
          <div className="alert-banner error" role="alert" style={{ marginBottom: '16px' }}>
            <WifiOff size={14} />
            <span>{error}</span>
            <button className="btn btn-ghost" style={{ marginLeft: '8px', padding: '2px 10px', fontSize: '12px' }} onClick={refresh} id="inv-error-retry"><RefreshCw size={11} /> Retry</button>
          </div>
        )}
        {/* Refreshing indicator */}
        {isRefreshing && !isLoading && (
          <div className="alert-banner warning" role="status" style={{ marginBottom: '16px' }}>
            <RefreshCw size={13} className="refresh-spin" /> Refreshing inventory data…
          </div>
        )}
        {/* Summary cards */}
        <InventorySummaryCards metrics={data?.metrics ?? null} isLoading={isLoading} onCardClick={handleCardClick} />
        {/* Tab Panels */}
        <div role="tabpanel" id={`inv-panel-${activeTab}`} aria-labelledby={`inv-tab-${activeTab}`} style={{ background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          {activeTab === 'stock' && (
            <StockOverviewTab
              records={data?.records ?? []}
              isLoading={isLoading}
              onViewDetails={(record) => openProductDrawer(record.productCode)}
            />
          )}
          {activeTab === 'traceability' && (
            <ProductTraceabilityTab
              records={data?.records ?? []}
              movements={data?.movements ?? []}
              isLoading={isLoading}
              onViewDetails={(record) => openProductDrawer(record.productCode)}
            />
          )}
          {activeTab === 'barcode' && (
            <BarcodeLookupTab
              records={data?.records ?? []}
              isLoading={isLoading}
              onViewDetails={(record) => openProductDrawer(record.productCode)}
            />
          )}
          {activeTab === 'movements' && (
            <MovementHistoryTab
              movements={data?.movements ?? []}
              isLoading={isLoading}
            />
          )}
          {activeTab === 'alerts' && (
            <StockAlertsTab
              alerts={data?.alerts ?? []}
              isLoading={isLoading}
              onAcknowledge={(alertId) => console.log('Acknowledge', alertId)}
            />
          )}
        </div>
      </div>

      {/* Product details drawer */}
      {selectedRecord && data && (
        <ProductDetailsDrawer
          record={selectedRecord}
          allRecords={data.records}
          events={[]}
          onClose={closeProductDrawer}
        />
      )}
    </div>
  );
}
