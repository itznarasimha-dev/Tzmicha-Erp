// ============================================================
// TAB C — BARCODE / QR LOOKUP
// ============================================================

import { useState, useRef, useCallback } from 'react';
import { Search, Camera, CameraOff, Scan, Clock, AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import { format } from 'date-fns';
import type { InventoryRecord, BarcodeScanResult } from '../types';
import { lookupBarcode } from '../services/inventoryService';
import { StockStatusBadge, StockCategoryBadge } from '../components/StockStatusBadge';

interface BarcodeLookupTabProps {
  records: InventoryRecord[];
  isLoading: boolean;
  onViewDetails: (record: InventoryRecord) => void;
}

function ScanResultCard({ result, records, onViewDetails }: {
  result: BarcodeScanResult;
  records: InventoryRecord[];
  onViewDetails: (r: InventoryRecord) => void;
}) {
  const fmtDT = (iso: string) => { try { return format(new Date(iso), 'HH:mm:ss dd MMM'); } catch { return iso; } };
  const matchingRecord = records.find((r) =>
    r.productCode === result.productCode ||
    r.batchNumber === result.batchSerial ||
    r.serialNumbers.includes(result.batchSerial ?? '')
  );

  if (result.errorMessage) {
    return (
      <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <AlertTriangle size={18} style={{ color: 'var(--clr-critical)', flexShrink: 0 }} />
          <div style={{ fontWeight: 700, color: 'var(--clr-critical)', fontSize: '13px' }}>Scan Result: Not Found</div>
          <div style={{ marginLeft: 'auto', fontSize: '10.5px', color: 'var(--clr-text-muted)' }}>{fmtDT(result.foundAt)}</div>
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--clr-text-muted)' }}>Code scanned: <span style={{ fontFamily: 'monospace', color: 'var(--clr-text-primary)' }}>{result.code}</span></div>
        <div style={{ marginTop: '8px', fontSize: '12.5px', color: 'var(--clr-text-secondary)' }}>{result.errorMessage}</div>
        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--clr-text-muted)' }}>
          Possible causes: invalid code, unauthorized warehouse, item not yet received, or the record may not exist in this system. Use the Traceability tab to investigate.
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <CheckCircle2 size={18} style={{ color: 'var(--clr-ok)', flexShrink: 0 }} />
        <div style={{ fontWeight: 700, color: 'var(--clr-ok)', fontSize: '13px' }}>Scan Result: Found</div>
        <span style={{ fontSize: '10.5px', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '8px', color: 'var(--clr-text-muted)' }}>{result.type}</span>
        <div style={{ marginLeft: 'auto', fontSize: '10.5px', color: 'var(--clr-text-muted)' }}>{fmtDT(result.foundAt)}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
        {[
          ['Product Code', result.productCode ?? '—'],
          ['Product Name', result.productName ?? '—'],
          ['Category', '—'],
          ['Batch / Serial', result.batchSerial ?? '—'],
          ['Warehouse', result.warehouseName ?? '—'],
          ['Bin', result.bin ?? '—'],
          ['On-Hand Qty', result.onHandQty != null ? `${result.onHandQty} ${result.uom}` : '—'],
          ['Available Qty', result.availableQty != null ? `${result.availableQty} ${result.uom}` : '—'],
          ['Status', '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '8px 10px' }}>
            <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{k}</div>
            {k === 'Status' && result.status
              ? <StockStatusBadge status={result.status} size="sm" />
              : k === 'Category' && result.productCategory
              ? <StockCategoryBadge category={result.productCategory} size="sm" />
              : <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--clr-text-primary)', fontFamily: k.includes('Code') || k.includes('Batch') ? 'monospace' : undefined }}>{v}</div>}
          </div>
        ))}
      </div>
      {matchingRecord && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" style={{ fontSize: '11.5px' }} onClick={() => onViewDetails(matchingRecord)} id={`barcode-view-details-${result.code}`}>
            <Package size={12} /> View Product
          </button>
          <button className="btn btn-ghost" style={{ fontSize: '11.5px' }} id={`barcode-movement-${result.code}`}>
            <Clock size={12} /> View Movement History
          </button>
        </div>
      )}

      {/* Hold warning */}
      {result.status && ['Quality Hold', 'Quarantined', 'Damaged', 'Expired', 'Rejected'].includes(result.status) && (
        <div style={{ marginTop: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--clr-critical)' }}>
          ⛔ This item is on <strong>{result.status}</strong> and cannot be allocated for normal production, fulfilment or dispatch. See the inventory record for resolution steps.
        </div>
      )}
    </div>
  );
}

