'use client';

import { Controller } from 'react-hook-form';
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useCategoriesFilters } from '@/store/categories-filters.store';

export function CategoryFilters() {
  const filters = useCategoriesFilters();

  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-2">Filters</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="status-filter">Status</Label>
          <Select
            value={
              filters.statuses.length === 0
                ? 'all'
                : filters.statuses.length === 2
                ? 'all'
                : filters.statuses[0]
            }
            onValueChange={(value) => {
              if (value === 'all') {
                filters.setStatuses([]);
              } else if (value === 'active') {
                filters.setStatuses(['active']);
              } else {
                filters.setStatuses(['inactive']);
              }
            }}
          >
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="created-from">Created Date (From)</Label>
          <Input
            id="created-from"
            type="date"
            value={filters.createdFrom}
            onChange={(e) => filters.setCreatedFrom(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="created-to">Created Date (To)</Label>
          <Input
            id="created-to"
            type="date"
            value={filters.createdTo}
            onChange={(e) => filters.setCreatedTo(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
