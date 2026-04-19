'use client';

import { ReactNode, Fragment, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { SortableHeader } from './sortable-header';
import { cn } from '@/lib/utils';
import { handleSort } from '@/lib/utils/table-utils';
import { useTableLabels } from '@/lib/hooks/use-labels';
import { ChevronDownIcon, ChevronRightIcon } from '@/components/ui/icons';
import { useTableResize } from '@/hooks/use-table-resize';
import { TableColumnResizeHandle } from './table-column-resize-handle';

export interface ColumnDef<T> {
  key: string;
  /** Column header label - can be a string or React element (e.g., EditableLabel) */
  label: ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  render: (item: T) => ReactNode;
}

const TAILWIND_WIDTH_REM_MAP: Record<string, number> = {
  'w-10': 2.5,
  'w-12': 3,
  'w-16': 4,
  'w-20': 5,
  'w-24': 6,
  'w-28': 7,
  'w-32': 8,
  'w-36': 9,
  'w-40': 10,
  'w-44': 11,
  'w-48': 12,
  'w-52': 13,
  'w-56': 14,
  'w-60': 15,
  'w-64': 16,
};

function parseFixedWidthPx(className?: string) {
  if (!className) return null;

  for (const [token, rem] of Object.entries(TAILWIND_WIDTH_REM_MAP)) {
    if (className.includes(token)) {
      return rem * 16;
    }
  }

  return null;
}

function parseMinWidthPx(minWidth: string) {
  const match = minWidth.match(/^(\d+(?:\.\d+)?)px$/);
  if (!match) return null;
  return Number(match[1]);
}

function getLockedColumnWidth(columnKey: string) {
  // Keep utility columns compact and consistent across all manager tables.
  if (columnKey === 'select') return 40;
  // Wide enough for the "Actions" header label without ellipsis (table header uses truncate by default).
  if (columnKey === 'actions') return 100;
  return null;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  tableId: string;
  isLoading?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  setSortBy?: (field: string) => void;
  setSortOrder?: (order: 'asc' | 'desc') => void;
  emptyMessage?: string;
  emptyDescription?: string;
  mobileCard?: (item: T) => ReactNode;
  getRowKey: (item: T) => string;
  minWidth?: string;
  skeletonRows?: number;
  // Expandable row support
  expandableContent?: (item: T) => ReactNode;
  expandedKeys?: Set<string>;
  onToggleExpand?: (key: string) => void;
}

export function DataTable<T>({
  data,
  columns,
  tableId,
  isLoading = false,
  sortBy,
  sortOrder = 'desc',
  onSort,
  setSortBy,
  setSortOrder,
  emptyMessage,
  emptyDescription = 'Try adjusting your search or filters',
  mobileCard,
  getRowKey,
  minWidth = '800px',
  skeletonRows = 5,
  expandableContent,
  expandedKeys,
  onToggleExpand,
}: DataTableProps<T>) {
  const derivedResizeConfig = useMemo(() => {
    const lockedColumns: string[] = [];
    const initialWidths: Record<string, number> = {};
    const tableMinWidth = parseMinWidthPx(minWidth) ?? 0;
    const estimatedFlexibleWidth =
      columns.length > 0 ? Math.max(140, Math.floor(tableMinWidth / Math.max(columns.length, 1))) : 160;

    for (const col of columns) {
      const lockedWidth = getLockedColumnWidth(col.key);
      const fixedWidth =
        parseFixedWidthPx(col.headerClassName) ??
        parseFixedWidthPx(col.className);

      if (lockedWidth) {
        initialWidths[col.key] = lockedWidth;
      } else if (fixedWidth) {
        initialWidths[col.key] = fixedWidth;
      } else {
        initialWidths[col.key] = estimatedFlexibleWidth;
      }

      if (col.key === 'select' || col.key === 'actions') {
        lockedColumns.push(col.key);
      }
    }

    return { initialWidths, lockedColumns };
  }, [columns, minWidth]);

  const { columnWidths, onMouseDown, getTableStyle } = useTableResize(
    tableId,
    derivedResizeConfig.initialWidths,
    { lockedColumns: derivedResizeConfig.lockedColumns }
  );
  const tableLabels = useTableLabels();
  // Use provided emptyMessage or fallback to global label
  const noDataMessage = emptyMessage ?? tableLabels.noData;
  const handleSortClick = (field: string) => {
    if (onSort) {
      onSort(field);
    } else if (setSortBy && setSortOrder && sortBy) {
      handleSort(field, sortBy, sortOrder, setSortBy, setSortOrder);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(skeletonRows)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground text-lg">{noDataMessage}</p>
        <p className="text-muted-foreground text-sm mt-2">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className={mobileCard ? 'hidden lg:block overflow-x-auto' : 'overflow-x-auto'}>
        <div className="min-w-full inline-block">
          <table 
            className="w-full table-fixed" 
            style={{ ...getTableStyle(), minWidth }}
          >
            <thead>
              <tr className="border-b border-border">
                {expandableContent && (
                  <th className="w-10 py-3 px-2" />
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'relative group transition-colors',
                      col.key === 'actions' ? 'whitespace-nowrap' : col.key === 'select' ? '' : 'truncate',
                      col.headerClassName || 'text-left py-3 px-4'
                    )}
                    style={{ width: `var(--col-${col.key})` }}
                  >
                    {col.sortable && sortBy ? (
                      <SortableHeader
                        label={col.label}
                        sortKey={col.key}
                        currentSortBy={sortBy}
                        currentSortOrder={sortOrder}
                        onSort={handleSortClick}
                      />
                    ) : (
                      <span className="font-semibold text-sm text-foreground">
                        {col.label}
                      </span>
                    )}
                    {!derivedResizeConfig.lockedColumns.includes(col.key) && (
                      <TableColumnResizeHandle onMouseDown={(e) => onMouseDown(col.key, e)} />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item) => {
                const rowKey = getRowKey(item);
                const isExpanded = expandedKeys?.has(rowKey) ?? false;

                return (
                  <Fragment key={rowKey}>
                    <tr
                      className={`border-b border-border hover:bg-muted/50 transition-colors ${
                        isExpanded ? 'bg-muted/30' : ''
                      }`}
                    >
                      {expandableContent && (
                        <td className="w-10 py-4 px-2">
                          <button
                            type="button"
                            className="p-1 hover:bg-muted rounded transition-colors"
                            onClick={() => onToggleExpand?.(rowKey)}
                          >
                            {isExpanded ? (
                              <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn(col.key !== 'select' && 'truncate', col.className || 'py-4 px-4')}
                          style={{ width: `var(--col-${col.key})` }}
                        >
                          {col.render(item)}
                        </td>
                      ))}
                    </tr>
                    {expandableContent && isExpanded && (
                      <tr className="bg-muted/20">
                        <td colSpan={columns.length + 1} className="p-0">
                          {expandableContent(item)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      {mobileCard && (
        <div className="lg:hidden space-y-4">
          {data.map((item) => (
            <div key={getRowKey(item)}>{mobileCard(item)}</div>
          ))}
        </div>
      )}
    </>
  );
}