export function BarcodeLookupTab({ records, isLoading, onViewDetails }: BarcodeLookupTabProps) {
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<BarcodeScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<BarcodeScanResult[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const doLookup = useCallback((code: string) => {
    if (!code.trim()) return;
    const result = lookupBarcode(code, records);
    setScanResult(result);
    setRecentScans((prev) => [result, ...prev.filter((r) => r.code !== code)].slice(0, 8));
  }, [records]);

  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach((t) => t.stop());
      setCameraActive(true);
      setCameraError(null);
      // In a real app, integrate a barcode scanning library (e.g. ZXing, QuaggaJS)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Permission') || message.includes('NotAllowed')) {
        setCameraError('Camera permission denied. Please grant camera access in your browser settings, then try again.');
      } else if (message.includes('NotFound') || message.includes('DevicesNotFound')) {
        setCameraError('No camera found on this device. Use manual code entry below.');
      } else {
        setCameraError('Camera could not be started. Use manual entry instead.');
      }
      setCameraActive(false);
    }
  };

  const fmtTime = (iso: string) => { try { return format(new Date(iso), 'HH:mm:ss'); } catch { return iso; } };

  if (isLoading) return (
    <div><div className="skeleton" style={{ height: '200px', borderRadius: '12px' }} /></div>
  );

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        {/* Left — scan area */}
        <div>
          {/* Camera section */}
          <div style={{ background: 'var(--clr-bg-card)', border: '2px dashed var(--clr-border)', borderRadius: '14px', padding: '32px', textAlign: 'center', marginBottom: '16px', minHeight: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            {cameraActive ? (
              <>
                <div style={{ width: '200px', height: '200px', border: '3px solid var(--clr-accent)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59,130,246,0.08)', position: 'relative' }}>
                  <Camera size={48} style={{ color: 'var(--clr-accent)', opacity: 0.5 }} />
                  <div style={{ position: 'absolute', inset: '10px', border: '2px solid rgba(59,130,246,0.4)', borderRadius: '8px' }} />
                  <div style={{ position: 'absolute', top: '10px', left: '10px', width: '20px', height: '20px', borderTop: '3px solid var(--clr-accent)', borderLeft: '3px solid var(--clr-accent)', borderRadius: '4px 0 0 0' }} />
                  <div style={{ position: 'absolute', top: '10px', right: '10px', width: '20px', height: '20px', borderTop: '3px solid var(--clr-accent)', borderRight: '3px solid var(--clr-accent)', borderRadius: '0 4px 0 0' }} />
                  <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '20px', height: '20px', borderBottom: '3px solid var(--clr-accent)', borderLeft: '3px solid var(--clr-accent)', borderRadius: '0 0 0 4px' }} />
                  <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '20px', height: '20px', borderBottom: '3px solid var(--clr-accent)', borderRight: '3px solid var(--clr-accent)', borderRadius: '0 0 4px 0' }} />
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--clr-accent)' }}>Camera scanning active — point at barcode or QR code</div>
                <div style={{ fontSize: '11px', color: 'var(--clr-text-muted)' }}>
                  Note: In this development version, camera scanning library integration is pending. Use manual entry below.
                </div>
                <button className="btn btn-ghost" onClick={() => setCameraActive(false)} id="stop-camera-btn">
                  <CameraOff size={13} /> Stop Camera
                </button>
              </>
            ) : cameraError ? (
              <>
                <CameraOff size={36} style={{ color: 'var(--clr-critical)' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--clr-critical)' }}>Camera Unavailable</div>
                <div style={{ fontSize: '12px', color: 'var(--clr-text-muted)', maxWidth: '360px' }}>{cameraError}</div>
                <button className="btn btn-ghost" onClick={handleStartCamera} id="retry-camera-btn">
                  <Camera size={13} /> Retry Camera
                </button>
              </>
            ) : (
              <>
                <Scan size={48} style={{ color: 'var(--clr-text-muted)', opacity: 0.5 }} />
                <div style={{ fontSize: '13px', color: 'var(--clr-text-muted)' }}>Camera scan area</div>
                <div style={{ fontSize: '11.5px', color: 'var(--clr-text-muted)' }}>Requires camera permission and a compatible scanning library.</div>
                <button className="btn btn-primary" onClick={handleStartCamera} id="start-camera-btn">
                  <Camera size={13} /> Start Camera Scan
                </button>
              </>
            )}
          </div>

          {/* Manual entry */}
          <div style={{ background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--clr-text-primary)', marginBottom: '12px' }}>
              Manual Code Entry
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                ref={inputRef}
                className="form-input"
                placeholder="Type or paste product code, batch, serial, supplier batch…"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doLookup(manualCode)}
                style={{ flex: 1 }}
                id="barcode-manual-input"
              />
              <button className="btn btn-primary" onClick={() => doLookup(manualCode)} id="barcode-lookup-btn">
                <Search size={13} /> Lookup
              </button>
            </div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['SKU-30012', 'BT-2026-AL-0046', 'SN-MTR-0071-002', 'INVALID-CODE-XYZ'].map((ex) => (
                <button key={ex} className="btn btn-ghost" style={{ fontSize: '10.5px', padding: '3px 10px' }} onClick={() => { setManualCode(ex); doLookup(ex); }} id={`barcode-eg-${ex}`}>
                  {ex}
                </button>
              ))}
              <span style={{ fontSize: '10.5px', color: 'var(--clr-text-muted)', alignSelf: 'center' }}>Try examples ↑</span>
            </div>
          </div>

          {/* Scan result */}
          {scanResult && <ScanResultCard result={scanResult} records={records} onViewDetails={onViewDetails} />}
        </div>

        {/* Right — recent scans */}
        <div>
          <div style={{ background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: '12px', padding: '16px', position: 'sticky', top: '20px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--clr-text-primary)', marginBottom: '12px' }}>
              <Clock size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Recent Scans
            </div>
            {recentScans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--clr-text-muted)', fontSize: '12px' }}>
                No recent scans. Start a camera scan or enter a code above.
              </div>
            ) : (
              recentScans.map((s, idx) => (
                <div
                  key={`${s.code}-${idx}`}
                  style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                  onClick={() => { setManualCode(s.code); setScanResult(s); }}
                  id={`recent-scan-${idx}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {s.errorMessage
                      ? <span style={{ fontSize: '10px', background: 'rgba(239,68,68,0.12)', color: 'var(--clr-critical)', padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>✗ Not Found</span>
                      : <span style={{ fontSize: '10px', background: 'rgba(34,197,94,0.12)', color: 'var(--clr-ok)', padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>✓ Found</span>}
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--clr-text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.code}</span>
                    <span style={{ fontSize: '10px', color: 'var(--clr-text-muted)', whiteSpace: 'nowrap' }}>{fmtTime(s.foundAt)}</span>
                  </div>
                  {s.productName && <div style={{ fontSize: '10.5px', color: 'var(--clr-text-muted)', marginTop: '2px' }}>{s.productName}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
