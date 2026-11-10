import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import { ShieldAlert, ArrowLeft, Shield, Lock, Briefcase, Warehouse, LogIn } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const AccessDeniedPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, currentRole, switchRole } = useErpStore();

  const handleReturnToPortal = () => {
    if (currentRole === 'sales') {
      navigate('/sales');
    } else if (currentRole === 'store_manager') {
      navigate('/store-manager/overview');
    } else {
      navigate('/admin/dashboard');
    }
  };

  const handleSwitchToAdmin = () => {
    if (currentUser.role === 'admin') {
      switchRole('admin');
      navigate('/admin/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-8 text-center space-y-5 border border-rose-200 shadow-xl relative overflow-hidden bg-white/95 rounded-3xl">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <Badge variant="danger" size="sm">
            Security Policy Barrier (RBAC)
          </Badge>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Access Restricted</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your current account credentials and role (<strong className="capitalize text-slate-800">{currentRole.replace('_', ' ')}</strong>) do not have authorization to view this module.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2 text-slate-700">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Lock className="w-4 h-4 text-indigo-600" />
            <span>Strict Role-Based Boundary Enforcement:</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Active Account: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.email})
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Only authorized personnel may access organization financials, landed product margins, system configurations, or administrative logs.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
          <Button variant="outline" size="sm" onClick={handleReturnToPortal} icon={currentRole === 'sales' ? <Briefcase className="w-4 h-4" /> : <Warehouse className="w-4 h-4" />}>
            Return to My Workspace
          </Button>
          {currentUser.role === 'admin' ? (
            <Button variant="primary" size="sm" onClick={handleSwitchToAdmin} icon={<Shield className="w-4 h-4" />}>
              Admin Console
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('/login')} icon={<LogIn className="w-4 h-4" />}>
              Sign In as Different Role
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
