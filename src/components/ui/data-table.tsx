'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/error-state';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

// ── Types ───────────────────────────────────────────────────────────────────

export interface Column<T> {
  /** Unique key for this column (used as React key + sort field) */
  key: string;
  /** Header label */
  header: string;
  /** Render the cell value. Receives the row data. */
  render: (row: T) => React.ReactNode;
  /** Optional: the sort field name to send to the API. If omitted, the column is not sortable. */
  sortField?: string;
  /** Optional: custom cell className */
  className?: string;
  /** Optional: header className */
  headerClassName?: string;
  /** Optional: hide this column on small screens (default: false) */
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Unique row key extractor (required for React keys) */
  rowKey: (row: T) => string;
  /** Loading state — shows skeleton rows */
  loading?: boolean;
  /** Error message — shows ErrorState with retry */
  error?: string | null;
  /** Retry callback (shown when error is set) */
  onRetry?: () => void;
  /** Empty state message (shown when data is empty and not loading/error) */
  emptyMessage?: string;
  /** Empty state icon (defaults to Inbox) */
  emptyIcon?: React.ComponentType<{ className?: string }>;
  /** Optional: row click handler */
  onRowClick?: (row: T) => void;
  /** Optional: className for the wrapper */
  className?: string;
  /** Optional: skeleton row count (default: 5) */
  skeletonRows?: number;
  /** Optional: enable virtualization for large datasets (default: false).
   *  When true, only visible rows are rendered in the DOM. Requires maxHeight. */
  virtualized?: boolean;
  /** Optional: max height of the table body in px (enables vertical scroll).
   *  Required when virtualized=true. Default: 600 */
  maxHeight?: number;
  /** Optional: estimated row height in px for virtualization (default: 52) */
  estimateRowHeight?: number;
}

// ── Sort state ───────────────────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Generic, reusable DataTable.
 *
 * This is the single standard table for the CRM. It replaces the 60+ hand-rolled
 * `<Table>` implementations across the views. Features:
 *
 *   - Column config (key, header, render, sortField)
 *   - Loading state (skeleton rows)
 *   - Error state (ErrorState with Retry)
 *   - Empty state (icon + message)
 *   - Client-side sorting (click sortable headers)
 *   - Responsive (hideOnMobile per column)
 *   - Row click handler
 *
 * USAGE:
 *   <DataTable
 *     columns={jobColumns}
 *     data={jobs}
 *     rowKey={(j) => j.id}
 *     loading={isLoading}
 *     error={error}
 *     onRetry={refetch}
 *     emptyMessage="No jobs found"
 *   />
 *
 * NOTE: Sorting is client-side by default. For server-side sorting, pass
 * sortState + onSortChange from the parent and handle the API request there.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = 'No data found',
  emptyIcon: EmptyIcon = Inbox,
  onRowClick,
  className,
  skeletonRows = 5,
  virtualized = false,
  maxHeight = 600,
  estimateRowHeight = 52,
}: DataTableProps<T>) {
  const [sortState, setSortState] = React.useState<SortState | null>(null);

  // Apply client-side sorting if sortState is set
  const sortedData = React.useMemo(() => {
    if (!sortState) return data;
    const col = columns.find((c) => c.sortField === sortState.field);
    if (!col) return data;

    return [...data].sort((a, b) => {
      // Extract sortable values by rendering the cell and extracting text.
      // This is a pragmatic approach that works with any render function.
      const aNode = col.render(a);
      const bNode = col.render(b);
      const aVal = typeof aNode === 'string' ? aNode : extractText(aNode);
      const bVal = typeof bNode === 'string' ? bNode : extractText(bNode);

      if (aVal < bVal) return sortState.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortState.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortState, columns]);

  const handleSort = (col: Column<T>) => {
    if (!col.sortField) return;
    setSortState((prev) => {
      if (!prev || prev.field !== col.sortField) {
        return { field: col.sortField, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { field: col.sortField, direction: 'desc' };
      }
      // desc → clear sort
      return null;
    });
  };

  // ── Hooks MUST be called BEFORE any early returns (Rules of Hooks) ──────
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: sortedData.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 10,
    enabled: virtualized,
  });

  const renderRow = (row: T, virtualStyle?: React.CSSProperties) => (
    <TableRow
      key={rowKey(row)}
      className={cn(onRowClick && 'cursor-pointer')}
      onClick={() => onRowClick?.(row)}
      style={virtualStyle}
    >
      {columns.map((col) => (
        <TableCell
          key={col.key}
          className={cn(col.hideOnMobile && 'hidden sm:table-cell', col.className)}
        >
          {col.render(row)}
        </TableCell>
      ))}
    </TableRow>
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={cn('rounded-md border', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(col.hideOnMobile && 'hidden sm:table-cell', col.headerClassName)}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn(col.hideOnMobile && 'hidden sm:table-cell', col.className)}
                  >
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return <ErrorState message={error} onRetry={onRetry} className={className} />;
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (data.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12 sm:py-16 text-center',
          className
        )}
      >
        <div className="flex items-center justify-center size-14 rounded-full bg-muted mb-4">
          <EmptyIcon className="size-7 text-muted-foreground/50" />
        </div>
        <p className="text-base font-medium text-foreground">{emptyMessage}</p>
      </div>
    );
  }

  // ── Data table ─────────────────────────────────────────────────────────────
  return (
    <div className={cn('rounded-md border', className)}>
      {virtualized ? (
        <div ref={scrollRef} style={{ maxHeight, overflowY: 'auto' }}>
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      col.hideOnMobile && 'hidden sm:table-cell',
                      col.sortField && 'cursor-pointer select-none hover:bg-muted/50',
                      col.headerClassName
                    )}
                    onClick={() => handleSort(col)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortField && <SortIcon field={col.sortField} sortState={sortState} />}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length > 0 && (
                <>
                  {/* Top spacer — maintains scroll height for virtualized rows */}
                  {virtualizer.getVirtualItems().length > 0 && (
                    <tr style={{ height: virtualizer.getVirtualItems()[0].start }} />
                  )}
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const row = sortedData[virtualRow.index];
                    return (
                      <React.Fragment key={rowKey(row)}>
                        {renderRow(row)}
                      </React.Fragment>
                    );
                  })}
                  {/* Bottom spacer */}
                  {virtualizer.getVirtualItems().length > 0 && (
                    <tr style={{
                      height: virtualizer.getTotalSize() -
                        virtualizer.getVirtualItems()[virtualizer.getVirtualItems().length - 1].end
                    }} />
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    col.hideOnMobile && 'hidden sm:table-cell',
                    col.sortField && 'cursor-pointer select-none hover:bg-muted/50',
                    col.headerClassName
                  )}
                  onClick={() => handleSort(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortField && <SortIcon field={col.sortField} sortState={sortState} />}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row) => renderRow(row))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({
  field,
  sortState,
}: {
  field: string;
  sortState: SortState | null;
}) {
  if (!sortState || sortState.field !== field) {
    return <ChevronsUpDown className="size-3 opacity-40" />;
  }
  return sortState.direction === 'asc' ? (
    <ChevronUp className="size-3 text-emerald-600" />
  ) : (
    <ChevronDown className="size-3 text-emerald-600" />
  );
}

// ── Helper: extract text from a React node ───────────────────────────────────

function extractText(node: React.ReactNode): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return extractText(props.children);
  }
  return '';
}

export default DataTable;
