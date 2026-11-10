import React from 'react';
import Breadcrumbs from './Breadcrumbs';

/**
 * PageHeader Component
 * Provides a standardized header section for every submodule page.
 *
 * @param {Object} props
 * @param {string} props.title - Primary page heading
 * @param {string} props.description - Short, meaningful page description
 * @param {Array} [props.breadcrumbs] - Array of breadcrumb items
 * @param {React.ReactNode} [props.actions] - Optional right-aligned action buttons
 */
export default function PageHeader({
  title,
  description,
  breadcrumbs = null,
  actions
}) {
  return (
    <div className="page-header-row mb-4">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs items={breadcrumbs} />
        )}
        <h2 className="page-title">{title}</h2>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}
