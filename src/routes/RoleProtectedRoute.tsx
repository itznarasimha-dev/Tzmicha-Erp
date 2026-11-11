import React from 'react';
import { Navigate } from 'react-router-dom';
import { useErpStore } from '../store/useErpStore';
import { UserRole } from '../types';

interface RoleProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { currentRole } = useErpStore();

  if (!allowedRoles.includes(currentRole)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
};
