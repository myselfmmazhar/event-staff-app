'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons';
import { usePaginationLabels } from '@/lib/hooks/use-labels';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (limit: number) => void;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: PaginationProps) {
  const paginationLabels = usePaginationLabels();
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
      {/* Items per page */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{paginationLabels.itemsPerPage}:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="rounded-lg border-2 border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary"
        >
          {ITEMS_PER_PAGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* Page info */}
      <div className="text-sm text-muted-foreground">
        {paginationLabels.showing} <span className="font-medium text-foreground">{startItem}</span> to{' '}
        <span className="font-medium text-foreground">{endItem}</span> {paginationLabels.of}{' '}
        <span className="font-medium text-foreground">{totalItems}</span> {paginationLabels.results}
      </div>

      {/* Page navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-9 w-9 p-0"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>

        {getPageNumbers().map((page, index) => (
          <div key={index}>
            {page === '...' ? (
              <span className="px-2 text-muted-foreground">...</span>
            ) : (
              <Button
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(page as number)}
                className="h-9 min-w-[36px] px-2"
              >
                {page}
              </Button>
            )}
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="h-9 w-9 p-0"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
