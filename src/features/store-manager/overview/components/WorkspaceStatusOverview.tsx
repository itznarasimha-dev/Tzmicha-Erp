// ============================================================
// WORKSPACE STATUS OVERVIEW
// ============================================================

import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Package, Layers, Star,
  ArrowLeftRight, ShoppingCart, ClipboardList,
  CheckCircle2, AlertTriangle, Clock, Ban,
  Users, ExternalLink, Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import type { WorkspaceStatus } from '../types';

const WORKSPACE_ICONS: Record<number, React.ReactNode> = {
  1: <LayoutDashboard size={16} />,
  2: <Truck size={16} />,
  3: <Package size={16} />,
  4: <Layers size={16} />,
  5: <Star size={16} />,
  6: <ArrowLeftRight size={16} />,
  7: <ShoppingCart size={16} />,
  8: <ClipboardList size={16} />,
};

function StatusBadge({ status, severity }: { status: string; severity: string }) {
  return (
    <span className={`status-badge ${severity}`}>
      {severity === 'ok' && <CheckCircle2 size={10} />}
      {severity === 'warning' && <AlertTriangle size={10} />}
      {severity === 'critical' && <AlertTriangle size={10} />}
      {severity === 'unavailable' && <Ban size={10} />}
      {status}
    </span>
  );
}

function CountItem({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="workspace-count-item">
      <span className="workspace-count-value" style={{ color }}>
        {value === -1 ? '—' : value}
      </span>
      <span className="workspace-count-label">{label}</span>
    </div>
  );
}

function WorkspaceCard({ ws }: { ws: WorkspaceStatus }) {
  const navigate = useNavigate();

  const formatLastUpdated = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return format(new Date(iso), 'HH:mm');
    } catch {
      return '—';
    }
  };

  return (
    <div
      className={`workspace-status-card severity-${ws.statusSeverity}`}
      onClick={() => navigate(ws.route)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(ws.route)}
      id={`workspace-card-${ws.workspaceId}`}
      aria-label={`${ws.workspaceName}: ${ws.overallStatus}. Click to open workspace.`}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--clr-text-secondary)',
            }}
          >
            {WORKSPACE_ICONS[ws.workspaceId]}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)', marginBottom: '1px' }}>
              WS-{ws.workspaceId}
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--clr-text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {ws.workspaceName}
            </div>
          </div>
        </div>
        <StatusBadge status={ws.overallStatus} severity={ws.statusSeverity} />
      </div>

      {/* Counts row */}
      <div className="workspace-counts" style={{ marginBottom: '10px' }}>
        <CountItem value={ws.openItems} label="Open" color="var(--clr-info)" />
        <CountItem value={ws.completedToday} label="Done Today" color="var(--clr-ok)" />
        <CountItem value={ws.overdueItems} label="Overdue" color="var(--clr-critical)" />
        <CountItem value={ws.blockedItems} label="Blocked" color="var(--clr-warning)" />
      </div>

      {/* Main issue */}
      <div
        style={{
          fontSize: '11.5px',
          color: 'var(--clr-text-muted)',
          lineHeight: 1.5,
          marginBottom: '10px',
          borderTop: '1px solid var(--clr-border)',
          paddingTop: '8px',
        }}
      >
        {ws.mainIssue}
      </div>

      {/* Footer row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          {ws.responsibleDepartment && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--clr-warning)' }}>
              <Users size={11} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ws.responsibleDepartment}
              </span>
            </div>
          )}
          {ws.lastUpdated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', color: 'var(--clr-text-muted)' }}>
              <Clock size={10} />
              <span>{formatLastUpdated(ws.lastUpdated)}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--clr-accent-light)' }}>
          <ExternalLink size={11} />
          <span>View</span>
        </div>
      </div>
    </div>
  );
}

interface WorkspaceStatusOverviewProps {
  statuses: WorkspaceStatus[] | null;
  isLoading: boolean;
}

export function WorkspaceStatusOverview({ statuses, isLoading }: WorkspaceStatusOverviewProps) {
  if (isLoading) {
    return (
      <section aria-labelledby="workspace-overview-heading">
        <div className="section-header">
          <h2 id="workspace-overview-heading" className="section-title">
            <Activity size={18} style={{ color: 'var(--clr-accent)' }} />
            Workspace Status Overview
          </h2>
        </div>
        <div className="workspace-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="workspace-status-card">
              <div className="skeleton" style={{ width: '100%', height: '130px', borderRadius: '8px' }} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!statuses || statuses.length === 0) {
    return (
      <section aria-labelledby="workspace-overview-heading">
        <div className="section-header">
          <h2 id="workspace-overview-heading" className="section-title">
            <Activity size={18} style={{ color: 'var(--clr-accent)' }} />
            Workspace Status Overview
          </h2>
        </div>
        <div className="card">
          <div className="empty-state">
            <Ban size={40} className="empty-state-icon" />
            <p className="empty-state-title">Workspace data unavailable</p>
            <p className="empty-state-desc">
              Unable to load workspace statuses. Please refresh or contact your system administrator.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const criticalCount = statuses.filter((s) => s.statusSeverity === 'critical').length;
  const warningCount = statuses.filter((s) => s.statusSeverity === 'warning').length;

  return (
    <section aria-labelledby="workspace-overview-heading">
      <div className="section-header">
        <h2 id="workspace-overview-heading" className="section-title">
          <Activity size={18} style={{ color: 'var(--clr-accent)' }} />
          Workspace Status Overview
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {criticalCount > 0 && (
            <span className="status-badge critical">
              <AlertTriangle size={10} />
              {criticalCount} Critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="status-badge warning">
              <AlertTriangle size={10} />
              {warningCount} Warning
            </span>
          )}
        </div>
      </div>
      <div className="workspace-grid">
        {statuses.map((ws) => (
          <WorkspaceCard key={ws.workspaceId} ws={ws} />
        ))}
      </div>
    </section>
  );
}
