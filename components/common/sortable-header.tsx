'use client';

import { ReactNode } from 'react';
import { ChevronUpIcon, ChevronDownIcon, ChevronsUpDownIcon } from '@/components/ui/icons';

interface SortableHeaderProps {
  label: ReactNode;
  sortKey: string;
  currentSortBy: string;
  currentSortOrder: 'asc' | 'desc';
  onSort: (sortKey: string) => void;
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  currentSortBy,
  currentSortOrder,
  onSort,
  className = '',
}: SortableHeaderProps) {
  const isActive = currentSortBy === sortKey;

  const getSortIcon = () => {
    if (!isActive) {
      return <ChevronsUpDownIcon className="ml-2 h-4 w-4 opacity-50" />;
    }
    return currentSortOrder === 'asc' ? (
      <ChevronUpIcon className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDownIcon className="ml-2 h-4 w-4" />
    );
  };

  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center font-medium hover:text-foreground transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'
        } ${className}`}
    >
      {label}
      {getSortIcon()}
    </button>
  );
}
