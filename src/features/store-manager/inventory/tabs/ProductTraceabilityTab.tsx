// ============================================================
// TAB B — PRODUCT & BATCH TRACEABILITY
// ============================================================

import { useState } from 'react';
import { Search, ArrowRight, Clock, Package } from 'lucide-react';
import { format } from 'date-fns';
import type { InventoryRecord, InventoryMovement, TraceabilityResult } from '../types';
import { searchTraceability } from '../services/inventoryService';
import { StockStatusBadge, StockCategoryBadge } from '../components/StockStatusBadge';

interface ProductTraceabilityTabProps {
  records: InventoryRecord[];
  movements: InventoryMovement[];
  isLoading: boolean;
  initialFilter?: string;
  onViewDetails: (record: InventoryRecord) => void;
}

function TraceabilityResultCard({ result, records, onViewDetails }: {
  result: TraceabilityResult;
  records: InventoryRecord[];
  onViewDetails: (r: InventoryRecord) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const fmtDT = (iso: string) => { try { return format(new Date(iso), 'dd MMM yyyy HH:mm'); } catch { return iso; } };

  const matchingRecord = records.find((r) => r.productCode === result.productCode);

  return (
    <div style={{ background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: '12px', marginBottom: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <StockCategoryBadge category={result.productCategory} size="sm" />
            <span style={{ fontSize: '10.5px', background: result.sourceType === 'Manufactured' ? 'rgba(139,92,246,0.12)' : 'rgba(20,184,166,0.12)', color: result.sourceType === 'Manufactured' ? '#a78bfa' : '#2dd4bf', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
              {result.sourceType === 'Manufactured' ? '🏭 Manufactured' : '🛒 Purchased for Resale'}
            </span>
            <StockStatusBadge status={result.currentStatus} size="sm" />
          </div>
          <div style={{ fontFamily: "'Chillax', sans-serif", fontSize: '16px', fontWeight: 700, color: 'var(--clr-text-primary)', marginBottom: '4px' }}>
            {result.productName}
          </div>
          <div style={{ fontSize: '11.5px', fontFamily: 'monospace', color: 'var(--clr-accent-light)', marginBottom: '6px' }}>{result.productCode}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '11.5px', color: 'var(--clr-text-muted)' }}>
            <span>Batch/Serial: <strong style={{ color: 'var(--clr-text-primary)', fontFamily: 'monospace' }}>{result.batchSerial ?? '—'}</strong></span>
            <span>Source Doc: <strong style={{ color: 'var(--clr-text-primary)', fontFamily: 'monospace' }}>{result.sourceDocument}</strong></span>
            <span>Location: <strong style={{ color: 'var(--clr-text-primary)' }}>{result.currentLocation}</strong></span>
            <span>Remaining Qty: <strong style={{ color: 'var(--clr-ok)' }}>{result.remainingQty ?? '—'} {result.uom}</strong></span>
            <span>QC Status: {result.qualityStatus}</span>
            <span>Latest: {result.latestMovement}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
          {matchingRecord && (
            <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '11.5px' }} onClick={() => onViewDetails(matchingRecord)} id={`trace-view-${result.productCode}`}>
              View Details
            </button>
          )}
          <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '11.5px' }} onClick={() => setExpanded((v) => !v)} id={`trace-expand-${result.productCode}`}>
            {expanded ? 'Hide' : 'Show'} Timeline
          </button>
        </div>
      </div>

      {/* Missing fields */}
      {result.missingFields.length > 0 && (
        <div style={{ background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.2)', padding: '10px 16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--clr-warning)', marginBottom: '4px' }}>⚠ Traceability Exceptions</div>
          {result.missingFields.map((f, i) => <div key={i} style={{ fontSize: '11.5px', color: 'var(--clr-text-muted)' }}>• {f}</div>)}
        </div>
      )}

      {/* Timeline */}
      {expanded && result.events.length > 0 && (
        <div style={{ borderTop: '1px solid var(--clr-border)', padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
            <Clock size={11} style={{ marginRight: '5px', verticalAlign: 'middle' }} />Traceability Timeline
          </div>
          {result.events.map((ev) => (
            <div key={ev.id} style={{ display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--clr-text-muted)', whiteSpace: 'nowrap', minWidth: '110px', paddingTop: '2px' }}>{fmtDT(ev.timestamp)}</div>
              <div style={{ flex: 1, fontSize: '12px' }}>
                <span style={{ fontWeight: 600, color: 'var(--clr-text-primary)' }}>{ev.eventType}</span>
                <span style={{ color: 'var(--clr-text-muted)', marginLeft: '6px', fontFamily: 'monospace', fontSize: '11px' }}>{ev.transactionRef}</span>
                {ev.sourceLocation && ev.destinationLocation && (
                  <div style={{ fontSize: '11px', color: 'var(--clr-text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {ev.sourceLocation} <ArrowRight size={10} /> {ev.destinationLocation}
                  </div>
                )}
                {ev.notes && <div style={{ fontSize: '10.5px', fontStyle: 'italic', color: 'var(--clr-text-muted)', marginTop: '2px' }}>📝 {ev.notes}</div>}
              </div>
              <StockStatusBadge status={ev.resultingStatus} size="sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductTraceabilityTab({ records, movements, isLoading, onViewDetails }: ProductTraceabilityTabProps) {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<TraceabilityResult[]>([]);

  const handleSearch = () => {
    setSearched(true);
    setResults(searchTraceability(query, records, movements));
  };

  if (isLoading) return (
    <div>{[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '12px', marginBottom: '10px' }} />)}</div>
  );

  return (
    <div>
      {/* Search panel */}
      <div style={{ background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--clr-text-primary)', marginBottom: '4px' }}>Search & Trace</div>
        <div style={{ fontSize: '12px', color: 'var(--clr-text-muted)', marginBottom: '14px' }}>
          Enter a product code, batch number, supplier batch, serial number, GRN, production order, or dispatch reference to trace its full inventory journey.
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)', pointerEvents: 'none' }} />
            <input
              className="form-input"
              placeholder="e.g. BT-2026-ST-0091, SKU-30012, GRN-2026-0841, SN-MTR-0071-001…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ width: '100%', paddingLeft: '30px' }}
              id="trace-search-input"
            />
          </div>
          <button className="btn btn-primary" onClick={handleSearch} id="trace-search-btn">
            <Search size={13} /> Search
          </button>
        </div>
        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['SKU-30012', 'BT-2026-ST-0091', 'GRN-2026-0841', 'FG-MFG-0071', 'SN-MTR-0071-001'].map((ex) => (
            <button key={ex} onClick={() => { setQuery(ex); setSearched(true); setResults(searchTraceability(ex, records, movements)); }} className="btn btn-ghost" style={{ fontSize: '10.5px', padding: '3px 10px' }} id={`trace-example-${ex}`}>
              {ex}
            </button>
          ))}
          <span style={{ fontSize: '10.5px', color: 'var(--clr-text-muted)', alignSelf: 'center' }}>Example searches</span>
        </div>
      </div>

      {/* Results */}
      {searched && results.length === 0 && (
        <div className="empty-state">
          <Package size={36} className="empty-state-icon" />
          <p className="empty-state-title">No traceability records found</p>
          <p className="empty-state-desc">
            No inventory record matches "<strong>{query}</strong>". Verify the code and ensure the item is in an authorized warehouse.
          </p>
          <div style={{ marginTop: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--clr-warning)', maxWidth: '360px', textAlign: 'left' }}>
            ⚠ If a required traceability link is missing, do not fabricate historical records. Report the exception using the Stock Alerts tab.
          </div>
        </div>
      )}

      {results.map((r) => (
        <TraceabilityResultCard key={`${r.productCode}-${r.batchSerial}`} result={r} records={records} onViewDetails={onViewDetails} />
      ))}

      {!searched && (
        <div className="empty-state">
          <Search size={36} className="empty-state-icon" />
          <p className="empty-state-title">Enter a search term above</p>
          <p className="empty-state-desc">Trace any product, batch or serial number by entering its identifier in the search panel.</p>
        </div>
      )}
    </div>
  );
}
