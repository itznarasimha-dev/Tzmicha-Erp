// ============================================================
// RECEIVING CENTRE — SHARED STATUS BADGE COMPONENT
// ============================================================

import type { POStatus, ReceivingStatus, GRNStatus, DiscrepancyFullStatus, SupplierReturnStatus, InspectionStatus } from '../types';

type AnyStatus = POStatus | ReceivingStatus | GRNStatus | DiscrepancyFullStatus | SupplierReturnStatus | InspectionStatus | string;

const STATUS_MAP: Record<string, { cls: string; dot: string }> = {
  // Receiving statuses
  'Expected':               { cls: 'info',        dot: '○' },
  'Due Today':              { cls: 'warning',      dot: '◉' },
  'Overdue':                { cls: 'critical',     dot: '⚠' },
  'Partially Received':     { cls: 'warning',      dot: '◑' },
  'Fully Received':         { cls: 'ok',           dot: '✓' },
  // PO statuses
  'Approved':               { cls: 'ok',           dot: '✓' },
  'Draft':                  { cls: 'unavailable',  dot: '○' },
  'Pending Approval':       { cls: 'info',         dot: '⋯' },
  'Cancelled':              { cls: 'unavailable',  dot: '×' },
  'Closed':                 { cls: 'unavailable',  dot: '—' },
  // GRN statuses
  'Submitted':              { cls: 'info',         dot: '→' },
  'Awaiting Inspection':    { cls: 'warning',      dot: '🔍' },
  'Partially Posted':       { cls: 'warning',      dot: '◑' },
  'Posted':                 { cls: 'ok',           dot: '✓' },
  'Reversed':               { cls: 'critical',     dot: '⟲' },
  // Inspection
  'Not Required':           { cls: 'unavailable',  dot: '—' },
  'Pending':                { cls: 'warning',      dot: '⋯' },
  'In Progress':            { cls: 'info',         dot: '◐' },
  'Rejected':               { cls: 'critical',     dot: '✗' },
  'On Hold':                { cls: 'warning',      dot: '⊘' },
  // Discrepancy
  'Assigned':               { cls: 'info',         dot: '→' },
  'Under Review':           { cls: 'info',         dot: '◐' },
  'Waiting for Supplier':   { cls: 'warning',      dot: '⌛' },
  'Waiting for Quality Control': { cls: 'warning', dot: '⌛' },
  'Waiting for Procurement': { cls: 'warning',     dot: '⌛' },
  'Waiting for Finance':    { cls: 'warning',      dot: '⌛' },
  'Resolution Proposed':    { cls: 'info',         dot: '→' },
  'Awaiting Approval':      { cls: 'warning',      dot: '⋯' },
  'Resolved':               { cls: 'ok',           dot: '✓' },
  'None':                   { cls: 'unavailable',  dot: '—' },
  // Returns
  'Return Staging':         { cls: 'info',         dot: '📦' },
  'Ready to Dispatch':      { cls: 'warning',      dot: '🚚' },
  'Partially Dispatched':   { cls: 'warning',      dot: '◑' },
  'Dispatched':             { cls: 'ok',           dot: '✓' },
  'Waiting for Supplier Confirmation': { cls: 'warning', dot: '⌛' },
};

interface ReceivingStatusBadgeProps {
  status: AnyStatus;
  size?: 'sm' | 'md';
}

export function ReceivingStatusBadge({ status, size = 'md' }: ReceivingStatusBadgeProps) {
  const cfg = STATUS_MAP[status] ?? { cls: 'unavailable', dot: '?' };
  const fontSize = size === 'sm' ? '10px' : '11px';
  const padding = size === 'sm' ? '2px 7px' : '3px 10px';

  return (
    <span
      className={`status-badge ${cfg.cls}`}
      style={{ fontSize, padding, whiteSpace: 'nowrap' }}
    >
      <span style={{ marginRight: '3px' }}>{cfg.dot}</span>
      {status}
    </span>
  );
}
