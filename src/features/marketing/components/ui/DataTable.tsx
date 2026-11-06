import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search } from 'lucide-react'
import { EmptyState } from './EmptyState'

export interface DataTableColumn<T> {
  id: string
  header: string
  render: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
  align?: 'left' | 'right' | 'center'
  mobileLabel?: string
  hideMobile?: boolean
  width?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  rowKey: (row: T) => string
  searchable?: (row: T) => string
  searchPlaceholder?: string
  filters?: ReactNode
  toolbarActions?: ReactNode
  pageSize?: number
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  initialSort?: { columnId: string; direction: 'asc' | 'desc' }
  onRowClick?: (row: T) => void
  mobileActions?: (row: T) => ReactNode
  caption?: string
  compact?: boolean
  footerNote?: ReactNode
  loading?: boolean
  className?: string
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  searchable,
  searchPlaceholder = 'Search records…',
  filters,
  toolbarActions,
  pageSize = 8,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search or filters. Demo records you add will appear here.',
  emptyAction,
  initialSort,
  onRowClick,
  mobileActions,
  caption,
  compact = false,
  footerNote,
  loading = false,
  className = '',
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<{ columnId: string; direction: 'asc' | 'desc' } | null>(
    initialSort ?? null,
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = q && searchable
      ? data.filter((row) => searchable(row).toLowerCase().includes(q))
      : data
    if (!sort) return rows
    const column = columns.find((col) => col.id === sort.columnId)
    if (!column?.sortValue) return rows
    const sorted = [...rows].sort((a, b) => {
      const av = column.sortValue!(a)
      const bv = column.sortValue!(b)
      if (typeof av === 'number' && typeof bv === 'number') return av - bv
      return String(av).localeCompare(String(bv), 'en', { numeric: true })
    })
    return sort.direction === 'asc' ? sorted : sorted.reverse()
  }, [data, query, sort, columns, searchable])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount - 1)
  const start = currentPage * pageSize
  const pageRows = filtered.slice(start, start + pageSize)

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1))
  }, [page, pageCount])

  const toggleSort = (column: DataTableColumn<T>) => {
    if (!column.sortValue) return
    setSort((current) => {
      if (current?.columnId !== column.id) return { columnId: column.id, direction: 'asc' }
      if (current.direction === 'asc') return { columnId: column.id, direction: 'desc' }
      return null
    })
    setPage(0)
  }

  const showToolbar = Boolean(searchable || filters || toolbarActions)

  return (
    <div className={`card card--flush ${className}`.trim()}>
      {showToolbar ? (
        <div className="toolbar">
          {searchable ? (
            <div className="input-icon">
              <Search size={15} aria-hidden="true" />
              <input
                className="input"
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(0)
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
              />
            </div>
          ) : null}
          {filters}
          {toolbarActions}
          <span className="toolbar__count" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
          </span>
        </div>
      ) : null}

      {loading ? (
        <div className="stack-12" style={{ padding: 20 }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="skeleton skeleton--line" style={{ width: `${92 - index * 7}%` }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <>
          <div className="table-wrap table-wrap--desktop">
            <table className={`table ${compact ? 'table--compact' : ''}`.trim()}>
              {caption ? <caption className="sr-only">{caption}</caption> : null}
              <thead>
                <tr>
                  {columns.map((column) => {
                    const sorted = sort?.columnId === column.id
                    return (
                      <th
                        key={column.id}
                        scope="col"
                        style={{
                          width: column.width,
                          textAlign: column.align ?? 'left',
                        }}
                        aria-sort={
                          sorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                        }
                      >
                        {column.sortValue ? (
                          <button
                            type="button"
                            className="sort-btn"
                            onClick={() => toggleSort(column)}
                            style={{ justifyContent: column.align === 'right' ? 'flex-end' : undefined }}
                          >
                            {column.header}
                            <span className="sort-indicator" aria-hidden="true">
                              {sorted ? (
                                sort.direction === 'asc' ? (
                                  <ArrowUp size={12} />
                                ) : (
                                  <ArrowDown size={12} />
                                )
                              ) : (
                                <ChevronsUpDown size={12} />
                              )}
                            </span>
                          </button>
                        ) : column.header ? (
                          column.header
                        ) : (
                          <span className="sr-only">{column.id === 'actions' ? 'Actions' : 'Column'}</span>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    style={onRowClick ? { cursor: 'pointer' } : undefined}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={column.id === 'actions' ? 'cell-actions' : undefined}
                        style={{ textAlign: column.align ?? 'left' }}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="record-list" aria-label={caption}>
            {pageRows.map((row) => (
              <div
                key={rowKey(row)}
                className="record-card"
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                <div className="record-card__top">
                  {columns[0] ? <div className="record-card__field">{columns[0].render(row)}</div> : null}
                  {columns[1] && !columns[1].hideMobile ? (
                    <div className="record-card__field" style={{ textAlign: 'right' }}>
                      {columns[1].render(row)}
                    </div>
                  ) : null}
                </div>
                <dl className="record-card__grid">
                  {columns.slice(2).filter((column) => !column.hideMobile).map((column) => (
                    <div className="record-card__field" key={column.id}>
                      <dt>{column.mobileLabel ?? column.header}</dt>
                      <dd>{column.render(row)}</dd>
                    </div>
                  ))}
                </dl>
                {mobileActions ? <div className="record-card__actions">{mobileActions(row)}</div> : null}
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && filtered.length > 0 ? (
        <div className="table-toolbar-note">
          <span>
            {footerNote ?? (
              <>
                Showing <strong>{start + 1}</strong>–<strong>{Math.min(start + pageSize, filtered.length)}</strong>{' '}
                of <strong>{filtered.length}</strong>
              </>
            )}
          </span>
          <Pagination page={currentPage} pageCount={pageCount} onChange={setPage} />
        </div>
      ) : null}
    </div>
  )
}

export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
}) {
  if (pageCount <= 1) return null
  const pages: Array<number | 'ellipsis'> = []
  const add = (value: number | 'ellipsis') => pages.push(value)
  if (pageCount <= 7) {
    for (let i = 0; i < pageCount; i += 1) add(i)
  } else {
    add(0)
    if (page > 2) add('ellipsis')
    for (let i = Math.max(1, page - 1); i <= Math.min(pageCount - 2, page + 1); i += 1) add(i)
    if (page < pageCount - 3) add('ellipsis')
    add(pageCount - 1)
  }
  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page === 0} aria-label="Previous page">
        <ChevronLeft size={14} />
      </button>
      {pages.map((value, index) =>
        value === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="faint" style={{ padding: '0 3px' }}>
            …
          </span>
        ) : (
          <button
            key={value}
            type="button"
            className={value === page ? 'is-active' : ''}
            onClick={() => onChange(value)}
            aria-current={value === page ? 'page' : undefined}
            aria-label={`Page ${value + 1}`}
          >
            {value + 1}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount - 1}
        aria-label="Next page"
      >
        <ChevronRight size={14} />
      </button>
    </nav>
  )
}
