import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useErpStore } from '../../store/useErpStore';
import { UserRole } from '../../types';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { currentUser, currentRole } = useErpStore();
  const location = useLocation();

  // If no user is logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin possesses executive oversight across all workspaces for audit & inspection
  const hasAccess = allowedRoles.includes(currentRole) || currentUser.role === 'admin';

  if (!hasAccess) {
    return <Navigate to="/access-denied" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
