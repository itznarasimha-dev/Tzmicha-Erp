import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from 'lucide-react';

export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  emptyMessage = 'No records found matching criteria',
  emptySubtext = 'Try adjusting your search query or filters',
  pageSize = 10,
  minWidth = null,
  onRowClick = null,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Auto-calculated minimum table width based on column count so columns never crush
  const tableMinWidth = minWidth || `${Math.max(880, columns.length * 130)}px`;

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortField) return data;
    return [...data].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, validCurrentPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const startRecord = sortedData.length === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(validCurrentPage * pageSize, sortedData.length);

  return (
    <div className="table-container-card">
      <div className="table-responsive">
        <table className="enterprise-table" style={{ minWidth: tableMinWidth }}>
          <thead>
            <tr>
              {columns.map((col, idx) => {
                const canSort = col.sortable !== false && col.key;
                return (
                  <th
                    key={col.key || col.header || idx}
                    style={{ width: col.width, minWidth: col.minWidth, textAlign: col.align || 'left' }}
                    className={canSort ? 'sortable-th' : ''}
                    onClick={canSort ? () => handleSort(col.key) : undefined}
                  >
                    <div className="th-content" style={{ justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                      <span>{col.header}</span>
                      {canSort && (
                        <ArrowUpDown
                          size={13}
                          className={`th-sort-icon ${sortField === col.key ? 'active' : ''}`}
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="table-empty-cell">
                  <div className="table-empty-content">
                    <p className="table-empty-title">{emptyMessage}</p>
                    <p className="table-empty-sub">{emptySubtext}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const isClickable = typeof onRowClick === 'function';
                return (
                  <tr
                    key={row[keyField] ?? index}
                    onClick={isClickable ? () => onRowClick(row) : undefined}
                    className={`${isClickable ? 'clickable-row' : ''}`}
                  >
                    {columns.map((col, colIdx) => (
                      <td
                        key={col.key || col.header || colIdx}
                        style={{ textAlign: col.align || 'left', width: col.width, minWidth: col.minWidth }}
                        className={col.wrap ? 'allow-wrap' : ''}
                      >
                        {col.render ? col.render(row) : row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {sortedData.length > 0 && (
        <div className="table-pagination-bar">
          <div className="pagination-info">
            Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of{' '}
            <strong>{sortedData.length}</strong> records
          </div>

          <div className="pagination-controls">
            <button
              type="button"
              className="pagination-btn"
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage === 1}
              title="First page"
              aria-label="First page"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              type="button"
              className="pagination-btn"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="pagination-page-indicator">
              Page {validCurrentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="pagination-btn"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage === totalPages}
              title="Next page"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="pagination-btn"
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage === totalPages}
              title="Last page"
              aria-label="Last page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
