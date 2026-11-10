import React from 'react';
import { useRole } from '../context/RoleContext';

/**
 * ProtectedAction Component
 * Conditionally renders or disables an action (button, form control, link) based on role permissions.
 *
 * @param {Object} props
 * @param {string|string[]} [props.permission] - Required permission key(s)
 * @param {string[]} [props.roles] - Explicitly allowed role IDs
 * @param {React.ReactNode} props.children - Target action element
 * @param {React.ReactNode} [props.fallback=null] - Component to render if unauthorized
 * @param {boolean} [props.disableInsteadOfHide=false] - Whether to disable rather than hide
 * @param {string} [props.disabledTooltip] - Tooltip explaining restriction when disabled
 */
export default function ProtectedAction({
  permission,
  roles,
  children,
  fallback = null,
  disableInsteadOfHide = false,
  disabledTooltip
}) {
  const { roleId, currentRole, hasPermission } = useRole();

  let isAuthorized = true;

  // Check role whitelist if provided
  if (roles && roles.length > 0) {
    if (!roles.includes(roleId)) {
      isAuthorized = false;
    }
  }

  // Check permission key(s)
  if (permission && isAuthorized) {
    if (Array.isArray(permission)) {
      isAuthorized = permission.every((perm) => hasPermission(perm));
    } else {
      isAuthorized = hasPermission(permission);
    }
  }

  if (isAuthorized) {
    return children;
  }

  // If disable instead of hide is requested, clone child element with disabled attributes
  if (disableInsteadOfHide && React.isValidElement(children)) {
    const tooltip =
      disabledTooltip || `Action restricted for ${currentRole.label} role`;

    return React.cloneElement(children, {
      disabled: true,
      'aria-disabled': 'true',
      title: tooltip,
      style: {
        ...(children.props.style || {}),
        opacity: 0.5,
        cursor: 'not-allowed',
        pointerEvents: 'none'
      }
    });
  }

  return fallback;
}
