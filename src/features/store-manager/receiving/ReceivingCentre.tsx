// ============================================================
// RECEIVING CENTRE — MAIN PAGE
// Route: /store-manager/receiving
// ============================================================

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, RefreshCw, WifiOff, AlertTriangle, ChevronRight,
  Home, Warehouse,
} from 'lucide-react';
import { format } from 'date-fns';
import type { PurchaseOrder, ReceivingTab } from './types';
import { useReceivingData } from './hooks/useReceivingData';
import { ReceivingSummaryCards } from './components/ReceivingSummaryCards';
import { ExpectedReceiptsTab } from './tabs/ExpectedReceiptsTab';
import { GoodsReceiptNotesTab } from './tabs/GoodsReceiptNotesTab';
import { DiscrepanciesTab } from './tabs/DiscrepanciesTab';
import { SupplierReturnsTab } from './tabs/SupplierReturnsTab';
import { GoodsReceiptForm } from './components/GoodsReceiptForm';

interface ReceivingCentreProps {
  onMobileMenuOpen: () => void;
}

const TAB_CONFIG: { id: ReceivingTab; label: string; icon: string }[] = [
  { id: 'expected',      label: 'Expected Receipts',      icon: '📋' },
  { id: 'grns',          label: 'Goods Receipt Notes',    icon: '📄' },
  { id: 'discrepancies', label: 'Delivery Discrepancies', icon: '⚠️' },
  { id: 'returns',       label: 'Supplier Returns',       icon: '↩️' },
];

const WAREHOUSES = [
  { id: 'ALL',    name: 'All Assigned Warehouses' },
  { id: 'WH-001', name: 'Main Production Warehouse' },
  { id: 'WH-002', name: 'Finished Goods Store' },
  { id: 'WH-003', name: 'Raw Materials Store' },
];

export function ReceivingCentre({ onMobileMenuOpen }: ReceivingCentreProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ReceivingTab>('expected');
  const [tabFilter, setTabFilter] = useState<string | undefined>(undefined);
  const [warehouseId, setWarehouseId] = useState('ALL');
  const [grnPO, setGrnPO] = useState<PurchaseOrder | null>(null); // PO for which GRN form is open

  const { data, isLoading, isRefreshing, error, refresh } = useReceivingData(warehouseId);

  const handleCardClick = useCallback((tab: ReceivingTab, filter?: string) => {
    setActiveTab(tab);
    setTabFilter(filter);
  }, []);

  const handleStartGRN = useCallback((po: PurchaseOrder) => {
    setGrnPO(po);
    setActiveTab('grns');
  }, []);

  const handleGRNSuccess = useCallback((_grnNumber: string) => {
    refresh();
  }, [refresh]);

  const fmtTime = (iso: string) => { try { return format(new Date(iso), 'HH:mm'); } catch { return ''; } };

  // Badge counts per tab
  const badgeCounts: Record<ReceivingTab, number> = {
    expected: data?.metrics.expectedDeliveries ?? 0,
    grns: data?.metrics.pendingGRNs ?? 0,
    discrepancies: data?.metrics.openDiscrepancies ?? 0,
    returns: data?.metrics.pendingSupplierReturns ?? 0,
  };

  return (
    <div className="page-enter">
      {/* GRN form overlay */}
      {grnPO && (
        <GoodsReceiptForm
          po={grnPO}
          onClose={() => setGrnPO(null)}
          onSuccess={handleGRNSuccess}
        />
      )}

      {/* ─── PAGE HEADER & TAB RIBBON ─── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#74d138]/15 text-[#3b7c14] border border-[#74d138]/30">
                Inward Logistics &amp; GRN
              </span>
              <span className="text-xs text-slate-400 font-medium">Warehouse Inbound Hub</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Receiving Centre</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Manage incoming supplier deliveries, verify quantities against PO, and record batch serial GRNs into warehouse stock.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-1.5 shadow-sm">
              <Warehouse size={15} className="text-slate-500" />
              <select
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-2"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                id="rc-warehouse-select"
                aria-label="Select warehouse"
              >
                {WAREHOUSES.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={refresh}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200"
              title="Refresh receiving ledger"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-t border-slate-100 pt-4">
          {TAB_CONFIG.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = badgeCounts[tab.id];
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
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[#74d138] text-slate-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── PAGE CONTENT ─── */}
      <div className="erp-content p-0 pt-6">
        {/* Banners */}
        {error && (
          <div className="alert-banner error" role="alert" style={{ marginBottom: '16px' }}>
            <WifiOff size={14} />
            <span>{error}</span>
            <button className="btn btn-ghost" style={{ marginLeft: '8px', padding: '2px 10px', fontSize: '12px' }} onClick={refresh} id="rc-error-retry">
              <RefreshCw size={11} /> Retry
            </button>
          </div>
        )}

        {isRefreshing && !isLoading && (
          <div className="alert-banner warning" role="status" style={{ marginBottom: '16px' }}>
            <RefreshCw size={13} className="refresh-spin" />
            <span>Refreshing receiving data…</span>
          </div>
        )}

        {/* Summary cards */}
        <ReceivingSummaryCards
          metrics={data?.metrics ?? null}
          isLoading={isLoading}
          onCardClick={handleCardClick}
        />

        {/* Tab panels */}
        <div
          role="tabpanel"
          id={`rc-panel-${activeTab}`}
          aria-labelledby={`rc-tab-${activeTab}`}
          style={{
            background: 'var(--clr-bg-card)',
            border: '1px solid var(--clr-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
          }}
        >
          {activeTab === 'expected' && (
            <ExpectedReceiptsTab
              purchaseOrders={data?.purchaseOrders ?? []}
              isLoading={isLoading}
              initialFilter={tabFilter}
              onStartGRN={handleStartGRN}
            />
          )}
          {activeTab === 'grns' && (
            <GoodsReceiptNotesTab
              grns={data?.grns ?? []}
              isLoading={isLoading}
              initialFilter={tabFilter}
              onStartGRN={() => {
                // Open GRN form without a preselected PO — user picks PO inside form
                // For now navigate to expected to pick a PO
                setActiveTab('expected');
              }}
            />
          )}
          {activeTab === 'discrepancies' && (
            <DiscrepanciesTab
              discrepancies={data?.discrepancies ?? []}
              isLoading={isLoading}
              initialFilter={tabFilter}
            />
          )}
          {activeTab === 'returns' && (
            <SupplierReturnsTab
              returns={data?.supplierReturns ?? []}
              isLoading={isLoading}
              initialFilter={tabFilter}
            />
          )}
        </div>
      </div>
    </div>
  );
}
