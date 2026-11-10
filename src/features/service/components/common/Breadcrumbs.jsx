import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Breadcrumbs Component
 * Renders a consistent breadcrumb trail for submodules.
 *
 * @param {Object} props
 * @param {Array<{label: string, path?: string}>|string[]} props.items - Breadcrumb items
 */
export default function Breadcrumbs({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="page-breadcrumbs" aria-label="Breadcrumb navigation">
      <ol className="breadcrumb-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const label = typeof item === 'string' ? item : item.label;
          const path = typeof item === 'string' ? undefined : item.path;

          return (
            <li key={index} className="breadcrumb-item">
              {index > 0 && (
                <ChevronRight size={14} className="breadcrumb-separator" aria-hidden="true" />
              )}
              {isLast ? (
                <span className="breadcrumb-current" aria-current="page">
                  {label}
                </span>
              ) : path ? (
                <Link to={path} className="breadcrumb-link">
                  {label}
                </Link>
              ) : (
                <span className="breadcrumb-text">{label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
