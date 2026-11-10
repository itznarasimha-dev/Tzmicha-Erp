import React from 'react';
import { Search, X, RotateCcw } from 'lucide-react';

export default function SearchFilterBar({
  searchPlaceholder = 'Search records by name, ID, or reference...',
  searchValue = '',
  onSearchChange = () => {},
  filters = [],
  filterValues = {},
  onFilterChange = () => {},
  onReset = null,
  actions = null,
}) {
  const hasActiveFilters =
    Boolean(searchValue) ||
    Object.values(filterValues).some((v) => v !== '' && v !== 'all');

  return (
    <div className="search-filter-card">
      <div className="search-filter-main">
        {/* Search Input */}
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchValue && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onSearchChange('')}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dynamic Filters */}
        <div className="filters-group">
          {filters.map((filter) => (
            <div key={filter.key} className="filter-select-wrapper">
              <label htmlFor={`filter-${filter.key}`} className="sr-only">
                {filter.label}
              </label>
              <select
                id={`filter-${filter.key}`}
                className="filter-select"
                value={filterValues[filter.key] ?? 'all'}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
              >
                <option value="all">All {filter.label}s</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Reset Filters */}
          {hasActiveFilters && onReset && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-icon-text"
              onClick={onReset}
              title="Reset all filters"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Action Buttons */}
      {actions && <div className="search-filter-actions">{actions}</div>}
    </div>
  );
}
