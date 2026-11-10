import React from 'react';

/**
 * SectionHeader Component
 * Sub-heading component for cards and operational modules within pages.
 *
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {string} [props.subtitle] - Supporting description or subtitle
 * @param {React.ReactNode} [props.badge] - Optional badge or status tag
 * @param {React.ReactNode} [props.actions] - Action buttons for this section
 */
export default function SectionHeader({
  title,
  subtitle,
  badge,
  actions
}) {
  return (
    <div className="section-header-wrapper">
      <div className="section-header-text">
        <div className="section-title-row">
          <h2 className="section-title">{title}</h2>
          {badge && <div className="section-badge">{badge}</div>}
        </div>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="section-actions">{actions}</div>}
    </div>
  );
}
