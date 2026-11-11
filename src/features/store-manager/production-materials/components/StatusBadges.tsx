// ============================================================
// PRODUCTION MATERIALS — STATUS BADGES
// ============================================================

import type {
  MaterialRequestStatus, IssueStatus, MaterialReturnStatus,
  ShortageStatus, Priority, MaterialCondition,
} from '../types';

interface BadgeProps { children: React.ReactNode; style?: React.CSSProperties; }
function Badge({ children, style }: BadgeProps) {
  return (
    <span style={{
      display: 'inline-block', fontSize: '10.5px', fontWeight: 600,
      padding: '2px 9px', borderRadius: '10px', whiteSpace: 'nowrap', ...style
    }}>
      {children}
    </span>
  );
}

export function RequestStatusBadge({ status }: { status: MaterialRequestStatus }) {
  const cfg: Record<MaterialRequestStatus, { bg: string; color: string; label: string }> = {
    'Requested':        { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8', label: 'Requested' },
    'Awaiting Approval':{ bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', label: 'Awaiting Approval' },
    'Approved':         { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', label: 'Approved' },
    'Partially Issued': { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa', label: 'Partially Issued' },
    'Issued':           { bg: 'rgba(16,185,129,0.12)', color: '#34d399', label: 'Issued' },
    'Blocked':          { bg: 'rgba(239,68,68,0.12)',  color: '#f87171', label: 'Blocked' },
    'Cancelled':        { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Cancelled' },
  };
  const c = cfg[status] ?? { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8', label: status };
  return <Badge style={{ background: c.bg, color: c.color }}>{c.label}</Badge>;
}

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  const cfg: Record<IssueStatus, { bg: string; color: string }> = {
    'Not Started': { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' },
    'Partial':     { bg: 'rgba(139,92,246,0.12)',  color: '#a78bfa' },
    'Complete':    { bg: 'rgba(16,185,129,0.12)',  color: '#34d399' },
    'Shortage':    { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24' },
    'Blocked':     { bg: 'rgba(239,68,68,0.12)',   color: '#f87171' },
  };
  const c = cfg[status] ?? { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' };
  return <Badge style={{ background: c.bg, color: c.color }}>{status}</Badge>;
}

export function ReturnStatusBadge({ status }: { status: MaterialReturnStatus }) {
  const cfg: Record<MaterialReturnStatus, { bg: string; color: string }> = {
    'Draft':                   { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' },
    'Submitted':               { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa' },
    'Awaiting Warehouse Check':{ bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24' },
    'Awaiting Inspection':     { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
    'Accepted':                { bg: 'rgba(16,185,129,0.12)',  color: '#34d399' },
    'Held':                    { bg: 'rgba(239,68,68,0.12)',   color: '#f87171' },
    'Rejected':                { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
    'Posted':                  { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
    'Cancelled':               { bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
  };
  const c = cfg[status] ?? { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' };
  return <Badge style={{ background: c.bg, color: c.color }}>{status}</Badge>;
}

export function ShortageStatusBadge({ status }: { status: ShortageStatus }) {
  const cfg: Record<ShortageStatus, { bg: string; color: string }> = {
    'Open':                   { bg: 'rgba(239,68,68,0.12)',   color: '#f87171' },
    'Under Review':           { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24' },
    'Waiting for Procurement':{ bg: 'rgba(139,92,246,0.12)', color: '#a78bfa' },
    'Waiting for Supplier':   { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa' },
    'Waiting for Quality Control':{ bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
    'Transfer Proposed':      { bg: 'rgba(20,184,166,0.12)',  color: '#2dd4bf' },
    'Awaiting Approval':      { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24' },
    'Partially Resolved':     { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa' },
    'Resolved':               { bg: 'rgba(16,185,129,0.12)', color: '#34d399' },
    'Cancelled':              { bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
  };
  const c = cfg[status] ?? { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' };
  return <Badge style={{ background: c.bg, color: c.color }}>{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg: Record<Priority, { bg: string; color: string }> = {
    'Critical': { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
    'High':     { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    'Medium':   { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa' },
    'Low':      { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' },
  };
  const c = cfg[priority];
  return <Badge style={{ background: c.bg, color: c.color }}>{priority}</Badge>;
}

export function ConditionBadge({ condition }: { condition: MaterialCondition }) {
  const cfg: Record<MaterialCondition, { bg: string; color: string }> = {
    'Good':          { bg: 'rgba(16,185,129,0.12)', color: '#34d399' },
    'Minor Damage':  { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
    'Contaminated':  { bg: 'rgba(239,68,68,0.12)',  color: '#f87171' },
    'Expired':       { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
    'Unknown':       { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' },
  };
  const c = cfg[condition] ?? { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' };
  return <Badge style={{ background: c.bg, color: c.color }}>{condition}</Badge>;
}
