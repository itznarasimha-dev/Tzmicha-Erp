import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/Input';
import { Clock, Filter } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { auditLogs } = useErpStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || log.entityType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            System Audit Trail & Transaction Logs
            <Badge variant="purple" size="sm">Admin Traceability</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable log of all inventory inward/outward events, price overrides, approvals, and order modifications.
          </p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by action, actor, entity ID or notes..."
        />

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="glass-input rounded-xl px-3 py-1.5 text-xs text-slate-800 bg-white cursor-pointer"
          >
            <option value="all">All Entity Types</option>
            <option value="order">Sales Orders</option>
            <option value="receipt">Inward Receipts</option>
            <option value="batch">Batches & Inventory</option>
            <option value="pricing">Pricing & Cost Master</option>
            <option value="stock">Stock Movements</option>
            <option value="expense">Expenses & Claims</option>
            <option value="user">User & Staff Operations</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Audit Events ({filteredLogs.length})</CardTitle>
            <CardDescription>Chronological system activity ledger</CardDescription>
          </div>
          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5 text-indigo-600" /> Live Sync
          </span>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-3 px-1">Timestamp</th>
                <th className="pb-3 px-1">Action Type</th>
                <th className="pb-3 px-1">Entity & ID</th>
                <th className="pb-3 px-1">Actor / User</th>
                <th className="pb-3 px-1">Role</th>
                <th className="pb-3 px-1">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-1 text-slate-500 font-mono whitespace-nowrap text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-1 font-bold text-slate-900 font-mono text-[11px]">
                    {log.action}
                  </td>
                  <td className="py-3.5 px-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] font-semibold">
                      {log.entityId}
                    </span>
                    <span className="block text-[10px] text-slate-400 capitalize">{log.entityType}</span>
                  </td>
                  <td className="py-3.5 px-1 font-semibold text-slate-900">{log.userName}</td>
                  <td className="py-3.5 px-1">
                    <Badge
                      size="sm"
                      variant={
                        log.userRole === 'admin'
                          ? 'purple'
                          : log.userRole === 'manager'
                          ? 'primary'
                          : log.userRole === 'sales'
                          ? 'primary'
                          : log.userRole === 'marketing'
                          ? 'success'
                          : 'warning'
                      }
                      className="capitalize"
                    >
                      {log.userRole.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-1 text-slate-600 max-w-md">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
