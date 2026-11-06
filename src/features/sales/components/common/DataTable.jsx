import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from 'lucide-react';

export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  emptyMessage = 'No records found matching criteria',
  emptySubtext = 'Try adjusting your search query or filter filters',
  pageSize = 10,
  onRowClick = null,
  minWidth = null,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);

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

  const startRecord = (validCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(validCurrentPage * pageSize, sortedData.length);

  return (
    <div className="table-container-card">
      <div className="table-responsive">
        <table className="enterprise-table" style={minWidth ? { minWidth } : undefined}>
          <thead>
            <tr>
              {columns.map((col) => {
                const canSort = col.sortable !== false && col.key;
                const align = col.align || 'left';
                const thJustify =
                  align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';
                return (
                  <th
                    key={col.key || col.header}
                    style={{
                      width: col.width,
                      minWidth: col.minWidth || col.width,
                      maxWidth: col.maxWidth,
                      textAlign: align,
                      ...col.headerStyle,
                    }}
                    className={canSort ? 'sortable-th' : ''}
                    onClick={canSort ? () => handleSort(col.key) : undefined}
                  >
                    <div className="th-content" style={{ justifyContent: thJustify }}>
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
                    {columns.map((col) => (
                      <td
                        key={col.key || col.header}
                        style={{
                          width: col.width,
                          minWidth: col.minWidth || col.width,
                          maxWidth: col.maxWidth,
                          textAlign: col.align || 'left',
                          ...col.style,
                        }}
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
