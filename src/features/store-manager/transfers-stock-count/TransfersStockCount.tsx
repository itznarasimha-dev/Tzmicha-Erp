// ============================================================
// PAGE 6 — TRANSFERS & STOCK COUNT WORKSPACE
// ============================================================

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, RefreshCw, WifiOff, Home, ChevronRight, Warehouse } from 'lucide-react';

import { useTransfersStockCountData } from './hooks/useTransfersStockCountData';
import { TransferSummaryCards } from './components/TransferSummaryCards';
import { TransferRequestsTab } from './tabs/TransferRequestsTab';
import { InTransitReceivingTab } from './tabs/InTransitReceivingTab';
import { StockCountSessionsTab } from './tabs/StockCountSessionsTab';
import { VariancesAdjustmentsTab } from './tabs/VariancesAdjustmentsTab';

interface TransfersStockCountProps {
  onMobileMenuOpen: () => void;
}

const TAB_CONFIG = [
  { id: 'requests', label: 'Transfer Requests', emoji: '📝' },
  { id: 'transit',   label: 'In-Transit & Receiving', emoji: '🚚' },
  { id: 'counts',   label: 'Stock Count Sessions', emoji: '📋' },
  { id: 'variances', label: 'Variances & Adjustments', emoji: '⚖️' },
];

const WAREHOUSES = [
  { id: 'ALL',     name: 'All Warehouses' },
  { id: 'WH-001', name: 'Main Production Warehouse' },
  { id: 'WH-002', name: 'Finished Goods Store' },
  { id: 'WH-003', name: 'Raw Materials Store' },
];

export function TransfersStockCount({ onMobileMenuOpen }: TransfersStockCountProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('requests');
  const [tabFilter, setTabFilter] = useState<string | undefined>(undefined);
  const [warehouseId, setWarehouseId] = useState('ALL');

  const { metrics, isLoading, error, refresh } = useTransfersStockCountData();

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
                Logistics &amp; Depot Movement
              </span>
              <span className="text-xs text-slate-400 font-medium">Inter-Warehouse Transit &amp; Auditing</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Transfers &amp; Stock Count</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Manage warehouse transfers, track stock in transit, conduct cycle count audits, and reconcile physical variances against ledger balances.
            </p>
          </div>

          <div className="flex items-center gap-3">
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
              title="Refresh transfers data"
            >
              <RefreshCw size={15} />
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

        <TransferSummaryCards
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
          {activeTab === 'requests' && (
            <TransferRequestsTab
              warehouseId={warehouseId}
              isLoading={isLoading}
              initialFilter={tabFilter}
            />
          )}
          {activeTab === 'transit' && (
            <InTransitReceivingTab
              warehouseId={warehouseId}
              isLoading={isLoading}
              initialFilter={tabFilter}
            />
          )}
          {activeTab === 'counts' && (
            <StockCountSessionsTab
              warehouseId={warehouseId}
              isLoading={isLoading}
            />
          )}
          {activeTab === 'variances' && (
            <VariancesAdjustmentsTab
              warehouseId={warehouseId}
              isLoading={isLoading}
              initialFilter={tabFilter}
            />
          )}
        </div>
      </div>
    </div>
  );
}
