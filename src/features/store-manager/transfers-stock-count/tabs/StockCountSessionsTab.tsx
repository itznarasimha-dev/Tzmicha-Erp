// ============================================================
// TAB 3 — STOCK COUNT SESSIONS
// ============================================================

import { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { format } from 'date-fns';
import * as tscService from '../services/transfersStockCountService';
import type { StockCountSession } from '../types';

interface StockCountSessionsTabProps {
  warehouseId: string;
  isLoading: boolean;
}

export function StockCountSessionsTab({ warehouseId, isLoading }: StockCountSessionsTabProps) {
  const [sessions, setSessions] = useState<StockCountSession[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    async function load() {
      setIsFetching(true);
      try {
        const data = await tscService.fetchCountSessions(warehouseId);
        setSessions(data);
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, [warehouseId]);

  const filtered = sessions.filter(s => {
    const q = search.toLowerCase();
    return !q || s.countNumber.toLowerCase().includes(q) || s.warehouseName.toLowerCase().includes(q);
  });

  if (isLoading || isFetching) return <div className="skeleton-container">{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '8px' }} />)}</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
          <input className="form-input" placeholder="Search count sessions..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', width: '100%' }} />
        </div>
        <button className="btn btn-primary" style={{ fontSize: '12px' }} onClick={() => setShowCreateModal(true)}>
          <Plus size={14} style={{ marginRight: '4px' }} /> Create Count
        </button>
      </div>

      <div className="erp-table-wrapper">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Count #</th>
              <th>Type</th>
              <th>Warehouse</th>
              <th>Lines (C/T)</th>
              <th>Variances</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{s.countNumber}</td>
                <td style={{ fontSize: '11px' }}>{s.type}</td>
                <td style={{ fontSize: '11px' }}>{s.warehouseName}</td>
                <td style={{ fontSize: '11px' }}>{s.countedLines} / {s.totalLines}</td>
                <td style={{ fontWeight: 700, color: '#ef4444' }}>{s.varianceLines}</td>
                <td style={{ fontSize: '11px' }}>{format(new Date(s.dueAt), 'dd MMM')}</td>
                <td>
                  <span className={`status-badge ${s.status === 'Completed' ? 'badge-green' : 'badge-blue'}`}>
                    {s.status}
                  </span>
                </td>
                <td>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => alert(`Opening Count Session ${s.countNumber}...`)}>
                    Manage Count
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--clr-bg-card)', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '24px', border: '1px solid var(--clr-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>New Stock Count Session</h3>
              <button className="btn-icon" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>Count Type</label>
                <select className="form-select" style={{ width: '100%' }}>
                  <option>Cycle Count</option>
                  <option>Full Warehouse Count</option>
                  <option>Bin/Location Count</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--clr-text-muted', marginBottom: '4px' }}>Warehouse</label>
                <select className="form-select" style={{ width: '100%' }}><option>Main Production Warehouse</option></select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--clr-text-muted', marginBottom: '4px' }}>Due Date</label>
                <input type="date" className="form-input" style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { alert('Count Session Planned'); setShowCreateModal(false); }}>Create Session</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function X({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
}
