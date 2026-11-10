import React from 'react';
import { Search } from 'lucide-react';

/**
 * SearchBar Component
 * Global search input placed in the header center section.
 *
 * @param {Object} props
 * @param {string} [props.placeholder="Search service requests, customers, engineers, products..."]
 * @param {Function} [props.onSearch]
 */
export default function SearchBar({
  placeholder = 'Search service requests, customers, engineers, products...',
  onSearch
}) {
  return (
    <div className="header-search-bar" role="search">
      <div className="search-input-wrapper">
        <span className="search-icon-prefix">
          <Search size={17} strokeWidth={2} />
        </span>
        <input
          type="text"
          className="search-input"
          placeholder={placeholder}
          aria-label="Global search"
          onChange={(e) => onSearch && onSearch(e.target.value)}
        />
        <span className="search-shortcut-badge" title="Press / to search">
          /
        </span>
      </div>
    </div>
  );
}
