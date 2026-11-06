// ============================================================
// TAB 2 — DEPARTMENT HANDOFFS
// ============================================================

import { useState, useEffect } from 'react';
import { Search, Send } from 'lucide-react';
import { format } from 'date-fns';
import * as taskService from '../services/storeManagerTasksService';
import type { Handoff } from '../types';

interface DepartmentHandoffsTabProps {
  warehouseId: string;
  isLoading: boolean;
}

export function DepartmentHandoffsTab({ warehouseId, isLoading }: DepartmentHandoffsTabProps) {
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    async function load() {
      setIsFetching(true);
      try {
        const data = await taskService.fetchHandoffs(warehouseId);
        setHandoffs(data);
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, [warehouseId]);

  const filtered = handoffs.filter(h => {
    const q = search.toLowerCase();
    return !q || h.handoffNumber.toLowerCase().includes(q) || h.receivingDepartmentName.toLowerCase().includes(q) || h.reason.toLowerCase().includes(q);
  });

  if (isLoading || isFetching) return <div className="skeleton-container">{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '8px' }} />)}</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
          <input className="form-input" placeholder="Search handoffs, departments, reasons..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', width: '100%' }} />
        </div>
        <button className="btn btn-primary" style={{ fontSize: '12px' }} onClick={() => alert('Opening Handoff Form...')}>
          <Send size={14} style={{ marginRight: '4px' }} /> Send Handoff
        </button>
      </div>

      <div className="erp-table-wrapper">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Handoff #</th>
              <th>Originating Dept</th>
              <th>Receiving Dept</th>
              <th>Requested Action</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(h => (
              <tr key={h.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{h.handoffNumber}</td>
                <td style={{ fontSize: '11px' }}>{h.originatingDepartmentName}</td>
                <td style={{ fontSize: '11px', fontWeight: 600 }}>{h.receivingDepartmentName}</td>
                <td style={{ fontSize: '12px' }}>{h.requestedAction}</td>
                <td style={{ fontSize: '11px' }}>{h.priority}</td>
                <td>
                  <span className={`status-badge ${h.status === 'Resolved' ? 'badge-green' : 'badge-blue'}`}>
                    {h.status}
                  </span>
                </td>
                <td style={{ fontSize: '11px' }}>{format(new Date(h.dueAt), 'dd MMM')}</td>
                <td>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => alert(`Opening Handoff ${h.handoffNumber}...`)}>
                    View Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
