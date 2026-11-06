// ============================================================
// TAB 3 — OPERATIONAL REPORTS
// ============================================================

import { useState, useEffect } from 'react';
import { Search, FileText, Download } from 'lucide-react';
import * as taskService from '../services/storeManagerTasksService';
import type { ReportMetadata } from '../types';

interface OperationalReportsTabProps {
  warehouseId: string;
  isLoading: boolean;
}

export function OperationalReportsTab({ isLoading }: OperationalReportsTabProps) {
  const [catalogue, setCatalogue] = useState<ReportMetadata[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    async function load() {
      setIsFetching(true);
      try {
        const data = await taskService.fetchReportCatalogue();
        setCatalogue(data);
      } finally {
        setIsFetching(false);
      }
    }
    load();
  }, []);

  const filtered = catalogue.filter(r => {
    const q = search.toLowerCase();
    return !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
  });

  if (isLoading || isFetching) return <div className="skeleton-container">{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '8px' }} />)}</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
          <input className="form-input" placeholder="Search reports..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', width: '100%' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {filtered.map(rep => (
          <div key={rep.id} style={{ background: 'var(--clr-bg-surface)', border: '1px solid var(--clr-border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--clr-text-primary)' }}>{rep.title}</div>
              <span style={{ fontSize: '10px', background: 'rgba(59,130,246,0.1)', color: 'var(--clr-accent)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{rep.category}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--clr-text-muted)', lineHeight: '1.5' }}>{rep.description}</div>
            <div style={{ fontSize: '11px', color: 'var(--clr-text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <FileText size={12} /> Data Source: {rep.dataSource}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <button className="btn btn-primary" style={{ flex: 1, fontSize: '12px' }} onClick={() => alert(`Generating report ${rep.id}...`)}>
                View Report
              </button>
              <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => alert(`Exporting ${rep.id} to CSV...`)}>
                <Download size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
