import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useRole } from '../context/RoleContext';
import PageContainer from './common/PageContainer';

/**
 * RoleGuard Component
 * Guards routes and sections against unauthorized role access.
 * Displays a clean, professional "Access Restricted" screen when permission is denied.
 *
 * @param {Object} props
 * @param {string} [props.path] - The route path to verify for access
 * @param {string} [props.permission] - Specific action permission to verify
 * @param {React.ReactNode} props.children - Protected content
 */
export default function RoleGuard({ path, permission, children }) {
  const { currentRole, canAccessRoute, hasPermission } = useRole();

  let isAllowed = true;

  if (path && !canAccessRoute(path)) {
    isAllowed = false;
  }

  if (permission && !hasPermission(permission)) {
    isAllowed = false;
  }

  if (!isAllowed) {
    return (
      <PageContainer>
        <div className="access-restricted-card" role="alert">
          <div className="access-restricted-icon-box">
            <ShieldAlert size={28} strokeWidth={2} />
          </div>

          <div className="access-restricted-content">
            <h2 className="access-restricted-title">Access Restricted</h2>
            <p className="access-restricted-subtitle">
              You do not have permission to access this module under the{' '}
              <strong>{currentRole.label}</strong> role.
            </p>
            <p className="access-restricted-desc">
              Navigation and page authorization are enforced based on the four-role
              operational policy. Switch your demonstration role in the top header or return to an authorized workspace.
            </p>

            <div className="access-restricted-actions">
              <Link to="/service/dashboard" className="primary-action-btn" style={{ textDecoration: 'none' }}>
                <ArrowLeft size={16} strokeWidth={2} />
                <span>Return to Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return children;
}
