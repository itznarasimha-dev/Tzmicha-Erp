import React from 'react';

/**
 * PageContainer Component
 * Reusable wrapper providing consistent page layout, spacing, and max-width.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export default function PageContainer({ children, className = '' }) {
  return (
    <div className={`page-container ${className}`}>
      {children}
    </div>
  );
}
