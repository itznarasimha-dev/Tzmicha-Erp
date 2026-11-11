// ============================================================
// TAB 4 — ACTIVITY & AUDIT TRAIL
// ============================================================

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import * as taskService from '../services/storeManagerTasksService';
import type { AuditEvent } from '../types';

interface ActivityAuditTabProps {
  warehouseId: string;
  isLoading: boolean;
}

export function ActivityAuditTab({ warehouseId, isLoading }: ActivityAuditTabProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    async function load() {
      setIsFetching(true);
      try {
        const data = await taskService.fetchAuditEvents(warehouseId);
        setEvents(data);
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, [warehouseId]);

  const filtered = events.filter(e => {
    const q = search.toLowerCase();
    return !q || e.actionType.toLowerCase().includes(q) || e.userName.toLowerCase().includes(q) || e.sourceRecordRef.toLowerCase().includes(q);
  });

  if (isLoading || isFetching) return <div className="skeleton-container">{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '8px' }} />)}</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
          <input className="form-input" placeholder="Search activity trail..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', width: '100%' }} />
        </div>
      </div>

      <div className="erp-table-wrapper">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Source</th>
              <th>Reference</th>
              <th>Outcome</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id}>
                <td style={{ fontSize: '11px' }}>{format(new Date(e.eventDate), 'dd MMM HH:mm:ss')}</td>
                <td style={{ fontSize: '11px' }}>{e.userName}</td>
                <td style={{ fontSize: '12px', fontWeight: 500 }}>{e.actionType}</td>
                <td style={{ fontSize: '11px' }}>{e.sourceWorkspace}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{e.sourceRecordRef}</td>
                <td>
                  <span className={`status-badge ${e.outcome === 'Success' ? 'badge-green' : 'badge-red'}`}>
                    {e.outcome}
                  </span>
                </td>
                <td style={{ fontSize: '11px', color: 'var(--clr-text-secondary)' }}>{e.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
