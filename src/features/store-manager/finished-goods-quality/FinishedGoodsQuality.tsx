// ============================================================
// PAGE 5 — FINISHED GOODS & QUALITY WORKSPACE
// ============================================================

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, RefreshCw, WifiOff, Home, ChevronRight, Warehouse } from 'lucide-react';
import { format } from 'date-fns';

import { useFinishedGoodsData } from './hooks/useFinishedGoodsData';
import { FinishedGoodsSummaryCards } from './components/FinishedGoodsSummaryCards';
import { ProductionOutputReceiptsTab } from './tabs/ProductionOutputReceiptsTab';
import { QCStatusQueueTab } from './tabs/QCStatusQueueTab';
import { FinishedGoodsStockTab } from './tabs/FinishedGoodsStockTab';
import { DamagedHeldGoodsTab } from './tabs/DamagedHeldGoodsTab';

interface FinishedGoodsQualityProps {
  onMobileMenuOpen: () => void;
}

const TAB_CONFIG = [
  { id: 'receipts', label: 'Production Output Receipts', emoji: '📦' },
  { id: 'qc',       label: 'QC Status & Inspection Queue', emoji: '🧪' },
  { id: 'stock',    label: 'Finished Goods Stock',         emoji: '🏭' },
  { id: 'exceptions',label: 'Damaged & Held Goods',        emoji: '⚠️' },
];

const WAREHOUSES = [
  { id: 'ALL',     name: 'All Finished Goods Warehouses' },
  { id: 'WH-FG-01', name: 'Main FG Warehouse' },
  { id: 'WH-FG-02', name: 'Satellite FG Store' },
  { id: 'WH-QNT-01', name: 'Central Quarantine' },
];

export function FinishedGoodsQuality({ onMobileMenuOpen }: FinishedGoodsQualityProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('receipts');
  const [tabFilter, setTabFilter] = useState<string | undefined>(undefined);
  const [warehouseId, setWarehouseId] = useState('ALL');
  const [category, setCategory] = useState('All');

  const { metrics, isLoading, error, refresh } = useFinishedGoodsData();

  const handleCardClick = useCallback((tab: string, filter?: string) => {
    setActiveTab(tab);
    setTabFilter(filter);
  }, []);

  return (
    <div className="page-enter space-y-6">
      {/* ─── PAGE HEADER & TAB RIBBON ─── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#74d138]/15 text-[#3b7c14] border border-[#74d138]/30">
                Quality Assurance &amp; QC
              </span>
              <span className="text-xs text-slate-400 font-medium">Finished Stock Clearance Gate</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Finished Goods &amp; Quality</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Receive completed production output, manage warehouse staging, and track quality inspection clearance before goods become available to sell.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              className="bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-1.5 text-xs font-semibold text-slate-800 outline-none cursor-pointer shadow-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="All">All Finished Goods</option>
              <option value="Manufactured">Manufactured Finished Goods</option>
              <option value="Purchased">Purchased Goods for Resale</option>
              <option value="Returned">Returned Finished Goods</option>
            </select>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-1.5 shadow-sm">
              <Warehouse size={15} className="text-slate-500" />
              <select
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-2"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
              >
                {WAREHOUSES.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={refresh}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200"
              title="Refresh quality status"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
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
                onClick={() => { setActiveTab(tab.id); setTabFilter(undefined); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="erp-content p-0">
        {error && (
          <div className="alert-banner error" role="alert" style={{ marginBottom: '16px' }}>
            <WifiOff size={14} />
            <span>{error}</span>
            <button className="btn btn-ghost" style={{ marginLeft: '8px', padding: '2px 10px', fontSize: '12px' }} onClick={refresh}>
              <RefreshCw size={11} /> Retry
            </button>
          </div>
        )}

        <FinishedGoodsSummaryCards
          metrics={metrics}
          isLoading={isLoading}
          onCardClick={handleCardClick}
        />

        <div
          role="tabpanel"
          style={{
            background: 'var(--clr-bg-card)',
            border: '1px solid var(--clr-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
          }}
        >
          {activeTab === 'receipts' && (
            <ProductionOutputReceiptsTab
              warehouseId={warehouseId}
              category={category}
              isLoading={isLoading}
              initialFilter={tabFilter}
            />
          )}
          {activeTab === 'qc' && (
            <QCStatusQueueTab
              warehouseId={warehouseId}
              isLoading={isLoading}
            />
          )}
          {activeTab === 'stock' && (
            <FinishedGoodsStockTab
              warehouseId={warehouseId}
              category={category}
              isLoading={isLoading}
            />
          )}
          {activeTab === 'exceptions' && (
            <DamagedHeldGoodsTab
              warehouseId={warehouseId}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
