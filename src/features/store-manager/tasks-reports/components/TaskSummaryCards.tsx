// ============================================================
// COMPONENTS — TASK SUMMARY CARDS
// ============================================================

import React from 'react';
import { Clock, AlertTriangle, UserCheck, Box, CheckCircle, ShieldAlert, Users } from 'lucide-react';
import type { TaskMetrics } from '../types';

interface CardProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

function SummaryCard({ label, count, icon, color, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--clr-bg-card)',
        border: '1px solid var(--clr-border)',
        borderRadius: '12px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'var(--transition)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: '180px'
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = color}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--clr-border)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--clr-text-muted)', fontSize: '12px', fontWeight: 600 }}>
        <span style={{ color: color }}>{icon}</span>
        {label}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--clr-text-primary)' }}>
        {count}
      </div>
    </div>
  );
}

export function TaskSummaryCards({ metrics, isLoading, onCardClick }: { metrics: TaskMetrics | null, isLoading: boolean, onCardClick: (tab: string, filter?: string) => void }) {
  if (isLoading) return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
    {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '12px' }} />)}
  </div>;

  if (!metrics) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
      <SummaryCard label="My Open Tasks" count={metrics.myOpenTasks} icon={<UserCheck size={16} />} color="#3b82f6" onClick={() => onCardClick('my-tasks')} />
      <SummaryCard label="Team Tasks" count={metrics.teamTasks} icon={<Users size={16} />} color="#6366f1" onClick={() => onCardClick('my-tasks', 'team')} />
      <SummaryCard label="Overdue Tasks" count={metrics.overdueTasks} icon={<Clock size={16} />} color="#ef4444" onClick={() => onCardClick('my-tasks', 'overdue')} />
      <SummaryCard label="Blocked Tasks" count={metrics.blockedTasks} icon={<ShieldAlert size={16} />} color="#f59e0b" onClick={() => onCardClick('my-tasks', 'blocked')} />
      <SummaryCard label="Awaiting Other Depts" count={metrics.awaitingOtherDepts} icon={<Box size={16} />} color="#8b5cf6" onClick={() => onCardClick('handoffs')} />
      <SummaryCard label="High-Priority Tasks" count={metrics.highPriorityTasks} icon={<AlertTriangle size={16} />} color="#dc2626" onClick={() => onCardClick('my-tasks', 'high')} />
      <SummaryCard label="Open Stock Exceptions" count={metrics.openStockExceptions} icon={<AlertTriangle size={16} />} color="#f97316" onClick={() => onCardClick('my-tasks', 'exception')} />
      <SummaryCard label="Completed Today" count={metrics.completedToday} icon={<CheckCircle size={16} />} color="#10b981" onClick={() => onCardClick('reports')} />
    </div>
  );
}
