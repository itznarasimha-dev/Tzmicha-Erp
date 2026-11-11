// ============================================================
// QUICK ACTIONS COMPONENT
// ============================================================

import { useNavigate } from 'react-router-dom';
import {
  Truck, Eye, Layers, PackageCheck, ArrowLeftRight,
  SendHorizontal, ClipboardCheck, AlertOctagon, Zap,
} from 'lucide-react';
import type { CurrentUser } from '../types';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  route: string;
  routeParam?: string;
  permission: string;
  iconBg: string;
  iconColor: string;
}

const ACTIONS: QuickAction[] = [
  {
    id: 'receive-goods',
    label: 'Receive Goods',
    icon: <Truck size={18} />,
    route: '/store-manager/receiving',
    routeParam: 'action=new-grn',
    permission: 'receive_goods',
    iconBg: 'rgba(59,130,246,0.15)',
    iconColor: '#60a5fa',
  },
  {
    id: 'view-inventory',
    label: 'View Inventory',
    icon: <Eye size={18} />,
    route: '/store-manager/inventory',
    permission: 'view_inventory',
    iconBg: 'rgba(139,92,246,0.15)',
    iconColor: '#a78bfa',
  },
  {
    id: 'issue-materials',
    label: 'Issue Materials',
    icon: <Layers size={18} />,
    route: '/store-manager/production-materials',
    routeParam: 'action=issue',
    permission: 'issue_materials',
    iconBg: 'rgba(16,185,129,0.15)',
    iconColor: '#34d399',
  },
  {
    id: 'receive-fg',
    label: 'Receive Finished Goods',
    icon: <PackageCheck size={18} />,
    route: '/store-manager/finished-goods',
    routeParam: 'action=receive',
    permission: 'receive_finished_goods',
    iconBg: 'rgba(6,182,212,0.15)',
    iconColor: '#22d3ee',
  },
  {
    id: 'transfer-stock',
    label: 'Transfer Stock',
    icon: <ArrowLeftRight size={18} />,
    route: '/store-manager/transfers',
    routeParam: 'action=new-transfer',
    permission: 'transfer_stock',
    iconBg: 'rgba(249,115,22,0.15)',
    iconColor: '#fb923c',
  },
  {
    id: 'pick-dispatch',
    label: 'Pick & Dispatch',
    icon: <SendHorizontal size={18} />,
    route: '/store-manager/sales-fulfilment',
    routeParam: 'action=pick',
    permission: 'pick_dispatch',
    iconBg: 'rgba(244,63,94,0.15)',
    iconColor: '#fb7185',
  },
  {
    id: 'stock-count',
    label: 'Start Stock Count',
    icon: <ClipboardCheck size={18} />,
    route: '/store-manager/transfers',
    routeParam: 'action=stock-count',
    permission: 'start_stock_count',
    iconBg: 'rgba(245,158,11,0.15)',
    iconColor: '#fbbf24',
  },
  {
    id: 'report-exception',
    label: 'Report Exception',
    icon: <AlertOctagon size={18} />,
    route: '/store-manager/inventory',
    routeParam: 'action=report-exception',
    permission: 'report_stock_exception',
    iconBg: 'rgba(99,102,241,0.15)',
    iconColor: '#818cf8',
  },
];

interface QuickActionsProps {
  currentUser: CurrentUser | null;
}

export function QuickActions({ currentUser }: QuickActionsProps) {
  const navigate = useNavigate();

  const hasPermission = (permission: string) => {
    if (!currentUser) return false;
    return currentUser.permissions.includes(permission);
  };

  const handleAction = (action: QuickAction) => {
    if (!hasPermission(action.permission)) return;
    const dest = action.routeParam ? `${action.route}?${action.routeParam}` : action.route;
    navigate(dest);
  };

  return (
    <section aria-labelledby="quick-actions-heading">
      <div className="section-header">
        <h2 id="quick-actions-heading" className="section-title">
          <Zap size={18} style={{ color: 'var(--clr-accent)' }} />
          Quick Actions
        </h2>
      </div>
      <div className="quick-actions-grid">
        {ACTIONS.map((action) => {
          const enabled = hasPermission(action.permission);
          return (
            <button
              key={action.id}
              id={`quick-action-${action.id}`}
              className="quick-action-btn"
              onClick={() => handleAction(action)}
              disabled={!enabled}
              aria-label={enabled ? action.label : `${action.label} (not authorized)`}
              title={!enabled ? 'You do not have permission for this action' : undefined}
              style={{
                opacity: enabled ? 1 : 0.4,
                cursor: enabled ? 'pointer' : 'not-allowed',
              }}
            >
              <div
                className="quick-action-icon"
                style={{ background: action.iconBg, color: action.iconColor }}
              >
                {action.icon}
              </div>
              <span className="quick-action-label">{action.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
