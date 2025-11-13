'use client';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

interface ClientFiltersProps {
  onLoginAccessChange: (value: 'all' | 'with' | 'without') => void;
  onSortByChange: (column: string) => void;
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  loginAccess?: 'all' | 'with' | 'without';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function ClientFilters({
  onLoginAccessChange,
  onSortByChange,
  onSortOrderChange,
  loginAccess = 'all',
  sortBy = 'createdAt',
  sortOrder = 'desc',
}: ClientFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      {/* Login Access Filter */}
      <Select
        value={loginAccess}
        onChange={(e) => onLoginAccessChange(e.target.value as 'all' | 'with' | 'without')}
        className="w-full sm:w-48"
      >
        <option value="all">All Clients</option>
        <option value="with">With Portal Access</option>
        <option value="without">Without Portal Access</option>
      </Select>

      {/* Sort By */}
      <Select
        value={sortBy}
        onChange={(e) => onSortByChange(e.target.value)}
        className="w-full sm:w-48"
      >
        <option value="createdAt">Date Created</option>
        <option value="businessName">Business Name</option>
        <option value="lastName">Last Name</option>
        <option value="email">Email</option>
      </Select>

      {/* Sort Order */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
        className="w-full sm:w-auto"
      >
        {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
      </Button>
    </div>
  );
}
