// ============================================================
// TODAY'S TASK QUEUE
// ============================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare, Search, Filter, ExternalLink,
  Clock, AlertTriangle, ChevronUp, ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Task, TaskPriority, TaskStatus } from '../types';

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`priority-badge ${priority.toLowerCase()}`}>
      {priority === 'Urgent' && '🔴 '}
      {priority === 'High' && '🟠 '}
      {priority === 'Medium' && '🟡 '}
      {priority === 'Low' && '🟢 '}
      {priority}
    </span>
  );
}

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config: Record<TaskStatus, { class: string; label: string }> = {
    Open: { class: 'info', label: '● Open' },
    'In Progress': { class: 'info', label: '◐ In Progress' },
    Overdue: { class: 'critical', label: '⚠ Overdue' },
    Blocked: { class: 'warning', label: '⊘ Blocked' },
    Completed: { class: 'ok', label: '✓ Completed' },
    Pending: { class: 'unavailable', label: '○ Pending' },
  };
  const cfg = config[status] ?? { class: 'unavailable', label: status };
  return <span className={`status-badge ${cfg.class}`}>{cfg.label}</span>;
}

interface TodaysTaskQueueProps {
  tasks: Task[] | null;
  isLoading: boolean;
}

type SortField = 'priority' | 'dueDate' | 'status' | 'workspace';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  Urgent: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

export function TodaysTaskQueue({ tasks, isLoading }: TodaysTaskQueueProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterWorkspace, setFilterWorkspace] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const workspaces = useMemo(() => {
    if (!tasks) return [];
    return Array.from(new Set(tasks.map((t) => t.workspace)));
  }, [tasks]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    let result = tasks.filter((t) => {
      const matchSearch =
        !search ||
        t.taskName.toLowerCase().includes(search.toLowerCase()) ||
        t.transactionRef.toLowerCase().includes(search.toLowerCase()) ||
        t.assignedPerson.toLowerCase().includes(search.toLowerCase());
      const matchWs = filterWorkspace === 'ALL' || t.workspace === filterWorkspace;
      const matchPriority = filterPriority === 'ALL' || t.priority === filterPriority;
      const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
      return matchSearch && matchWs && matchPriority && matchStatus;
    });

    result = result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'priority') {
        cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      } else if (sortField === 'dueDate') {
        cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortField === 'status') {
        cmp = a.status.localeCompare(b.status);
      } else if (sortField === 'workspace') {
        cmp = a.workspace.localeCompare(b.workspace);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [tasks, search, filterWorkspace, filterPriority, filterStatus, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={10} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
  };

  const formatDate = (iso: string) => {
    try {
      return format(new Date(iso), 'dd MMM yyyy');
    } catch {
      return iso;
    }
  };

  const isOverdue = (task: Task) => {
    try {
      return new Date(task.dueDate) < new Date() && task.status !== 'Completed';
    } catch {
      return false;
    }
  };

  if (isLoading) {
    return (
      <section aria-labelledby="tasks-heading">
        <div className="section-header">
          <h2 id="tasks-heading" className="section-title">
            <CheckSquare size={18} style={{ color: 'var(--clr-accent)' }} />
            Today's Tasks
          </h2>
        </div>
        <div className="table-container">
          <div style={{ padding: '24px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '40px', marginBottom: '8px', borderRadius: '6px' }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="tasks-heading">
      <div className="section-header">
        <h2 id="tasks-heading" className="section-title">
          <CheckSquare size={18} style={{ color: 'var(--clr-accent)' }} />
          Today's Tasks
          {tasks && (
            <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--clr-text-muted)', marginLeft: '8px' }}>
              ({filteredTasks.length} of {tasks.length})
            </span>
          )}
        </h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          {tasks?.filter((t) => t.status === 'Overdue').length ? (
            <span className="status-badge critical">
              <AlertTriangle size={10} />
              {tasks.filter((t) => t.status === 'Overdue').length} Overdue
            </span>
          ) : null}
        </div>
      </div>

      <div className="table-container">
        {/* Toolbar */}
        <div className="table-toolbar">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={12} style={{ position: 'absolute', left: '10px', color: 'var(--clr-text-muted)', pointerEvents: 'none' }} />
            <input
              className="form-input"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="task-search"
              style={{ paddingLeft: '28px', width: '200px' }}
            />
          </div>
          <div className="table-filters">
            <Filter size={13} style={{ color: 'var(--clr-text-muted)', alignSelf: 'center' }} />
            <select
              className="form-select"
              value={filterWorkspace}
              onChange={(e) => setFilterWorkspace(e.target.value)}
              id="task-filter-workspace"
              aria-label="Filter by workspace"
            >
              <option value="ALL">All Workspaces</option>
              {workspaces.map((ws) => (
                <option key={ws} value={ws}>{ws}</option>
              ))}
            </select>
            <select
              className="form-select"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              id="task-filter-priority"
              aria-label="Filter by priority"
            >
              <option value="ALL">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select
              className="form-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              id="task-filter-status"
              aria-label="Filter by status"
            >
              <option value="ALL">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Overdue">Overdue</option>
              <option value="Blocked">Blocked</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="erp-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="erp-table">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Task Name</th>
                <th>Ref</th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('workspace')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Workspace <SortIcon field="workspace" />
                  </div>
                </th>
                <th>Responsible Dept</th>
                <th>Assigned To</th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('priority')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Priority <SortIcon field="priority" />
                  </div>
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('dueDate')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Due Date <SortIcon field="dueDate" />
                  </div>
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('status')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Status <SortIcon field="status" />
                  </div>
                </th>
                <th>Next Action</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <div className="empty-state">
                      <CheckSquare size={32} className="empty-state-icon" />
                      <p className="empty-state-title">No tasks match your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    style={{
                      background: task.status === 'Overdue' ? 'rgba(239, 68, 68, 0.04)' : undefined,
                    }}
                    onClick={() => navigate(`${task.workspaceRoute}?task=${task.id}&ref=${task.transactionRef}`)}
                    id={`task-row-${task.id}`}
                  >
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--clr-accent-light)' }}>
                        {task.id}
                      </span>
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--clr-text-primary)', fontWeight: 500 }}>
                        {isOverdue(task) && <AlertTriangle size={11} style={{ color: 'var(--clr-critical)', marginRight: '4px', display: 'inline' }} />}
                        {task.taskName}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{task.transactionRef}</span>
                    </td>
                    <td>{task.workspace}</td>
                    <td>
                      <span style={{ color: task.responsibleDepartment === 'Stores' ? 'var(--clr-accent-light)' : 'var(--clr-warning)' }}>
                        {task.responsibleDepartment}
                      </span>
                    </td>
                    <td>{task.assignedPerson}</td>
                    <td><PriorityBadge priority={task.priority} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} style={{ color: isOverdue(task) ? 'var(--clr-critical)' : 'var(--clr-text-muted)' }} />
                        <span style={{ color: isOverdue(task) ? 'var(--clr-critical)' : undefined }}>
                          {formatDate(task.dueDate)}
                        </span>
                      </div>
                    </td>
                    <td><TaskStatusBadge status={task.status} /></td>
                    <td style={{ maxWidth: '180px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11.5px' }}>
                        {task.nextAction}
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`${task.workspaceRoute}?task=${task.id}&ref=${task.transactionRef}`);
                        }}
                        aria-label={`Open task ${task.id}`}
                        id={`open-task-${task.id}`}
                      >
                        <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
