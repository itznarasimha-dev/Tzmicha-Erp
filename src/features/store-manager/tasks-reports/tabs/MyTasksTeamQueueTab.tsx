// ============================================================
// TAB 1 — MY TASKS & TEAM QUEUE
// ============================================================

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import * as taskService from '../services/storeManagerTasksService';
import type { Task } from '../types';

interface MyTasksTabProps {
  warehouseId: string;
  isLoading: boolean;
  initialFilter?: string;
}

export function MyTasksTeamQueueTab({ warehouseId, isLoading, initialFilter }: MyTasksTabProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    async function load() {
      setIsFetching(true);
      try {
        const data = await taskService.fetchTasks(warehouseId);
        setTasks(data);
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, [warehouseId]);

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.taskNumber.toLowerCase().includes(q) || t.sourceEntityId.toLowerCase().includes(q);
    const matchFilter = !initialFilter || (initialFilter === 'overdue' && new Date(t.dueAt) < new Date()) || (initialFilter === 'blocked' && t.status === 'Blocked') || (initialFilter === 'high' && t.priority === 'High');
    return matchSearch && matchFilter;
  });

  if (isLoading || isFetching) return <div className="skeleton-container">{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '8px' }} />)}</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
          <input className="form-input" placeholder="Search tasks, references..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', width: '100%' }} />
        </div>
      </div>

      <div className="erp-table-wrapper">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Task #</th>
              <th>Title</th>
              <th>Category</th>
              <th>Source</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{t.taskNumber}</td>
                <td style={{ fontSize: '12px', fontWeight: 500 }}>{t.title}</td>
                <td style={{ fontSize: '11px' }}>{t.category}</td>
                <td style={{ fontSize: '11px' }}>{t.sourceEntityType} ({t.sourceEntityId})</td>
                <td style={{ fontSize: '11px', fontWeight: 600 }}>{t.priority}</td>
                <td>
                  <span className={`status-badge ${t.status === 'Completed' ? 'badge-green' : 'badge-blue'}`}>
                    {t.status}
                  </span>
                </td>
                <td style={{ fontSize: '11px' }}>{format(new Date(t.dueAt), 'dd MMM')}</td>
                <td>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => alert(`Opening Task ${t.taskNumber}...`)}>
                    Details
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
