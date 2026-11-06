// ============================================================
// DEPARTMENT HAND-OFF PANEL
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, ExternalLink, Clock, AlertTriangle,
  MessageSquare, Flag, ChevronDown, ChevronUp,
  ArrowRightCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import type { DepartmentHandoff, AlertPriority } from '../types';

function PriorityDot({ priority }: { priority: AlertPriority }) {
  const colors: Record<AlertPriority, string> = {
    Critical: 'var(--clr-critical)',
    High: 'var(--clr-high)',
    Medium: 'var(--clr-medium)',
    Low: 'var(--clr-low)',
  };
  return (
    <span
      style={{
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: colors[priority],
        flexShrink: 0,
      }}
    />
  );
}

function HandoffCard({ handoff }: { handoff: DepartmentHandoff }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState('');
  const [flagged, setFlagged] = useState(false);

  const isCritical = handoff.priority === 'Critical' || handoff.priority === 'High';

  const formatDate = (iso: string) => {
    try {
      return format(new Date(iso), 'dd MMM yyyy HH:mm');
    } catch {
      return iso;
    }
  };

  return (
    <div
      style={{
        background: 'var(--clr-bg-card)',
        border: `1px solid ${isCritical ? 'rgba(239,68,68,0.2)' : 'var(--clr-border)'}`,
        borderLeft: `3px solid ${isCritical ? 'var(--clr-critical)' : 'var(--clr-warning)'}`,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        transition: 'var(--transition)',
      }}
      id={`handoff-${handoff.id}`}
    >
      {/* Main row */}
      <div
        style={{ padding: '14px 16px', cursor: 'pointer' }}
        onClick={() => setExpanded((e) => !e)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded((ex) => !ex)}
        aria-expanded={expanded}
        aria-label={`Hand-off ${handoff.id}: ${handoff.transactionType}. Click to expand.`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <PriorityDot priority={handoff.priority} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--clr-accent-light)' }}>
                {handoff.id}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--clr-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {handoff.transactionType}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--clr-text-muted)' }}>
                — {handoff.relatedWorkspace}
              </span>
              {flagged && (
                <span style={{ fontSize: '10px', color: 'var(--clr-critical)', fontWeight: 700 }}>
                  🚩 FLAGGED
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--clr-warning)' }}>
                <Users size={11} />
                <span>{handoff.responsibleDepartment}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--clr-text-muted)' }}>
                <Clock size={11} />
                <span className={`time-waiting ${isCritical ? 'critical' : ''}`}>
                  Waiting {handoff.timeWaiting}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--clr-text-muted)' }}>
                Raised: {formatDate(handoff.dateRaised)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span
              className={`priority-badge ${handoff.priority.toLowerCase()}`}
              style={{ fontSize: '10px' }}
            >
              {handoff.priority}
            </span>
            {expanded ? <ChevronUp size={14} color="var(--clr-text-muted)" /> : <ChevronDown size={14} color="var(--clr-text-muted)" />}
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid var(--clr-border)',
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                Current Status
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--clr-text-primary)' }}>{handoff.currentStatus}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                Next Required Action
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--clr-text-primary)' }}>{handoff.nextRequiredAction}</div>
            </div>
            {handoff.assignedPerson && (
              <div>
                <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                  Assigned Person
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--clr-text-primary)' }}>{handoff.assignedPerson}</div>
              </div>
            )}
          </div>

          {/* Follow-up comment */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '10px', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
              Add Follow-up Comment
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="form-input"
                placeholder="Add an operational follow-up comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{ flex: 1 }}
                id={`comment-${handoff.id}`}
                aria-label={`Follow-up comment for ${handoff.id}`}
              />
              <button
                className="btn btn-ghost"
                onClick={() => {
                  if (comment.trim()) {
                    alert(`Comment added: "${comment}"\n(In production this would post to the API.)`);
                    setComment('');
                  }
                }}
                id={`comment-submit-${handoff.id}`}
              >
                <MessageSquare size={12} />
                Post
              </button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate(handoff.detailsRoute)}
              id={`view-handoff-${handoff.id}`}
            >
              <ArrowRightCircle size={12} />
              View Record
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setFlagged((f) => !f)}
              id={`flag-handoff-${handoff.id}`}
              style={{ color: flagged ? 'var(--clr-critical)' : undefined }}
            >
              <Flag size={12} />
              {flagged ? 'Unflag' : 'Flag as Overdue'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => navigate(handoff.detailsRoute)}
              id={`open-record-${handoff.id}`}
            >
              <ExternalLink size={12} />
              Open Transaction
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface DepartmentHandoffPanelProps {
  handoffs: DepartmentHandoff[] | null;
  isLoading: boolean;
}

export function DepartmentHandoffPanel({ handoffs, isLoading }: DepartmentHandoffPanelProps) {
  if (isLoading) {
    return (
      <section aria-labelledby="handoff-heading">
        <div className="section-header">
          <h2 id="handoff-heading" className="section-title">
            <Users size={18} style={{ color: 'var(--clr-accent)' }} />
            Waiting for Department Action
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '72px', borderRadius: '10px' }} />
          ))}
        </div>
      </section>
    );
  }

  const criticalCount = handoffs?.filter((h) => h.priority === 'Critical' || h.priority === 'High').length ?? 0;

  return (
    <section aria-labelledby="handoff-heading">
      <div className="section-header">
        <h2 id="handoff-heading" className="section-title">
          <Users size={18} style={{ color: 'var(--clr-accent)' }} />
          Waiting for Department Action
          {handoffs && (
            <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--clr-text-muted)', marginLeft: '8px' }}>
              ({handoffs.length} records)
            </span>
          )}
        </h2>
        {criticalCount > 0 && (
          <span className="status-badge critical">
            <AlertTriangle size={10} />
            {criticalCount} Urgent
          </span>
        )}
      </div>

      {!handoffs || handoffs.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Users size={32} className="empty-state-icon" />
            <p className="empty-state-title">No pending department hand-offs</p>
            <p className="empty-state-desc">All cross-department actions are clear.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {handoffs.map((handoff) => (
            <HandoffCard key={handoff.id} handoff={handoff} />
          ))}
        </div>
      )}
    </section>
  );
}
