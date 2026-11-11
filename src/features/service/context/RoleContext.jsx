import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import {
  ROLES,
  ROLE_DEFINITIONS,
  ROLE_LIST,
  DEFAULT_ROLE,
  ROLE_STORAGE_KEY
} from '../config/roles.js';
import { checkPermission } from '../config/permissions.js';

const RoleContext = createContext(null);

/**
 * RoleProvider Component
 * Manages active demonstration role and provides central permission helpers.
 */
export function RoleProvider({ children }) {
  const [roleId, setRoleIdState] = useState(() => {
    try {
      const saved = localStorage.getItem(ROLE_STORAGE_KEY);
      if (saved && ROLE_DEFINITIONS[saved]) {
        return saved;
      }
    } catch {
      // Fallback if localStorage is restricted
    }
    return DEFAULT_ROLE;
  });

  const setRole = useCallback((newRoleId) => {
    if (!ROLE_DEFINITIONS[newRoleId]) return;
    setRoleIdState(newRoleId);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, newRoleId);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const currentRole = useMemo(() => {
    return ROLE_DEFINITIONS[roleId] || ROLE_DEFINITIONS[DEFAULT_ROLE];
  }, [roleId]);

  /**
   * Check if active role has permission
   */
  const hasPermission = useCallback((permission) => {
    return checkPermission(roleId, permission);
  }, [roleId]);

  /**
   * Check if active role can access a submodule route
   */
  const canAccessRoute = useCallback((routePath) => {
    if (!routePath) return false;
    let cleanPath = routePath.split('?')[0].split('#')[0];
    if (cleanPath.startsWith('/service/')) {
      cleanPath = cleanPath.slice('/service'.length);
    } else if (cleanPath === '/service') {
      cleanPath = '/dashboard';
    }
    const normalized = cleanPath === '/' ? '/dashboard' : cleanPath;
    const roleDef = ROLE_DEFINITIONS[roleId] || ROLE_DEFINITIONS[DEFAULT_ROLE];
    if (roleDef.accessibleRoutes.includes(normalized)) return true;

    // Prefix matching for parent routes (e.g. /customers, /service-requests, /action-plan)
    return roleDef.accessibleRoutes.some((allowed) => {
      if (normalized === allowed) return true;
      if (allowed !== '/dashboard' && normalized.startsWith(allowed + '/')) return true;
      return false;
    });
  }, [roleId]);

  const value = useMemo(() => ({
    roleId,
    currentRole,
    setRole,
    hasPermission,
    canAccessRoute,
    roles: ROLE_LIST
  }), [roleId, currentRole, setRole, hasPermission, canAccessRoute]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

/**
 * Custom hook to consume the role context
 */
export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
