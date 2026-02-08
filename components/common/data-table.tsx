'use client';

import { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { SortableHeader } from './sortable-header';
import { handleSort } from '@/lib/utils/table-utils';
import { useTableLabels } from '@/lib/hooks/use-labels';

export interface ColumnDef<T> {
  key: string;
  /** Column header label - can be a string or React element (e.g., EditableLabel) */
  label: ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  render: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
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
}

export function DataTable<T>({
  data,
  columns,
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
}: DataTableProps<T>) {
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
          <table className="w-full" style={{ minWidth }}>
            <thead>
              <tr className="border-b border-border">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={col.headerClassName || 'text-left py-3 px-4'}
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
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr
                  key={getRowKey(item)}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={col.className || 'py-4 px-4'}
                    >
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
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
